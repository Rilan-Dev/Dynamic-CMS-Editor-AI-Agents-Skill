import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const CMS_SESSION_COOKIE = "cms_session";

const TOKEN_VERSION = "v1";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function cmsKeyMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(digest(provided), digest(expected));
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createCmsSessionToken(
  secret: string,
  nonce = randomBytes(24).toString("base64url"),
): string {
  const payload = `${TOKEN_VERSION}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCmsSessionToken(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    parts[0] !== TOKEN_VERSION ||
    !parts[1] ||
    !parts[2]
  ) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  return cmsKeyMatches(parts[2], sign(payload, secret));
}

export function readCmsSessionCookie(request: Request): string | null {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split("=");
    if (name !== CMS_SESSION_COOKIE) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

export function cmsSessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function isLocalRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

export function getCmsSessionSecret(request: Request): string | null {
  if (process.env.CMS_EDIT_KEY) return process.env.CMS_EDIT_KEY;
  return process.env.NODE_ENV === "development" && isLocalRequest(request)
    ? "dev"
    : null;
}
