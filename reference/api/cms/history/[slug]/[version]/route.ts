import { cmsAuthorized } from "@/lib/server/cmsAuth";
import { getCmsVersion } from "@/lib/server/cmsHistory";
import { historyJson,historyError,parseHistoryVersion,validHistorySlug } from "@/lib/api/cms/history/shared";

type Params={params:Promise<{slug:string;version:string}>};
export async function GET(request:Request,{params}:Params) {
  if(!cmsAuthorized(request)) return historyJson(null,"Unauthorized",401);
  const {slug,version:versionRaw}=await params;
  const version=parseHistoryVersion(versionRaw);
  if(!validHistorySlug(slug)||version===null) return historyJson(null,"Invalid document or version",400);
  try {
    const found=await getCmsVersion(slug,version);
    if(!found) return historyJson(null,"Version not found",404);
    return historyJson(found);
  } catch(error) {
    return historyError(error);
  }
}
