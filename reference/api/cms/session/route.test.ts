import { afterEach, describe, expect, it, vi } from "vitest";
import { CMS_SESSION_COOKIE } from "@/lib/server/cmsSession";
import { DELETE, GET, POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

function loginRequest(key: string) {
  return new Request("https://example.test/api/cms/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "example.test",
    },
    body: JSON.stringify({ key }),
  });
}

describe("CMS session route", () => {
  it("sets an HttpOnly browser-session cookie for a valid key", async () => {
    vi.stubEnv("CMS_EDIT_KEY", "editor-secret");
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(loginRequest("editor-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${CMS_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Max-Age");
    expect(cookie).not.toContain("Expires");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a wrong key without setting a cookie", async () => {
    vi.stubEnv("CMS_EDIT_KEY", "editor-secret");

    const response = await POST(loginRequest("wrong"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      authenticated: false,
      error: "Unauthorized",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects malformed login bodies", async () => {
    vi.stubEnv("CMS_EDIT_KEY", "editor-secret");
    const response = await POST(
      new Request("https://example.test/api/cms/session", {
        method: "POST",
        headers: { host: "example.test" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("reports a valid cookie and clears it on logout", async () => {
    vi.stubEnv("CMS_EDIT_KEY", "editor-secret");
    const login = await POST(loginRequest("editor-secret"));
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const status = await GET(
      new Request("https://example.test/api/cms/session", {
        headers: { cookie, host: "example.test" },
      }),
    );
    const logout = await DELETE();

    expect(await status.json()).toEqual({ authenticated: true });
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await logout.json()).toEqual({ authenticated: false });
  });

  it("reports false for a missing or invalidated session", async () => {
    vi.stubEnv("CMS_EDIT_KEY", "rotated-key");

    const response = await GET(
      new Request("https://example.test/api/cms/session", {
        headers: {
          cookie: `${CMS_SESSION_COOKIE}=v1.nonce.invalid`,
          host: "example.test",
        },
      }),
    );

    expect(await response.json()).toEqual({ authenticated: false });
  });
});
