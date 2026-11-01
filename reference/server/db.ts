import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";
import { getDatabaseSchema } from "@/lib/server/databaseSchema";
import type { LeadInput } from "@/lib/schemas";

const connectionString = process.env.DATABASE_URL;
/** Small on purpose — see the pool options below. */
export const MAX_POOL_CLIENTS = 3;
let pool: any = null;
let schemaReady: Promise<void> | null = null;

async function getPoolInstance(): Promise<any> {
  if (pool) return pool;
  if (!connectionString) return null;

  const { Pool } = await import("pg");
  const schema = getDatabaseSchema();
  pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: MAX_POOL_CLIENTS,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = runSchemaSetup().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function runSchemaSetup() {
  const db = await getPoolInstance();
  if (!db) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS page_contents (
      slug TEXT PRIMARY KEY,
      draft JSONB,
      published JSONB,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    )
  `);
}

export async function query<T = any>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const db = await getPoolInstance();
  if (!db) {
    throw new Error(
      "Postgres is not configured. Set DATABASE_URL to enable DB storage.",
    );
  }
  const result = await db.query(sql, params);
  return result.rows as unknown as T;
}

export async function getPool(): Promise<any | null> {
  const db = await getPoolInstance();
  if (!db) return null;
  await ensureSchema();
  return db;
}

export async function saveLead(lead: LeadInput): Promise<boolean> {
  try {
    const db = await getPool();
    if (db) {
      await db.query(
        `INSERT INTO leads
           (name, email, phone, message, service, source, source_page)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          lead.name,
          lead.email,
          lead.phone ?? null,
          lead.message,
          lead.service,
          lead.source,
          lead.sourcePage,
        ],
      );
      return true;
    }

    const supabase = createSupabaseDatabase();
    if (!supabase) return false;
    await supabase.insertLead({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? null,
      message: lead.message,
      service: lead.service,
      source: lead.source,
      source_page: lead.sourcePage,
    });
    return true;
  } catch (e) {
    console.error("[saveLead] failed:", (e as Error).message);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
}
