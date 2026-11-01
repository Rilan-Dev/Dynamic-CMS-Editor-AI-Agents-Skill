import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getState, setCmsViewMode, startEditing, stopEditing } from "./store";

const { getEntry } = vi.hoisted(() => ({ getEntry: vi.fn() }));
vi.mock("@/lib/services/cms.service", () => ({
  CmsService: { getEntry, saveDraft: vi.fn(), publish: vi.fn() },
}));

const toggle = vi.fn();
beforeEach(() => {
  vi.stubGlobal("document", { body: { classList: { toggle, remove: vi.fn() } } });
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  getEntry.mockResolvedValue(null);
});
afterEach(() => {
  stopEditing();
  vi.unstubAllGlobals();
  toggle.mockReset();
});

describe("CMS view modes", () => {
  it("previews drafts read-only: drafts stay loaded, the editing chrome is off", async () => {
    await startEditing("home");
    const draftDocs = getState().docs;

    setCmsViewMode("preview");

    expect(getState().viewMode).toBe("preview");
    expect(getState().docs).toBe(draftDocs);
    expect(toggle).toHaveBeenLastCalledWith("cms-editing", false);
  });

  it("returns to editing from the draft preview", async () => {
    await startEditing("home");
    setCmsViewMode("preview");
    setCmsViewMode("draft");
    expect(getState().viewMode).toBe("draft");
    expect(toggle).toHaveBeenLastCalledWith("cms-editing", true);
  });

  it("does nothing outside edit mode", () => {
    setCmsViewMode("preview");
    expect(getState().viewMode).toBe("draft");
  });
});
