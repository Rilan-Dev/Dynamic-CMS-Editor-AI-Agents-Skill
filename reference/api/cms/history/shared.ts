import { NextResponse } from "next/server";
import { CmsHistoryUnavailableError } from "@/lib/server/cmsHistory";
export const PRIVATE_HISTORY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};
export function historyJson(data: unknown, error: string | null = null, status = 200) {
  return NextResponse.json({data,error},{status,headers:PRIVATE_HISTORY_HEADERS});
}
export function historyError(error: unknown) {
  if (error instanceof CmsHistoryUnavailableError)
    return historyJson(null,"Version history is not configured for this environment.",503);
  return historyJson(null,"Unable to load CMS version history.",500);
}
export const validHistorySlug = (slug: string) => /^[a-z0-9-]+$/.test(slug);
export function parseHistoryVersion(value: string | null): number | null {
  if (value === null || !/^(0|[1-9][0-9]*)$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
