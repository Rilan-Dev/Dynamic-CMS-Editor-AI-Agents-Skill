import { describe, expect, it } from "vitest";
import { inspectAsset, sanitizeSvg } from "./validation";

describe("inspectAsset", () => {
  it("recognizes PNG content from magic bytes", () => {
    const bytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);

    expect(inspectAsset(bytes)).toEqual({
      ext: ".png",
      kind: "raster",
      contentType: "image/png",
    });
  });

  it("recognizes SVG content after an XML prolog", () => {
    const bytes = Buffer.from('<?xml version="1.0"?><svg viewBox="0 0 1 1"></svg>');

    expect(inspectAsset(bytes)).toEqual({
      ext: ".svg",
      kind: "svg",
      contentType: "image/svg+xml",
    });
  });

  it("rejects unrecognized content", () => {
    expect(inspectAsset(Buffer.from("not-media-data"))).toBeNull();
  });
});

describe("sanitizeSvg", () => {
  it("removes scripts, event handlers, and javascript links", () => {
    const dirty = Buffer.from(
      '<svg onload="alert(1)"><script>alert(1)</script><a href="javascript:x">x</a></svg>',
    );

    const clean = sanitizeSvg(dirty).toString("utf8");

    expect(clean).not.toMatch(/<script|onload|javascript:/i);
    expect(clean).toContain("<svg");
  });
});
