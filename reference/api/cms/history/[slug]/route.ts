import { cmsAuthorized } from "@/lib/server/cmsAuth";
import { listCmsVersions } from "@/lib/server/cmsHistory";
import { historyJson,historyError,parseHistoryVersion,validHistorySlug } from "@/lib/api/cms/history/shared";

type Params={params:Promise<{slug:string}>};
export async function GET(request:Request,{params}:Params) {
  if(!cmsAuthorized(request)) return historyJson(null,"Unauthorized",401);
  const {slug}=await params;
  if(!validHistorySlug(slug)) return historyJson(null,"Invalid document",400);
  const beforeValue = new URL(request.url).searchParams.get("before");
  const before = beforeValue === null ? null : parseHistoryVersion(beforeValue);
  if(beforeValue !== null && before === null) return historyJson(null,"Invalid version cursor",400);
  try {
    return historyJson(await listCmsVersions(slug,before));
  } catch(error) {
    return historyError(error);
  }
}
