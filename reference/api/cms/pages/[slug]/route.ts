import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  discardDraft,
  getEntry,
  publish,
  saveDraft,
} from "@/lib/server/contentStore";
import { cmsAuthorized } from "@/lib/server/cmsAuth";
import type { JsonObject } from "@/components/cms/json";

/**
 * CMS page-content API.
 *   GET    → current entry (draft + published + version)
 *   PUT    → save draft   { draft: JsonObject }
 *   POST   → publish draft
 *   DELETE → discard draft (reset to published)
 *
 * Mutations require the signed CMS browser-session cookie issued after
 * CMS_EDIT_KEY login. A `dev` header fallback exists only for localhost
 * requests made by `next dev`.
 */

const authorized = cmsAuthorized;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  try {
    const entry = await getEntry(slug);
    return NextResponse.json({ data: entry, error: null });
  } catch (e) {
    return NextResponse.json(
      { data: null, error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!authorized(request)) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }
  let body: { draft?: JsonObject };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  if (
    !body.draft ||
    typeof body.draft !== "object" ||
    Array.isArray(body.draft)
  ) {
    return NextResponse.json(
      { data: null, error: "draft must be an object" },
      { status: 422 },
    );
  }
  try {
    const entry = await saveDraft(slug, body.draft);
    return NextResponse.json({ data: entry, error: null });
  } catch (e) {
    return NextResponse.json(
      { data: null, error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!authorized(request)) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const entry = await publish(slug);
    if (!entry?.published) {
      return NextResponse.json(
        { data: null, error: "Nothing to publish" },
        { status: 409 },
      );
    }
    if (slug === "site") {
      // chrome (navbar/footer) renders on every page
      revalidatePath("/", "layout");
    } else {
      revalidatePath(slug === "home" ? "/" : `/${slug}`);
    }
    return NextResponse.json({ data: entry, error: null });
  } catch (e) {
    return NextResponse.json(
      { data: null, error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!authorized(request)) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const entry = await discardDraft(slug);
    return NextResponse.json({ data: entry, error: null });
  } catch (e) {
    return NextResponse.json(
      { data: null, error: (e as Error).message },
      { status: 400 },
    );
  }
}
