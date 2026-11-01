import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("Phase 2 history editor wiring",()=>{
  const toolbar=readFileSync("components/cms/GlobalEditToolbar.tsx","utf8");
  const panel=readFileSync("components/cms/CmsVersionHistoryPanel.tsx","utf8");
  it("opens read-only history from the existing inline editor without changing its publish action",()=>{
    expect(toolbar).toContain("CmsVersionHistoryPanel");
    expect(toolbar).toContain('aria-label="Open version history"');
    expect(toolbar).toContain("await publishDraft()");
    expect(toolbar).toContain("setHistoryRefresh");
  });
  it("supports both page and shared site versions with lazy paging and historical previews",()=>{
    expect(panel).toContain('value="site"');
    expect(panel).toContain('value="page"');
    expect(panel).toContain("CmsService.listHistory(slug,before)");
    expect(panel).toContain("CmsService.historicalSnapshot(slug,selectedVersion)");
    expect(panel).toContain("HistoricalContent");
    expect(panel).toContain("Read-only content");
  });
  it("opens the compare and restore workflow, preserving the Phase 2 history selection",()=>{
    const restore=readFileSync("components/cms/CmsHistoryCompareRestore.tsx","utf8");
    expect(panel).toContain("CmsHistoryCompareRestore");
    expect(panel).toContain("liveSnapshot");
    expect(restore).toContain("diffCmsSnapshots");
    expect(restore).toContain("Restore to draft");
    expect(restore).toContain("Restore &amp; Publish");
    expect(restore).toContain("prepareCmsRestoration");
    expect(restore).toContain("Confirm Restore & Publish");
    expect(restore).toContain("applyRestoredCmsRevision");
  });
});
