import { describe, expect, it } from "vitest";
import type {
  AnimationApplyScope,
  AnimationEditorAdapter,
  AnimationEditorTarget,
} from "../index";

const target: AnimationEditorTarget = {
  id: "component:hero:quote-button",
  type: "button",
  label: "Get a Quote button",
  sectionId: "hero",
  pageId: "home",
};

const scope: AnimationApplyScope = { kind: "target", targetId: target.id };

const adapter: AnimationEditorAdapter = {
  getDraftConfig: () => ({}),
  getPublishedConfig: () => ({}),
  getAvailableScopes: () => [],
  preview: () => undefined,
  clearPreview: () => undefined,
  replay: () => undefined,
  cancel: () => undefined,
  saveDraft: async () => ({ id: "receipt-1", label: "Only this button", changes: [] }),
  undo: async () => undefined,
  resetDraft: async () => undefined,
  subscribeStatus: () => () => undefined,
};

describe("animation editor public contracts", () => {
  it("exports a project-independent adapter contract", () => {
    expect(target.type).toBe("button");
    expect(scope.kind).toBe("target");
    expect(typeof adapter.saveDraft).toBe("function");
    expect(typeof adapter.preview).toBe("function");
  });
});
