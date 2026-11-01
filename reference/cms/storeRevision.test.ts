import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discardDraft, getState, loadDraftFor, publishDraft, setPath, stopEditing, startEditing, prepareCmsRestoration, applyRestoredCmsRevision } from "./store";

const { getEntry, saveDraft, publishRelease, discard } = vi.hoisted(() => ({
  getEntry: vi.fn(), saveDraft: vi.fn(), publishRelease: vi.fn(), discard: vi.fn(),
}));
vi.mock("@/lib/services/cms.service", () => ({
  CmsService: { getEntry, saveDraft, publishRelease, discard },
}));

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("document", { body: { classList: { toggle: vi.fn(), remove: vi.fn() } } });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
  getEntry.mockResolvedValue(null);
  saveDraft.mockResolvedValue({version:1,draftRevision:2});
});
afterEach(() => {
  stopEditing();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("CMS revision-safe editor", () => {
  it("preserves edits typed while a grouped publish is in flight", async () => {
    await loadDraftFor("about");
    let finish!: (v: unknown) => void;
    publishRelease.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    setPath(["hero","title"], "First");
    const operation = publishDraft();
    // Allow release validation/queue settling to reach the network call.
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(publishRelease).toHaveBeenCalledTimes(1);
    setPath(["hero","title"], "Second");
    finish({ releaseId: "id", documents: [{slug:"about",version:1,draftRevision:1}] });
    await operation;
    expect(getState().dirty.about).toBe(true);
    expect((getState().publishedDocs.about?.hero as {title:string}).title).toBe("First");
    expect((getState().docs.about?.hero as {title:string}).title).toBe("Second");
    await vi.runAllTimersAsync();
    expect(saveDraft).toHaveBeenCalledWith("about",expect.objectContaining({
      hero:expect.objectContaining({title:"Second"}),
    }),1,1);
  });

  it("does not overwrite a newer remote draft with an older recovered browser draft", async () => {
    storage.set("cms:draft:about", JSON.stringify({
      __cmsDraft:1,doc:{hero:{title:"Old local"}},version:1,draftRevision:2,
    }));
    getEntry.mockImplementation(async (slug: string) => slug==="about"
      ? {slug,version:3,draftRevision:9,draft:{hero:{title:"New remote"}},
          published:{hero:{title:"Published"}}, updatedAt:"2026-10-28",publishedAt:"2026-10-27"}
      : null);
    await loadDraftFor("about");
    expect(getState().saveError).toMatch(/Recovered local draft conflicts/);
    setPath(["hero","title"],"Still my local changes");
    await vi.runAllTimersAsync();
    expect(saveDraft).not.toHaveBeenCalled();
    await discardDraft();
    expect(discard).not.toHaveBeenCalled();
    expect(getState().saveError).toBeNull();
    expect((getState().docs.about?.hero as {title:string}).title).toBe("New remote");
  });
  it("adopts a restored draft while leaving the current live publication unchanged",async()=>{
    await startEditing("about");
    setPath(["hero","title"],"Work in progress");
    const currentLive=getState().publishedDocs.about;
    const v=await prepareCmsRestoration("about");
    expect(v).toEqual({version:0,draftRevision:0});
    applyRestoredCmsRevision({
      slug:"about",mode:"draft",releaseId:null,version:0,draftRevision:1,
      restoredFromVersion:0,changed:true,snapshot:{hero:{title:"Historical"}},
    });
    expect((getState().docs.about?.hero as {title:string}).title).toBe("Historical");
    expect(getState().publishedDocs.about).toBe(currentLive);
    expect(getState().dirty.about).toBeUndefined();
    expect(getState().versions.about.draftRevision).toBe(1);
    await vi.runAllTimersAsync();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("adopts a published restoration into both live and draft editor views",async()=>{
    await startEditing("about");
    applyRestoredCmsRevision({
      slug:"about",mode:"publish",releaseId:"release-123",version:8,draftRevision:10,
      restoredFromVersion:2,changed:true,snapshot:{hero:{title:"Back to version two"}},
    });
    expect(getState().versions.about.version).toBe(8);
    expect(getState().versions.about.draftRevision).toBe(10);
    expect(getState().publishedDocs.about?.hero).toEqual({title:"Back to version two"});
    expect(getState().docs.about?.hero).toEqual({title:"Back to version two"});
    expect(getState().dirty.about).toBeUndefined();
  });

});
