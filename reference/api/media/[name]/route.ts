import { readMediaAsset } from "@/lib/server/mediaStore";

/**
 * Serves media stored in the database (see lib/server/mediaStore.ts).
 *
 * Names are unique and never overwritten, so responses are immutable and
 * cached by browsers and the CDN for a year: the database is read about
 * once per file per edge region, not on every page view. The same
 * lock-down as /uploads applies — a hostile SVG cannot run script.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  let asset: Awaited<ReturnType<typeof readMediaAsset>> = null;
  try {
    asset = await readMediaAsset(name);
  } catch (error) {
    console.error("[media] read failed", error instanceof Error ? error.message : error);
    return new Response("Media unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!asset) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
  return new Response(new Uint8Array(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.bytes.length),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "Content-Security-Policy":
        "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
