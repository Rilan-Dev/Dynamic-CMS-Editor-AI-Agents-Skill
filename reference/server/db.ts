import { createSupabaseDatabase } from "@/lib/server/supabaseDatabase";

const connectionString = process.env.DATABASE_URL;
let pool: any = null;

async function getPoolInstance(): Promise<any> {
  if (pool) return pool;
  if (!connectionString) return null;

  const { Pool } = await import("pg");
  pool = new Pool({
    connectionString,
    // SSL is opt-in via DATABASE_SSL=true (managed providers like
    // Supabase). A self-hosted / local Postgres has no TLS, so gating
    // on NODE_ENV would wrongly force SSL and break the connection.
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return pool;
}

async function ensureSchema() {
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
  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      source TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
  source?: string;
}

/** Persist a contact-form lead. Returns false (never throws) if the DB
 *  is not configured, so email delivery is never blocked by storage. */
export async function saveLead(lead: LeadInput): Promise<boolean> {
  try {
    const db = await getPool();
    if (db) {
      await db.query(
        `INSERT INTO leads (name, email, phone, message, source)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          lead.name,
          lead.email,
          lead.phone ?? null,
          lead.message,
          lead.source ?? "contact-form",
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
      source: lead.source ?? "contact-form",
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
