import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CmsDocumentValidationError } from "./documentValidation";
import { getState, loadDraftFor, publishDraft, setPath, slugForScope, stopEditing } from "./store";

const { getEntry, saveDraft, publishRelease } = vi.hoisted(() => ({
  getEntry: vi.fn(),
  saveDraft: vi.fn(),
  publishRelease: vi.fn(),
}));
vi.mock("@/lib/services/cms.service", () => ({
  CmsService: { getEntry, saveDraft, publishRelease },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", { body: { classList: { toggle: vi.fn(), remove: vi.fn() } } });
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  });
  getEntry.mockResolvedValue(null);
  saveDraft.mockResolvedValue({ version: 0, draftRevision: 1 });
  publishRelease.mockImplementation(async ({ documents }: { documents: { slug: string; expectedVersion: number; expectedDraftRevision: number }[] }) => ({
    releaseId: "release-1",
    documents: documents.map((d) => ({
      slug: d.slug, version: d.expectedVersion + 1, draftRevision: d.expectedDraftRevision + 1,
    })),
  }));
});
afterEach(() => {
  stopEditing();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  getEntry.mockReset();
  saveDraft.mockReset();
  publishRelease.mockReset();
});

describe("doc: scopes", () => {
  it("resolve to the named document; page and site are unchanged", async () => {
    await loadDraftFor("project-tower");
    expect(slugForScope("doc:projects")).toBe("projects");
    expect(slugForScope("site")).toBe("site");
    expect(slugForScope("page")).toBe("project-tower");
  });

  it("edit a loaded related document: it is marked dirty and autosaved", async () => {
    await loadDraftFor("project-tower");
    expect(getState().docs.projects).toBeTruthy();

    setPath(["detail", "factsTitle"], "Key Facts", "doc:projects");

    const state = getState();
    expect((state.docs.projects?.detail as { factsTitle?: string }).factsTitle).toBe(
      "Key Facts",
    );
    expect(state.dirty.projects).toBe(true);
    // The project itself is untouched.
    expect(state.dirty["project-tower"]).toBeFalsy();
    expect(state.docs["project-tower"]?.detail).toBeUndefined();

    await vi.runAllTimersAsync();
    expect(saveDraft).toHaveBeenCalledWith(
      "projects",
      expect.objectContaining({ detail: expect.objectContaining({ factsTitle: "Key Facts" }) }),
      0,
      0,
    );
  });

  it("do nothing when the document is not loaded", async () => {
    await loadDraftFor("project-tower");
    const before = getState();

    setPath(["title"], "Stray", "doc:not-loaded");

    const after = getState();
    expect(after.docs["not-loaded"]).toBeUndefined();
    expect(after.dirty["not-loaded"]).toBeUndefined();
    expect(after.docs).toBe(before.docs);
    await vi.runAllTimersAsync();
    expect(saveDraft.mock.calls.some(([slug]) => slug === "not-loaded")).toBe(false);
  });
});

describe("publishing a document edited through a doc: scope", () => {
  const editProject = async () => {
    await loadDraftFor("project-tower");
    // A publishable project, so only the index can block the publish.
    setPath(["category"], "commercial");
  };

  it("blocks the whole publish when the index holds an unsafe URL", async () => {
    await editProject();
    setPath(["cta", "buttonHref"], "javascript:alert(1)", "doc:projects");

    const attempt = publishDraft();
    await expect(attempt).rejects.toBeInstanceOf(CmsDocumentValidationError);

    const errors = getState().validationErrors;
    expect(errors).toEqual([
      expect.objectContaining({
        code: "unsafe-url",
        path: ["cta", "buttonHref"],
        message: expect.stringMatching(/^Projects page settings: /),
      }),
    ]);
    expect(saveDraft).not.toHaveBeenCalled();
    expect(publishRelease).not.toHaveBeenCalled();
    expect(getState().dirty.projects).toBe(true);
  });

  it("publishes a clean index together with the project", async () => {
    await editProject();
    setPath(["cta", "buttonHref"], "/contact", "doc:projects");

    await publishDraft();

    expect(getState().validationErrors).toEqual([]);
    expect(publishRelease).toHaveBeenCalledTimes(1);
    const request = publishRelease.mock.calls[0][0];
    expect(request.documents.map((d: { slug: string }) => d.slug).sort()).toEqual(["project-tower", "projects"]);
    expect(getState().dirty).toEqual({});
  });
});
