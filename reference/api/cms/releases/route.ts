import { NextResponse } from "next/server";
import { cmsAuthorized } from "@/lib/server/cmsAuth";
import { publishCmsRelease, checkReleaseRequest, CmsVersionConflictError, type CmsReleaseRequest } from "@/lib/server/cmsRelease";
import { validateReleaseDocuments } from "@/lib/server/cmsReleaseValidation";
import { revalidateCmsPaths } from "@/lib/server/cmsRevalidation";

export async function POST(request: Request) {
  if (!cmsAuthorized(request)) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, {status:401});
  }
  let body: CmsReleaseRequest;
  try { body = await request.json(); }
  catch { return NextResponse.json({data:null,error:"Invalid JSON body"},{status:400}); }
  if (!body || !Array.isArray(body.documents) ||
      body.documents.some((doc) => !Number.isSafeInteger(doc?.expectedVersion)
        || !Number.isSafeInteger(doc?.expectedDraftRevision))) {
    return NextResponse.json({data:null,error:"Expected published and draft revisions are required"},{status:428});
  }
  try { checkReleaseRequest(body); }
  catch { return NextResponse.json({data:null,error:"Invalid CMS release"},{status:422}); }
  try {
    const errors = await validateReleaseDocuments(body.documents);
    if (errors.length) return NextResponse.json({data:null,error:"CMS validation failed",issues:errors},{status:422});
    const data = await publishCmsRelease(body);
    if (data.releaseId) revalidateCmsPaths(data.documents.map((d) => d.slug));
    return NextResponse.json({data,error:null},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    if (error instanceof CmsVersionConflictError) return NextResponse.json(
      {data:null,error:error.message},{status:409});
    // Avoid disclosing SQL or provider credentials to the browser.
    return NextResponse.json({data:null,error:"Unable to publish CMS release"},{status:500});
  }
}
