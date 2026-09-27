import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CMS_SESSION_COOKIE,
  cmsKeyMatches,
  cmsSessionCookieOptions,
  createCmsSessionToken,
  getCmsSessionSecret,
  readCmsSessionCookie,
  verifyCmsSessionToken,
} from "./cmsSession";

afterEach(() => vi.unstubAllEnvs());

describe("CMS browser session", () => {
  it("accepts only an untampered token signed by the current key", () => {
    const token = createCmsSessionToken("current-key", "fixed-nonce");

    expect(verifyCmsSessionToken(token, "current-key")).toBe(true);
    expect(verifyCmsSessionToken(token, "rotated-key")).toBe(false);
    expect(verifyCmsSessionToken(`${token}x`, "current-key")).toBe(false);
  });

  it("rejects malformed session tokens", () => {
    expect(verifyCmsSessionToken("", "current-key")).toBe(false);
    expect(verifyCmsSessionToken("v2.nonce.signature", "current-key")).toBe(
      false,
    );
    expect(verifyCmsSessionToken("v1.missing-signature", "current-key")).toBe(
      false,
    );
  });

  it("compares keys without depending on equal input lengths", () => {
    expect(cmsKeyMatches("correct", "correct")).toBe(true);
    expect(cmsKeyMatches("wrong", "correct")).toBe(false);
    expect(cmsKeyMatches("much-longer-wrong-value", "correct")).toBe(false);
  });

  it("uses a non-persistent secure production cookie", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(cmsSessionCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    });
  });

  it("reads the named cookie and rejects malformed encoding", () => {
    const request = new Request("https://example.test", {
      headers: {
        cookie: `other=1; ${CMS_SESSION_COOKIE}=signed%2Etoken`,
      },
    });
    const malformed = new Request("https://example.test", {
      headers: { cookie: `${CMS_SESSION_COOKIE}=%E0%A4%A` },
    });

    expect(readCmsSessionCookie(request)).toBe("signed.token");
    expect(readCmsSessionCookie(malformed)).toBeNull();
  });

  it("allows the development secret only for localhost requests", () => {
    vi.stubEnv("CMS_EDIT_KEY", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(
      getCmsSessionSecret(
        new Request("http://localhost:3000", {
          headers: { host: "localhost:3000" },
        }),
      ),
    ).toBe("dev");
    expect(
      getCmsSessionSecret(
        new Request("https://example.test", {
          headers: { host: "example.test" },
        }),
      ),
    ).toBeNull();
  });
});
