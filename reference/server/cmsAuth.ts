import {
  getCmsSessionSecret,
  readCmsSessionCookie,
  verifyCmsSessionToken,
} from "./cmsSession";

/** Shared cookie-based auth guard for CMS content and asset mutations. */
export function cmsAuthorized(request: Request): boolean {
  const secret = getCmsSessionSecret(request);
  const token = readCmsSessionCookie(request);
  if (secret && token && verifyCmsSessionToken(token, secret)) return true;

  if (process.env.NODE_ENV === "development" && !process.env.CMS_EDIT_KEY) {
    const host = request.headers.get("host") ?? "";
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    return isLocal && request.headers.get("x-cms-key") === "dev";
  }
  return false;
}
