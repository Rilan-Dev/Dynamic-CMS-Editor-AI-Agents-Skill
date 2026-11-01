import { describe, expect, it, vi } from "vitest";
import { uploadAsset } from "./assetStorage";

const input = {
  name: "photo.png",
  bytes: Buffer.from("png"),
  contentType: "image/png",
};

describe("uploadAsset", () => {
  it("uses local storage when no driver is configured", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);

    const result = await uploadAsset(input, {
      env: {},
      rootDir: "/app",
      mkdir,
      writeFile,
    });

    expect(mkdir).toHaveBeenCalledWith("/app/public/uploads", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith("/app/public/uploads/photo.png", input.bytes);
    expect(result).toEqual({ url: "/uploads/photo.png" });
  });

  it("uploads with the configured Supabase client", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { id: "asset-id", path: "photo.png", fullPath: "smts-media/photo.png" },
      error: null,
    });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example/photo.png" },
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    const createClient = vi.fn().mockReturnValue({ storage: { from } });

    const result = await uploadAsset(input, {
      env: {
        ASSET_STORAGE_DRIVER: "supabase",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "server-secret",
        SUPABASE_STORAGE_BUCKET: "smts-media",
      },
      createClient,
    });

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "server-secret",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(from).toHaveBeenCalledWith("smts-media");
    expect(upload).toHaveBeenCalledWith("photo.png", input.bytes, {
      contentType: "image/png",
      upsert: false,
    });
    expect(getPublicUrl).toHaveBeenCalledWith("photo.png");
    expect(result).toEqual({ url: "https://cdn.example/photo.png" });
  });

  it("rejects an unknown storage driver", async () => {
    await expect(
      uploadAsset(input, { env: { ASSET_STORAGE_DRIVER: "unknown" } }),
    ).rejects.toThrow("Unsupported asset storage driver");
  });

  it("lists missing Supabase configuration without including values", async () => {
    await expect(
      uploadAsset(input, { env: { ASSET_STORAGE_DRIVER: "supabase" } }),
    ).rejects.toThrow(
      "Missing Supabase storage configuration: SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET",
    );
  });

  it("surfaces a sanitized Supabase upload failure", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "bucket rejected upload", status: 400 },
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl: vi.fn() });
    const createClient = vi.fn().mockReturnValue({ storage: { from } });

    await expect(
      uploadAsset(input, {
        env: {
          ASSET_STORAGE_DRIVER: "supabase",
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SECRET_KEY: "server-secret",
          SUPABASE_STORAGE_BUCKET: "smts-media",
        },
        createClient,
      }),
    ).rejects.toThrow("Supabase asset upload failed: bucket rejected upload");
  });

  it("creates the public bucket and retries when it is missing", async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { name: "StorageApiError", message: "Bucket not found", status: 404 },
      })
      .mockResolvedValueOnce({
        data: { id: "asset-id", path: "photo.png", fullPath: "smts-media/photo.png" },
        error: null,
      });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example/photo.png" },
    });
    const createBucket = vi.fn().mockResolvedValue({
      data: { name: "smts-media" },
      error: null,
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    const createClient = vi.fn().mockReturnValue({
      storage: { from, createBucket },
    });

    const result = await uploadAsset(input, {
      env: {
        ASSET_STORAGE_DRIVER: "supabase",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "server-secret",
        SUPABASE_STORAGE_BUCKET: "smts-media",
      },
      createClient,
    });

    expect(createBucket).toHaveBeenCalledWith("smts-media", { public: true });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ url: "https://cdn.example/photo.png" });
  });

  it("surfaces a bucket creation failure without retrying", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "Bucket not found", status: 404 },
    });
    const createBucket = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "creation denied", status: 403 },
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl: vi.fn() });
    const createClient = vi.fn().mockReturnValue({
      storage: { from, createBucket },
    });

    await expect(
      uploadAsset(input, {
        env: {
          ASSET_STORAGE_DRIVER: "supabase",
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SECRET_KEY: "server-secret",
          SUPABASE_STORAGE_BUCKET: "smts-media",
        },
        createClient,
      }),
    ).rejects.toThrow("Supabase bucket creation failed: creation denied");

    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty public URL", async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { id: "asset-id", path: "photo.png", fullPath: "smts-media/photo.png" },
      error: null,
    });
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "" } });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    const createClient = vi.fn().mockReturnValue({ storage: { from } });

    await expect(
      uploadAsset(input, {
        env: {
          ASSET_STORAGE_DRIVER: "supabase",
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SECRET_KEY: "server-secret",
          SUPABASE_STORAGE_BUCKET: "smts-media",
        },
        createClient,
      }),
    ).rejects.toThrow("Supabase asset URL is unavailable");
  });
});

describe("uploadAsset database fallback", () => {
  const supabaseEnv = {
    ASSET_STORAGE_DRIVER: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "anon-key",
    SUPABASE_STORAGE_BUCKET: "smts-media",
  };
  const refusingClient = () => {
    const upload = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl: vi.fn() });
    return vi.fn().mockReturnValue({ storage: { from } });
  };

  it("stores the file in the database when storage refuses the write", async () => {
    const saveToDatabase = vi.fn().mockResolvedValue({ url: "/media/photo.png" });
    const result = await uploadAsset(input, {
      env: { ...supabaseEnv, DATABASE_URL: "postgres://db" },
      createClient: refusingClient(),
      saveToDatabase,
    });
    expect(saveToDatabase).toHaveBeenCalledWith(input);
    expect(result).toEqual({ url: "/media/photo.png" });
  });

  it("stores the file in the database when storage is not configured", async () => {
    const saveToDatabase = vi.fn().mockResolvedValue({ url: "/media/photo.png" });
    await uploadAsset(input, {
      env: { ASSET_STORAGE_DRIVER: "supabase", DATABASE_URL: "postgres://db" },
      saveToDatabase,
    });
    expect(saveToDatabase).toHaveBeenCalledOnce();
  });

  it("still surfaces the refusal when there is no database", async () => {
    await expect(
      uploadAsset(input, { env: supabaseEnv, createClient: refusingClient() }),
    ).rejects.toThrow(/row-level security/);
  });

  it("does not mask an unexpected storage failure", async () => {
    const upload = vi.fn().mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl: vi.fn() });
    const saveToDatabase = vi.fn();
    await expect(
      uploadAsset(input, {
        env: { ...supabaseEnv, DATABASE_URL: "postgres://db" },
        createClient: vi.fn().mockReturnValue({ storage: { from } }),
        saveToDatabase,
      }),
    ).rejects.toThrow(/fetch failed/);
    expect(saveToDatabase).not.toHaveBeenCalled();
  });
});
