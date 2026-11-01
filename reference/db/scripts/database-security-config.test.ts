import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "db/migrations/202608010001_secure_leads.sql",
  ),
  "utf8",
).replace(/\s+/g, " ");
const dockerfile = readFileSync(
  resolve(repositoryRoot, "Dockerfile"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
);

describe("lead storage security deployment contract", () => {
  it("ships an idempotent RLS migration with browser-role revokes", () => {
    expect(migration).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.leads/i,
    );
    expect(migration).toMatch(
      /ALTER TABLE public\.leads ENABLE ROW LEVEL SECURITY/i,
    );
    expect(migration).toMatch(
      /REVOKE ALL PRIVILEGES ON TABLE public\.leads FROM PUBLIC/i,
    );
    expect(migration).toMatch(/to_regrole\('anon'\)/i);
    expect(migration).toMatch(/to_regrole\('authenticated'\)/i);
    expect(migration).toMatch(
      /GRANT INSERT ON TABLE public\.leads TO service_role/i,
    );
    expect(migration).toMatch(
      /CREATE OR REPLACE VIEW public\.smts_leads_security_status/i,
    );
  });

  it("exposes reusable migration and security-preflight commands", () => {
    expect(packageJson.scripts["db:migrate"]).toBe(
      "node scripts/apply-database-migrations.mjs",
    );
    expect(packageJson.scripts["check:lead-storage-security"]).toBe(
      "node scripts/check-lead-storage-security.mjs",
    );
  });

  it("gates the production container before starting Next.js", () => {
    expect(dockerfile).toContain(
      'CMD ["sh", "-c", "npm run db:migrate && npm run check:lead-storage-security && exec npm start"]',
    );
  });
});

describe("page contents security migration", () => {
  const lockdown = readFileSync(
    resolve(
      repositoryRoot,
      "db/migrations/202609160001_lock_page_contents.sql",
    ),
    "utf8",
  ).replace(/\s+/g, " ");

  it("creates the table itself so the app never creates it wide open", () => {
    expect(lockdown).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.page_contents/i,
    );
  });

  it("enables RLS and strips browser-role privileges", () => {
    expect(lockdown).toMatch(
      /ALTER TABLE public\.page_contents ENABLE ROW LEVEL SECURITY/i,
    );
    expect(lockdown).toMatch(
      /REVOKE ALL PRIVILEGES ON TABLE public\.page_contents FROM PUBLIC/i,
    );
    expect(lockdown).toMatch(/to_regrole\('anon'\)/i);
    expect(lockdown).toMatch(/to_regrole\('authenticated'\)/i);
  });

  it("declares an explicit deny policy for every command", () => {
    for (const command of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(lockdown).toMatch(
        new RegExp(
          `CREATE POLICY page_contents_deny_${command.toLowerCase()} ON public\\.page_contents AS RESTRICTIVE FOR ${command}`,
          "i",
        ),
      );
    }
  });

  it("never grants a permissive policy to browser roles", () => {
    expect(lockdown).not.toMatch(/AS PERMISSIVE/i);
    expect(lockdown).not.toMatch(/USING \(true\)/i);
    expect(lockdown).not.toMatch(/WITH CHECK \(true\)/i);
  });

  it("is safe to re-run, because the runner applies every file each time", () => {
    for (const command of ["select", "insert", "update", "delete"]) {
      expect(lockdown).toMatch(
        new RegExp(
          `DROP POLICY IF EXISTS page_contents_deny_${command} ON public\\.page_contents`,
          "i",
        ),
      );
    }
  });
});
