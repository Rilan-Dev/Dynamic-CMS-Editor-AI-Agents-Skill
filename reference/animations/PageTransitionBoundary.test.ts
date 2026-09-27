import { describe, expect, it } from "vitest";
import { shouldTransitionNavigation } from "./PageTransitionBoundary";

const base = {
  currentOrigin: "https://smts.example",
  currentPath: "/about",
  href: "https://smts.example/services",
  target: "",
  download: false,
  modified: false,
  editorActive: false,
  excludedPaths: [] as string[],
};

describe("shouldTransitionNavigation", () => {
  it("allows ordinary internal navigation", () => {
    expect(shouldTransitionNavigation(base)).toBe(true);
  });

  it.each([
    [{ href: "https://external.example/page" }, "external URL"],
    [{ target: "_blank" }, "new tab"],
    [{ download: true }, "download"],
    [{ modified: true }, "modified click"],
    [{ editorActive: true }, "CMS editor"],
    [{ href: "https://smts.example/about#team" }, "same-page hash"],
    [{ href: "https://smts.example/admin", excludedPaths: ["/admin"] }, "excluded path"],
  ])("bypasses %s", (override, _label) => {
    expect(shouldTransitionNavigation({ ...base, ...override })).toBe(false);
  });
});
