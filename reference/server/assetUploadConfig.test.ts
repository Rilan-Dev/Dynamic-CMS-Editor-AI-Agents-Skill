import { describe, expect, it, vi } from "vitest";
import { assetPathPrefix, uploadAsset } from "./assetStorage";

describe("assetPathPrefix", () => {
  it("separates preview uploads from live media in the shared bucket", () => {
    expect(assetPathPrefix({ VERCEL_ENV: "preview" })).toBe("uat/");
  });

  it("leaves production and local uploads at the bucket root", () => {
    expect(assetPathPrefix({ VERCEL_ENV: "production" })).toBe("");
    expect(assetPathPrefix({})).toBe("");
  });
});

describe("supabase upload key", () => {
  it("stores and links the same prefixed key", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "x" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://project.supabase.co/storage/v1/object/public/media/uat/file.png" },
    });
    const createClient = vi.fn().mockReturnValue({
      storage: { from: () => ({ upload, getPublicUrl }), createBucket: vi.fn() },
    });

    await uploadAsset(
      { name: "file.png", bytes: Buffer.from("x"), contentType: "image/png" },
      {
        env: {
          ASSET_STORAGE_DRIVER: "supabase",
          VERCEL_ENV: "preview",
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SECRET_KEY: "secret",
          SUPABASE_STORAGE_BUCKET: "media",
        },
        createClient,
      },
    );

    expect(upload).toHaveBeenCalledWith("uat/file.png", expect.anything(), expect.anything());
    expect(getPublicUrl).toHaveBeenCalledWith("uat/file.png");
  });
});
