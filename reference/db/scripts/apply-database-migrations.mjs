import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "pg";

const MIGRATION_FILE = /^\d{12}_[a-z0-9_]+\.sql$/;
const MIGRATION_LOCK = 736873821;
const SCHEMA_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
const defaultMigrationsDirectory = path.resolve(import.meta.dirname, "../db/migrations");

export function validateDatabaseSchema(schema) {
  if (typeof schema !== "string" || !SCHEMA_IDENTIFIER.test(schema)) {
    throw new Error("DATABASE_SCHEMA must be a lowercase PostgreSQL identifier (1-63 characters)");
  }
  return schema;
}

export function qualifyMigrationSql(sql, schema) {
  const safeSchema = validateDatabaseSchema(schema);
  // Migration sources are repository-controlled SQL. Only schema-qualified
  // public references and catalog schema literals are rewritten.
  return sql.replaceAll("public.", `"${safeSchema}".`).replaceAll("'public'", `'${safeSchema}'`);
}

export async function bootstrapSchemaFromPublic(client, schema, { overwrite = false } = {}) {
  const safeSchema = validateDatabaseSchema(schema);
  // Production content must be curated from approved site content, never copied
  // from the shared legacy public schema where UAT/demo records may exist.
  if (safeSchema === "public" || safeSchema === "smts_prod") return;
  const sources = await client.query(`
    SELECT
      to_regclass('public.page_contents') IS NOT NULL AS has_pages,
      to_regclass('public.media_assets') IS NOT NULL AS has_media,
      to_regclass('public.leads') IS NOT NULL AS has_leads
  `);
  const source = sources.rows?.[0] ?? {};
  if (source.has_pages) {
    await client.query(`
      INSERT INTO "${safeSchema}".page_contents
        (slug, draft, published, version, updated_at, published_at)
      SELECT slug, draft, published, version, updated_at, published_at
      FROM public.page_contents
      ON CONFLICT (slug) ${overwrite ? "DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, version = EXCLUDED.version, updated_at = EXCLUDED.updated_at, published_at = EXCLUDED.published_at" : "DO NOTHING"}
    `);
  }
  if (source.has_media) {
    await client.query(`
      INSERT INTO "${safeSchema}".media_assets
        (name, content_type, bytes, size, created_at)
      SELECT name, content_type, bytes, size, created_at
      FROM public.media_assets
      ON CONFLICT (name) ${overwrite ? "DO UPDATE SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes, size = EXCLUDED.size, created_at = EXCLUDED.created_at" : "DO NOTHING"}
    `);
  }
  // Production must retain existing lead records when the application moves
  // off public. UAT/dev intentionally do not copy customer personal data.
  if (safeSchema === "smts_prod" && source.has_leads) {
    await client.query(`
      INSERT INTO "${safeSchema}".leads
        (id, name, email, phone, message, service, source, source_page, created_at)
      SELECT id, name, email, phone, message, service, source, source_page, created_at
      FROM public.leads
      ON CONFLICT (id) ${overwrite ? "DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, message = EXCLUDED.message, service = EXCLUDED.service, source = EXCLUDED.source, source_page = EXCLUDED.source_page, created_at = EXCLUDED.created_at" : "DO NOTHING"}
    `);
    await client.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${safeSchema}".leads`,
      [`${safeSchema}.leads`],
    );
  }
}

export async function loadDatabaseMigrations(migrationsDirectory = defaultMigrationsDirectory) {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(filenames.map(async (filename) => ({
    id: filename.slice(0, -4),
    sql: await readFile(path.join(migrationsDirectory, filename), "utf8"),
  })));
}

export async function applyDatabaseMigrations({ client, migrations, schema = "public", bootstrapFromPublic = false, log = console.log }) {
  const safeSchema = validateDatabaseSchema(schema);
  if (!migrations.length) throw new Error("No database migrations were found");

  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    const existingSchema = await client.query("SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS exists", [safeSchema]);
    const schemaExisted = existingSchema.rows?.[0]?.exists === true;
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}"`);
    for (const migration of migrations) {
      log(`Applying database migration ${migration.id} to schema ${safeSchema}`);
      await client.query(qualifyMigrationSql(migration.sql, safeSchema));
    }
    if (bootstrapFromPublic) {
      await client.query(`CREATE TABLE IF NOT EXISTS "${safeSchema}"._environment_bootstrap (
        key TEXT PRIMARY KEY,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      const marker = await client.query(
        `SELECT 1 FROM "${safeSchema}"._environment_bootstrap WHERE key = 'public-data-bootstrap' LIMIT 1`,
      );
      const bootstrapPending = marker.rows?.length === 0;
      // Never auto-import the shared public schema into production. Preview/dev
      // schemas may bootstrap once when newly created; production is seeded and
      // cleaned through an explicit reviewed production-content operation.
      const shouldBootstrap = bootstrapPending && safeSchema !== "smts_prod" && !schemaExisted;
      if (shouldBootstrap) {
        await bootstrapSchemaFromPublic(client, safeSchema, { overwrite: safeSchema === "smts_prod" });
        // Production is marked complete only after the new deployment is
        // live and verified; retries before that keep syncing public changes.
        if (safeSchema !== "smts_prod") {
          await client.query(`INSERT INTO "${safeSchema}"._environment_bootstrap (key) VALUES ('public-data-bootstrap') ON CONFLICT (key) DO NOTHING`);
        }
      }
    }
    // The first schema bootstrap copies legacy pages AFTER migrations run.
    // Re-apply the idempotent baseline here so newly imported documents are
    // represented in the history from their first appearance in this schema.
    if (migrations.some((migration) => migration.id === "202610280001_cms_revision_history")) {
      await client.query(`
        INSERT INTO "${safeSchema}".cms_revisions
          (slug, version, snapshot, content_hash, action, published_at)
        SELECT slug, version, published, md5(published::text), 'baseline',
               COALESCE(published_at, updated_at, now())
        FROM "${safeSchema}".page_contents
        WHERE published IS NOT NULL
        ON CONFLICT (slug, version) DO NOTHING
      `);
    }
    // The server-side application role needs access to this isolated schema.
    // Browser roles deliberately receive no grants here.
    await client.query(`
      DO $schema_grants$
      BEGIN
        IF to_regrole('service_role') IS NOT NULL THEN
          EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role', '${safeSchema}');
          EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO service_role', '${safeSchema}');
          EXECUTE format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO service_role', '${safeSchema}');
        END IF;
      END
      $schema_grants$
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

async function runDatabaseMigrations(env = process.env) {
  if (!env.DATABASE_URL) throw new Error("Database migration configuration is missing");
  const schema = validateDatabaseSchema(env.DATABASE_SCHEMA);
  const cleanUrl = env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");
  console.log("[migration] Connecting to database...");
  console.log(`[migration] DATABASE_SCHEMA: ${schema}`);
  console.log(`[migration] DATABASE_SSL: ${env.DATABASE_SSL}`);
  console.log(`[migration] URL: ${cleanUrl.replace(/:[^:@]+@/, ":****@")}`);

  const client = new Client({
    connectionString: cleanUrl,
    options: `-c search_path=${schema}`,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30_000,
    family: 4,
  });
  try {
    await client.connect();
    const migrations = await loadDatabaseMigrations();
    await applyDatabaseMigrations({ client, migrations, schema, bootstrapFromPublic: true });
    console.log(`[migration] All migrations applied successfully to schema ${schema}`);
  } catch (error) {
    console.error(`[migration] FAILED: ${error.message}`);
    console.error(`[migration] Code: ${error.code}`);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isDirectExecution = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectExecution) {
  try {
    await runDatabaseMigrations();
    console.log("Database migration: ok");
  } catch {
    console.error("Database migration failed");
    process.exitCode = 1;
  }
}
