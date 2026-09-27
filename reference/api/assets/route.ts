import { NextResponse } from "next/server";
import { cmsAuthorized } from "@/lib/server/cmsAuth";
import { inspectAsset, sanitizeSvg } from "@/lib/api/assets/validation";
import { uploadAsset } from "@/lib/server/assetStorage";

/**
 * Asset upload (images + SVG icons) for the inline editor.
 * Pre-P4 implementation: writes to public/uploads on local disk.
 * P4 replaces the write with the StorageAdapter (Supabase Storage or
 * self-hosted disk driver) without changing this contract.
 *
 * Security model:
 *  - the file's MAGIC BYTES decide the type — the client-declared MIME
 *    is never trusted (a renamed .html can't sneak through as .png)
 *  - /uploads/* is served with `Content-Security-Policy: sandbox` and
 *    `X-Content-Type-Options: nosniff` (see next.config.ts), so even a
 *    hostile SVG cannot execute script when opened directly; on pages
 *    they're only ever rendered via <img>, which never runs scripts
 *  - script/handler stripping on SVG is kept as defense-in-depth only
 */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  if (!cmsAuthorized(request)) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ data: null, error: "file field required" }, { status: 422 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ data: null, error: "File too large (max 50 MB)" }, { status: 422 });
  }

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  const inspected = inspectAsset(bytes);
  if (!inspected) {
    return NextResponse.json(
      { data: null, error: "Unsupported file content (allowed: jpeg, png, webp, gif, svg, mp4, webm)" },
      { status: 422 }
    );
  }
  if (inspected.kind !== "video" && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { data: null, error: "Image too large (max 4 MB)" },
      { status: 422 }
    );
  }

  if (inspected.kind === "svg") {
    // defense-in-depth only — the real protection is the sandbox CSP
    // and nosniff headers on /uploads (next.config.ts)
    bytes = sanitizeSvg(bytes);
  }

  const safeBase = (file.name.replace(/\.[^.]+$/, "") || "asset")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 48);
  const name = `${Date.now()}-${safeBase}${inspected.ext}`;
  try {
    const stored = await uploadAsset({
      name,
      bytes,
      contentType: inspected.contentType,
    });
    return NextResponse.json({ data: stored, error: null }, { status: 201 });
  } catch (error) {
    console.error(
      "[assets] upload failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { data: null, error: "Asset upload failed" },
      { status: 500 },
    );
  }
}
