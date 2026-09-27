import { afterEach, describe, expect, it, vi } from "vitest";
import { CmsService, clearLegacyCmsKey } from "./cms.service";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CmsService browser session", () => {
  it("checks authentication through the session endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
      );

    await expect(CmsService.sessionStatus()).resolves.toEqual({
      authenticated: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/cms/session", {
      cache: "no-store",
    });
  });

  it("submits the key only to the session login endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
      );

    await CmsService.login("secret");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cms/session",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "secret" }),
      }),
    );
  });

  it("does not attach x-cms-key to content mutations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: null }), {
        status: 200,
      }),
    );

    await CmsService.publish("home");

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).has("x-cms-key")).toBe(false);
  });

  it("surfaces a failed session login as Unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ authenticated: false, error: "Unauthorized" }),
        { status: 401 },
      ),
    );

    await expect(CmsService.login("wrong")).rejects.toThrow("Unauthorized");
  });

  it("removes the legacy sessionStorage key", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("sessionStorage", { removeItem });

    clearLegacyCmsKey();

    expect(removeItem).toHaveBeenCalledWith("cms:key");
  });
});
