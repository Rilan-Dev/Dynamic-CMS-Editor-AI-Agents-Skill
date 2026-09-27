import { NextResponse } from "next/server";
import {
  CMS_SESSION_COOKIE,
  cmsKeyMatches,
  cmsSessionCookieOptions,
  createCmsSessionToken,
  getCmsSessionSecret,
  readCmsSessionCookie,
  verifyCmsSessionToken,
} from "@/lib/server/cmsSession";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = getCmsSessionSecret(request);
  const token = readCmsSessionCookie(request);

  return NextResponse.json(
    {
      authenticated: Boolean(
        secret && token && verifyCmsSessionToken(token, secret),
      ),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    key?: unknown;
  } | null;
  const secret = getCmsSessionSecret(request);

  if (
    !secret ||
    typeof body?.key !== "string" ||
    !cmsKeyMatches(body.key, secret)
  ) {
    return NextResponse.json(
      { authenticated: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const response = NextResponse.json(
    { authenticated: true },
    { headers: NO_STORE_HEADERS },
  );
  response.cookies.set(
    CMS_SESSION_COOKIE,
    createCmsSessionToken(secret),
    cmsSessionCookieOptions(),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json(
    { authenticated: false },
    { headers: NO_STORE_HEADERS },
  );
  response.cookies.set(CMS_SESSION_COOKIE, "", {
    ...cmsSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
