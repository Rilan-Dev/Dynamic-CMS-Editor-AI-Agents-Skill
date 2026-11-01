import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  "components/footer/FooterInlineCms.module.css",
  "utf8",
);

describe("footer inline CMS styling", () => {
  it("uses scoped edit-mode surfaces and replaces public rows", () => {
    expect(css).toContain(":global(body.cms-editing)");
    expect(css).toContain(":has(> .socialScope)");
    expect(css).toContain(":has(+ :global(div) > .serviceScope)");
    expect(css).toContain(":global(.cms-footer-inline-editor)");
    expect(css).toContain(":global(.cms-footer-social-card)");
    expect(css).toContain(":global(.cms-footer-service-row)");
    expect(css).toContain(":global(.cms-add--icon-only)");
  });

  it("provides error, focus, responsive, and reduced-motion states", () => {
    expect(css).toContain("cms-footer-social-card--error");
    expect(css).toContain("cms-footer-service-row--error");
    expect(css).toContain("cms-footer-inline-input:focus");
    expect(css).toContain("cms-footer-service-option:focus-visible");
    expect(css).toContain("@media (max-width: 640px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none");
  });
});
