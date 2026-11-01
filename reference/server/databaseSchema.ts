const SCHEMA_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

/** Resolve a schema only from server-side deployment configuration. */
export function getDatabaseSchema(env: Record<string, string | undefined> = process.env): string {
  const schema = env.DATABASE_SCHEMA?.trim();
  if (!schema) {
    throw new Error("DATABASE_SCHEMA must be configured for the selected environment");
  }
  if (!SCHEMA_IDENTIFIER.test(schema)) {
    throw new Error("DATABASE_SCHEMA must be a lowercase PostgreSQL identifier (1-63 characters)");
  }

  // Fail closed rather than allowing a mis-scoped Vercel variable to route
  // production traffic into UAT, or preview traffic into production data.
  if (env.VERCEL_ENV === "production" && schema !== "smts_prod") {
    throw new Error("Production deployments must use DATABASE_SCHEMA=smts_prod");
  }
  if (env.VERCEL_ENV === "preview" && schema === "smts_prod") {
    throw new Error("Preview deployments must not use the production database schema");
  }

  return schema;
}

export function quoteDatabaseSchema(schema: string): string {
  if (!SCHEMA_IDENTIFIER.test(schema)) {
    throw new Error("Invalid database schema identifier");
  }
  return `"${schema}"`;
}
