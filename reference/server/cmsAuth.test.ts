import { afterEach, describe, expect, it, vi } from "vitest";
import { cmsAuthorized } from "./cmsAuth";
import { CMS_SESSION_COOKIE, createCmsSessionToken } from "./cmsSession";

afterEach(() => vi.unstubAllEnvs());

describe("cmsAuthorized", () => {
  it("accepts a valid session cookie in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMS_EDIT_KEY", "secret");
    const token = createCmsSessionToken("secret", "nonce");
    const request = new Request("https://example.test/api/cms/pages/home", {
      headers: {
        cookie: `${CMS_SESSION_COOKIE}=${token}`,
        host: "example.test",
      },
    });

    expect(cmsAuthorized(request)).toBe(true);
  });

  it("rejects a rotated or missing session cookie in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMS_EDIT_KEY", "rotated");
    const oldToken = createCmsSessionToken("old", "nonce");

    expect(
      cmsAuthorized(
        new Request("https://example.test", {
          headers: {
            cookie: `${CMS_SESSION_COOKIE}=${oldToken}`,
            host: "example.test",
          },
        }),
      ),
    ).toBe(false);
    expect(
      cmsAuthorized(
        new Request("https://example.test", {
          headers: { host: "example.test" },
        }),
      ),
    ).toBe(false);
  });

  it("does not accept a raw production key header", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMS_EDIT_KEY", "secret");

    expect(
      cmsAuthorized(
        new Request("https://example.test", {
          headers: { host: "example.test", "x-cms-key": "secret" },
        }),
      ),
    ).toBe(false);
  });

  it("retains the localhost-only development fallback", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CMS_EDIT_KEY", "");

    expect(
      cmsAuthorized(
        new Request("http://localhost:3000", {
          headers: { host: "localhost:3000", "x-cms-key": "dev" },
        }),
      ),
    ).toBe(true);
    expect(
      cmsAuthorized(
        new Request("https://example.test", {
          headers: { host: "example.test", "x-cms-key": "dev" },
        }),
      ),
    ).toBe(false);
  });
});
