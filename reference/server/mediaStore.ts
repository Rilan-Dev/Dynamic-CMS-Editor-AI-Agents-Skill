import { query } from "@/lib/server/db";

/** Names the upload route generates: `<ms>-<slug><.ext>`. */
export const MEDIA_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}\.(?:jpg|jpeg|png|webp|gif|svg|mp4|webm)$/;

export const mediaUrl = (name: string) => `/media/${name}`;

let schemaReady: Promise<void> | null = null;

function ensureMediaSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        name TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        bytes BYTEA NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query(`ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY`);
    await query(`REVOKE ALL PRIVILEGES ON TABLE media_assets FROM PUBLIC`);
    await query(`
      DO $$
      BEGIN
        IF to_regrole('anon') IS NOT NULL THEN
          EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE media_assets FROM anon';
        END IF;
        IF to_regrole('authenticated') IS NOT NULL THEN
          EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE media_assets FROM authenticated';
        END IF;
      END
      $$
    `);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export async function saveMediaAsset(input: {
  name: string;
  contentType: string;
  bytes: Buffer;
}): Promise<{ url: string }> {
  if (!MEDIA_NAME_PATTERN.test(input.name)) {
    throw new Error(`Invalid media name: ${input.name}`);
  }
  await ensureMediaSchema();
  await query(
    `INSERT INTO media_assets (name, content_type, bytes, size)
     VALUES ($1, $2, $3, $4)`,
    [input.name, input.contentType, input.bytes, input.bytes.length],
  );
  return { url: mediaUrl(input.name) };
}

export async function readMediaAsset(
  name: string,
): Promise<{ contentType: string; bytes: Buffer } | null> {
  if (!MEDIA_NAME_PATTERN.test(name)) return null;
  await ensureMediaSchema();
  const rows = await query<Array<{ content_type: string; bytes: Buffer }>>(
    `SELECT content_type, bytes FROM media_assets WHERE name = $1`,
    [name],
  );
  const row = rows[0];
  return row ? { contentType: row.content_type, bytes: row.bytes } : null;
}
