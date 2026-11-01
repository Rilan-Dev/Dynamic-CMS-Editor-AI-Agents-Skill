import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// A plain stub rather than vi.fn(): Vitest reports a rejecting vi.fn()
// implementation as a test failure even when the caller handles it.
let read: (name: string) => Promise<unknown> = async () => null;
vi.mock("@/lib/server/mediaStore", () => ({
  readMediaAsset: (name: string) => read(name),
}));

const call = (name: string) =>
  GET(new Request(`http://x/media/${name}`), { params: Promise.resolve({ name }) });

describe("GET /media/[name]", () => {
  it("serves the stored bytes as an immutable, locked-down response", async () => {
    read = async () => ({ contentType: "image/png", bytes: Buffer.from("png") });
    const response = await call("1-photo.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("cache-control")).toContain("s-maxage=31536000");
    expect(response.headers.get("content-security-policy")).toMatch(/^sandbox/);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("png");
  });

  it("404s an unknown file without caching it for long", async () => {
    read = async () => null;
    const response = await call("1-missing.png");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("never caches a database failure", async () => {
    read = () => Promise.reject(new Error("down"));
    const response = await call("1-photo.png");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
