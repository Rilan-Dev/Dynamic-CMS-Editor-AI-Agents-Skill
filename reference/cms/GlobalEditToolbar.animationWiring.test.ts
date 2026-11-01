import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("removes the animation side-sheet and exposes edit / drafts / live views", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/cms/GlobalEditToolbar.tsx"),
    "utf8",
  );
  expect(source).not.toContain("AnimationEditorPanel");
  expect(source).not.toContain("setAnimationOpen");
  expect(source).not.toContain(">Animations<");
  expect(source).toContain('role="radiogroup"');
  for (const mode of ['["draft", "Edit"', '["preview", "Drafts"', '["published", "Live"']) {
    expect(source).toContain(mode);
  }
  expect(source).toContain("Viewing published version");
  expect(source).toContain("Viewing drafts");
});

it("keeps edit mode active after publishing", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/cms/GlobalEditToolbar.tsx"),
    "utf8",
  );
  const publishBlock = source.slice(
    source.indexOf("const handlePublish"),
    source.indexOf("const VIEW_MESSAGES"),
  );
  expect(publishBlock).toContain("await publishDraft()");
  expect(publishBlock).toContain('setCmsViewMode("draft")');
  expect(publishBlock).not.toContain("stopEditing()");
});
