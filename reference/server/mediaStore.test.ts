import { describe, expect, it } from "vitest";
import { MEDIA_NAME_PATTERN } from "./mediaStore";

describe("MEDIA_NAME_PATTERN", () => {
  it("accepts the names the upload route generates", () => {
    expect(MEDIA_NAME_PATTERN.test("1759000000000-site-photo.jpg")).toBe(true);
    expect(MEDIA_NAME_PATTERN.test("1759000000000-clip.webm")).toBe(true);
  });

  it("rejects traversal, uppercase and unknown types", () => {
    for (const name of ["../secret.png", "a/b.png", "Photo.PNG", "x.html", "x.png.exe", ""]) {
      expect(MEDIA_NAME_PATTERN.test(name), name).toBe(false);
    }
  });
});
