import { NextResponse } from "next/server";
import {
  discardDraft,
  getEntry,
  saveDraft,
} from "@/lib/server/contentStore";
import { cmsAuthorized } from "@/lib/server/cmsAuth";
import type { JsonObject } from "@/components/cms/json";
import { CmsVersionConflictError } from "@/lib/server/cmsRelease";

/**
 * CMS page-content API.
 *   GET    → current entry (draft + published + version)
 *   PUT    → save draft   { draft: JsonObject }
 *   POST   → publish draft
 *   DELETE → discard draft (reset to published)
 *
 * Every method — reads included — requires the signed CMS browser-session
 * cookie issued after CMS_EDIT_KEY login: an entry carries the unpublished
 * draft, and only the editor reads this endpoint (public pages render
 * server-side). A `dev` header fallback exists only for localhost requests
 * made by `next dev`.
 */

const authorized = cmsAuthorized;

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!authorized(request)) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }
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
  let body: { draft?: JsonObject; expectedVersion?: number; expectedDraftRevision?: number };
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
  if (!Number.isSafeInteger(body.expectedVersion) || !Number.isSafeInteger(body.expectedDraftRevision))
    return NextResponse.json({data:null,error:"Draft version preconditions required"},{status:428});
  try {
    const entry = await saveDraft(slug, body.draft, body.expectedVersion!, body.expectedDraftRevision!);
    return NextResponse.json({ data: entry, error: null });
  } catch (e) {
    if (e instanceof CmsVersionConflictError)
      return NextResponse.json({data:null,error:e.message},{status:409});
    return NextResponse.json({data:null,error:"Unable to save draft"},{status:500});
  }
}

/** No legacy publishing bypass: all publishes must pass release validation and atomically archive. */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({data:null,error:"Unauthorized"},{status:401});
  return NextResponse.json({
    data:null,error:"This editor is outdated. Refresh the page to publish using versioned releases.",
  },{status:410});
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params;
  if (!authorized(request)) return NextResponse.json({data:null,error:"Unauthorized"},{status:401});
  let body: { expectedVersion?: number; expectedDraftRevision?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({data:null,error:"Version preconditions required"},{status:428});
  }
  if (!Number.isSafeInteger(body.expectedVersion) || !Number.isSafeInteger(body.expectedDraftRevision))
    return NextResponse.json({data:null,error:"Version preconditions required"},{status:428});
  try {
    const data = await discardDraft(slug, body.expectedVersion!, body.expectedDraftRevision!);
    return NextResponse.json({data,error:null});
  } catch (error) {
    if (error instanceof CmsVersionConflictError)
      return NextResponse.json({data:null,error:error.message},{status:409});
    return NextResponse.json({data:null,error:"Unable to discard draft"},{status:500});
  }
}
