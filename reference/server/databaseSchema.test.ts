import { describe, expect, it } from "vitest";
import { getDatabaseSchema, quoteDatabaseSchema } from "./databaseSchema";

describe("getDatabaseSchema", () => {
  it("requires an explicit schema", () => {
    expect(() => getDatabaseSchema({})).toThrow(/DATABASE_SCHEMA must be configured/);
  });

  it("validates PostgreSQL schema identifiers", () => {
    expect(getDatabaseSchema({ DATABASE_SCHEMA: "smts_uat" })).toBe("smts_uat");
    expect(() => getDatabaseSchema({ DATABASE_SCHEMA: "smts-uat" })).toThrow(/lowercase PostgreSQL identifier/);
  });

  it("requires the production schema on production deployments", () => {
    expect(getDatabaseSchema({
      VERCEL_ENV: "production",
      DATABASE_SCHEMA: "smts_prod",
    })).toBe("smts_prod");

    expect(() => getDatabaseSchema({
      VERCEL_ENV: "production",
      DATABASE_SCHEMA: "smts_uat",
    })).toThrow(/Production deployments must use DATABASE_SCHEMA=smts_prod/);
  });

  it("prevents preview deployments from selecting production data", () => {
    expect(getDatabaseSchema({
      VERCEL_ENV: "preview",
      DATABASE_SCHEMA: "smts_uat",
    })).toBe("smts_uat");

    expect(() => getDatabaseSchema({
      VERCEL_ENV: "preview",
      DATABASE_SCHEMA: "smts_prod",
    })).toThrow(/Preview deployments must not use the production database schema/);
  });
});

describe("quoteDatabaseSchema", () => {
  it("quotes valid schema identifiers", () => {
    expect(quoteDatabaseSchema("smts_uat")).toBe('"smts_uat"');
  });

  it("rejects invalid identifiers", () => {
    expect(() => quoteDatabaseSchema("smts;drop")).toThrow(/Invalid database schema identifier/);
  });
});
