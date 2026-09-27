import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAsset } from "./uploadAsset";

describe("uploadAsset", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the stored asset URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { url: "/uploads/icon.svg" },
          error: null,
        }),
      }),
    );

    await expect(
      uploadAsset(new File(["svg"], "icon.svg")),
    ).resolves.toBe("/uploads/icon.svg");
  });

  it("preserves the API error when upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ data: null, error: "Unauthorized" }),
      }),
    );

    await expect(
      uploadAsset(new File(["x"], "x.png")),
    ).rejects.toThrow("Unauthorized");
  });
});
