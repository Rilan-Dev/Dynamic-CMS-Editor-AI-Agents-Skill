import { cmsAuthorized } from "@/lib/server/cmsAuth";
import { getCmsVersion } from "@/lib/server/cmsHistory";
import { checkRestoreRequest, restoreCmsRevision,
  CmsRestoreConflictError, CmsRestoreNotFoundError, type CmsRestoreRequest,
} from "@/lib/server/cmsRestore";
import { validateReleaseDocuments } from "@/lib/server/cmsReleaseValidation";
import { revalidateCmsPaths } from "@/lib/server/cmsRevalidation";
import { historyJson,historyError,parseHistoryVersion,validHistorySlug } from "@/lib/api/cms/history/shared";

type Params={params:Promise<{slug:string;version:string}>};
export async function POST(request:Request,{params}:Params){
  if(!cmsAuthorized(request)) return historyJson(null,"Unauthorized",401);
  const {slug,version:versionRaw}=await params;
  const sourceVersion=parseHistoryVersion(versionRaw);
  if(!validHistorySlug(slug)||sourceVersion===null) return historyJson(null,"Invalid document or version",400);
  let body:Partial<CmsRestoreRequest>;
  try { body=await request.json(); } catch {return historyJson(null,"Invalid JSON body",400);}
  if (!body || !Number.isSafeInteger(body.expectedVersion)
    || !Number.isSafeInteger(body.expectedDraftRevision)) {
    return historyJson(null,"Current published and draft versions are required",428);
  }
  const input:CmsRestoreRequest={
    slug,sourceVersion,expectedVersion:body.expectedVersion!,
    expectedDraftRevision:body.expectedDraftRevision!,
    mode:body.mode as CmsRestoreRequest["mode"],
    requestId:body.requestId as string,
  };
  try{checkRestoreRequest(input);}
  catch{return historyJson(null,"Invalid restore request",422);}
  try{
    // Historic data is always reloaded on the server; browser-supplied snapshots are ignored.
    const saved=await getCmsVersion(slug,sourceVersion);
    if(!saved) return historyJson(null,"Saved version not found",404);
    const problems=await validateReleaseDocuments([{
      slug,document:saved.snapshot,
      expectedVersion:input.expectedVersion,
      expectedDraftRevision:input.expectedDraftRevision,
    }]);
    if(problems.length) return historyJson(null,"The saved version needs changes before it can be restored",422);
    const data=await restoreCmsRevision(input);
    if(input.mode==="publish" && data.changed) revalidateCmsPaths([slug]);
    return historyJson(data);
  }catch(error){
    if(error instanceof CmsRestoreConflictError)return historyJson(null,error.message,409);
    if(error instanceof CmsRestoreNotFoundError)return historyJson(null,error.message,404);
    return historyError(error);
  }
}
