import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type AssetUploadInput = {
  name: string;
  bytes: Buffer;
  contentType: string;
};

type StorageUploadResult = {
  data: { id?: string; path: string; fullPath?: string } | null;
  error: { message: string } | null;
};

type StorageBucketClient = {
  upload: (
    name: string,
    bytes: Buffer,
    options: { contentType: string; upsert: boolean },
  ) => Promise<StorageUploadResult>;
  getPublicUrl: (name: string) => { data: { publicUrl: string } };
};

type StorageService = {
  from: (bucket: string) => StorageBucketClient;
  createBucket: (
    bucket: string,
    options: { public: boolean },
  ) => Promise<{
    data: { name: string } | null;
    error: { message: string } | null;
  }>;
};

type CreateClient = (
  url: string,
  key: string,
  options: { auth: { persistSession: false; autoRefreshToken: false } },
) => { storage: StorageService };

type UploadOptions = {
  env?: Record<string, string | undefined>;
  rootDir?: string;
  mkdir?: (directory: string, options: { recursive: true }) => Promise<unknown>;
  writeFile?: (filename: string, bytes: Buffer) => Promise<unknown>;
  createClient?: CreateClient;
  /** Database fallback; injectable for tests. */
  saveToDatabase?: (input: AssetUploadInput) => Promise<{ url: string }>;
};

const defaultCreateClient: CreateClient = (url, key, options) =>
  createSupabaseClient(
    url,
    key,
    options,
  ) as unknown as ReturnType<CreateClient>;

async function uploadLocal(
  input: AssetUploadInput,
  options: Required<Pick<UploadOptions, "rootDir" | "mkdir" | "writeFile">>,
): Promise<{ url: string }> {
  const directory = path.join(options.rootDir, "public", "uploads");
  await options.mkdir(directory, { recursive: true });
  await options.writeFile(path.join(directory, input.name), input.bytes);
  return { url: `/uploads/${input.name}` };
}

/** Preview deployments write under uat/ in the shared bucket. */
export function assetPathPrefix(
  env: Record<string, string | undefined>,
): string {
  return env.VERCEL_ENV === "preview" ? "uat/" : "";
}

async function uploadSupabase(
  input: AssetUploadInput,
  env: Record<string, string | undefined>,
  createClient: CreateClient,
): Promise<{ url: string }> {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_STORAGE_BUCKET",
  ] as const;
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase storage configuration: ${missing.join(", ")}`,
    );
  }

  const url = env.SUPABASE_URL as string;
  const secret = env.SUPABASE_SECRET_KEY as string;
  const bucketName = env.SUPABASE_STORAGE_BUCKET as string;
  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = client.storage.from(bucketName);
  // Preview and production share one bucket (Supabase Storage has no
  // per-environment split), so UAT uploads go under their own prefix and
  // stay distinguishable from live media.
  const key = `${assetPathPrefix(env)}${input.name}`;
  const uploadOptions = {
    contentType: input.contentType,
    upsert: false,
  };
  let { error } = await bucket.upload(key, input.bytes, uploadOptions);
  if (error && /bucket.*not found/i.test(error.message)) {
    const created = await client.storage.createBucket(bucketName, {
      public: true,
    });
    if (created.error) {
      throw new Error(
        `Supabase bucket creation failed: ${created.error.message}`,
      );
    }
    ({ error } = await bucket.upload(key, input.bytes, uploadOptions));
  }
  if (error) {
    throw new Error(`Supabase asset upload failed: ${error.message}`);
  }

  const { data } = bucket.getPublicUrl(key);
  if (!data.publicUrl) {
    throw new Error("Supabase asset URL is unavailable");
  }
  return { url: data.publicUrl };
}

/** Errors that mean "storage will not accept writes", not a transient outage. */
export const isStorageRefusal = (detail: string) =>
  /row-level security|unauthorized|forbidden|\b403\b|permission|Missing Supabase storage configuration|bucket creation failed|invalid (?:jwt|api key|compact jws)/i.test(
    detail,
  );

export async function uploadAsset(
  input: AssetUploadInput,
  options: UploadOptions = {},
): Promise<{ url: string }> {
  const env = options.env ?? process.env;
  const driver = env.ASSET_STORAGE_DRIVER ?? "local";

  if (driver === "local") {
    return uploadLocal(input, {
      rootDir: options.rootDir ?? process.cwd(),
      mkdir: options.mkdir ?? fs.mkdir,
      writeFile: options.writeFile ?? fs.writeFile,
    });
  }
  if (driver === "supabase") {
    try {
      return await uploadSupabase(
        input,
        env,
        options.createClient ?? defaultCreateClient,
      );
    } catch (error) {
      // Storage refusing the write (an anon key in SUPABASE_SECRET_KEY,
      // missing bucket config) used to leave editors unable to upload at
      // all. When the CMS database is available, keep the file there and
      // serve it from /media instead; a real outage still surfaces.
      const detail = error instanceof Error ? error.message : String(error);
      if (!env.DATABASE_URL || !isStorageRefusal(detail)) throw error;
      console.warn("[assets] storage refused the upload; storing in the database", detail);
      const save =
        options.saveToDatabase ??
        (async (asset: AssetUploadInput) =>
          (await import("@/lib/server/mediaStore")).saveMediaAsset(asset));
      return save(input);
    }
  }
  throw new Error(`Unsupported asset storage driver: ${driver}`);
}
