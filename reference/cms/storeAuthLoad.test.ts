import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getState, loadDraftFor } from "./store";

const { getEntry } = vi.hoisted(() => ({ getEntry: vi.fn() }));
vi.mock("@/lib/services/cms.service", () => ({
  CmsService: { getEntry },
}));

beforeEach(() => {
  vi.stubGlobal("document", { body: { classList: { toggle: vi.fn() } } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  getEntry.mockReset();
});

describe("loading CMS documents for editing", () => {
  it("raises authError on an expired session instead of loading registry defaults", async () => {
    getEntry.mockRejectedValue(new Error("Unauthorized"));

    await loadDraftFor("contact");

    const state = getState();
    expect(state.authError).toBe(true);
    expect(state.loading).toBe(false);
    // Nothing seeded from defaults, so there is nothing an editor could
    // save over the real draft.
    expect(state.docs.contact).toBeUndefined();
  });

  it("still falls back to registry defaults when the server simply has no entry", async () => {
    getEntry.mockResolvedValue(null);

    await loadDraftFor("about");

    const state = getState();
    expect(state.docs.about).toBeTruthy();
  });
});
