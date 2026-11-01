import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CMS_SESSION_COOKIE,
  createCmsSessionToken,
} from "@/lib/server/cmsSession";

import { GET } from "./route";

const { getEntry } = vi.hoisted(() => ({ getEntry: vi.fn() }));
vi.mock("@/lib/server/contentStore", () => ({
  getEntry,
  saveDraft: vi.fn(),
  publish: vi.fn(),
  discardDraft: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const params = { params: Promise.resolve({ slug: "home" }) };
const entry = {
  slug: "home",
  draft: { hero: { title: "Unpublished draft" } },
  published: { hero: { title: "Live" } },
  version: 3,
  updatedAt: "2026-09-16T00:00:00.000Z",
  publishedAt: "2026-09-15T00:00:00.000Z",
};

function request(cookie?: string) {
  return new Request("https://www.smtscontracting.com/api/cms/pages/home", {
    headers: {
      host: "www.smtscontracting.com",
      ...(cookie ? { cookie } : {}),
    },
  });
}

beforeEach(() => {
  vi.stubEnv("CMS_EDIT_KEY", "editor-secret");
  vi.stubEnv("NODE_ENV", "production");
  getEntry.mockResolvedValue(entry);
});
afterEach(() => {
  vi.unstubAllEnvs();
  getEntry.mockReset();
});

describe("GET /api/cms/pages/[slug]", () => {
  it("refuses anonymous callers without touching the store", async () => {
    const response = await GET(request(), params);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      data: null,
      error: "Unauthorized",
    });
    expect(getEntry).not.toHaveBeenCalled();
  });

  it("refuses a forged session cookie", async () => {
    const forged = createCmsSessionToken("not-the-real-key");
    const response = await GET(
      request(`${CMS_SESSION_COOKIE}=${encodeURIComponent(forged)}`),
      params,
    );

    expect(response.status).toBe(401);
    expect(getEntry).not.toHaveBeenCalled();
  });

  it("returns draft and published content to a signed-in editor", async () => {
    const token = createCmsSessionToken("editor-secret");
    const response = await GET(
      request(`${CMS_SESSION_COOKIE}=${encodeURIComponent(token)}`),
      params,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: entry, error: null });
    expect(getEntry).toHaveBeenCalledWith("home");
  });
});
