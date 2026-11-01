import { afterEach, describe, expect, it, vi } from "vitest";

const { PoolCtor, queryMock } = vi.hoisted(() => ({
  PoolCtor: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: class {
    query = queryMock;
    constructor(options: Record<string, unknown>) {
      PoolCtor(options);
    }
  },
}));

afterEach(() => {
  vi.resetModules();
  PoolCtor.mockClear();
  queryMock.mockClear();
});

async function loadDb() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pw@db.pooler.supabase.com:5432/postgres");
  queryMock.mockResolvedValue({ rows: [] });
  return import("./db");
}

describe("database pool sizing", () => {
  it("caps clients well below the session-mode pooler limit", async () => {
    // Supabase session mode allows 15 clients for the whole project, and
    // node-postgres defaults to 10 per pool — one build or a few serverless
    // instances would exhaust it with EMAXCONNSESSION.
    const { getPool, MAX_POOL_CLIENTS } = await loadDb();
    await getPool();

    expect(MAX_POOL_CLIENTS).toBeLessThanOrEqual(5);
    expect(PoolCtor).toHaveBeenCalledTimes(1);
    expect(PoolCtor.mock.calls[0][0]).toMatchObject({
      max: MAX_POOL_CLIENTS,
      idleTimeoutMillis: expect.any(Number),
    });
  });

  it("reuses one pool rather than opening another per call", async () => {
    const { getPool } = await loadDb();
    await getPool();
    await getPool();
    await getPool();

    expect(PoolCtor).toHaveBeenCalledTimes(1);
  });

  it("creates the table once per process, not on every request", async () => {
    const { getPool } = await loadDb();
    await getPool();
    await getPool();
    await getPool();

    const createCalls = queryMock.mock.calls.filter((call) =>
      String(call[0]).includes("CREATE TABLE IF NOT EXISTS page_contents"),
    );
    expect(createCalls).toHaveLength(1);
  });

  it("retries schema setup after a failure instead of caching the error", async () => {
    const { getPool } = await loadDb();
    queryMock.mockRejectedValueOnce(new Error("connection lost"));

    await expect(getPool()).rejects.toThrow("connection lost");
    await expect(getPool()).resolves.toBeTruthy();
  });
});
