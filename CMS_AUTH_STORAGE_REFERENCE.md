# CMS Auth & Storage Reference

## CMS Authentication

### Session Cookie

```typescript
// lib/server/cmsSession.ts
const CMS_SESSION_COOKIE = "cms_session";

export function createCmsSessionToken(): string {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const sig = crypto.createHmac("sha256", getCmsSessionSecret()).update(nonce).digest("base64url");
  return `v1.${nonce}.${sig}`;
}

export function verifyCmsSessionToken(token: string): boolean {
  const [version, nonce, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", getCmsSessionSecret()).update(nonce).digest("base64url");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function getCmsSessionSecret(): string {
  const key = process.env.CMS_EDIT_KEY;
  if (key) return key;
  if (process.env.NODE_ENV === "development") return "dev";
  throw new Error("CMS_EDIT_KEY not set");
}

export function readCmsSessionCookie(request: NextRequest): string | null {
  return request.cookies.get(CMS_SESSION_COOKIE)?.value ?? null;
}
```

### Auth Guard

```typescript
// lib/server/cmsAuth.ts
export async function cmsAuthorized(request: NextRequest): Promise<boolean> {
  const cookie = readCmsSessionCookie(request);
  if (cookie && verifyCmsSessionToken(cookie)) return true;

  // Dev fallback: localhost + NODE_ENV=development + x-cms-key: dev header
  if (process.env.NODE_ENV === "development") {
    const host = request.headers.get("host") ?? "";
    const isLocalhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
    const devKey = request.headers.get("x-cms-key");
    if (isLocalhost && devKey === "dev") return true;
  }
  return false;
}
```

### Client Session API

```typescript
// lib/services/cms.service.ts
export const CmsService = {
  async login(key: string): Promise<void> {
    await fetch("/api/cms/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }).then(sessionResponse);
  },
  
  async logout(): Promise<void> {
    await fetch("/api/cms/session", { method: "DELETE" }).then(sessionResponse);
  },
  
  async getEntry(slug: string): Promise<PageContentEntry | null> {
    return fetch(`/api/cms/pages/${slug}`, { cache: "no-store" }).then(unwrap);
  },
  
  saveDraft(slug: string, draft: JsonObject): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft }),
    }).then(unwrap);
  },
  
  publish(slug: string): Promise<PageContentEntry> {
    return fetch(`/api/cms/pages/${slug}`, { method: "POST" }).then(unwrap);
  },
  
  discard(slug: string): Promise<PageContentEntry | null> {
    return fetch(`/api/cms/pages/${slug}`, { method: "DELETE" }).then(unwrap);
  },
};
```

## Content Store (3-Tier Persistence)

```typescript
// lib/server/contentStore.ts

export interface PageContentEntry {
  slug: string;
  draft: JsonObject | null;
  published: JsonObject | null;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}

// 3-tier cascade: pg → supabase → .cms-data/*.json
async function dbGetEntry(slug: string): Promise<PageContentEntry | null> {
  const pool = await getPool();  // pg.Pool from DATABASE_URL
  if (pool) {
    const result = await pool.query("SELECT ... FROM page_contents WHERE slug = $1", [slug]);
    return rowToEntry(result.rows[0]);
  }
  
  const supabase = createSupabaseDatabase();  // SUPABASE_URL + SUPABASE_SECRET_KEY
  if (!supabase) return null;
  return rowToEntry(await supabase.getPage(slug));
}

async function dbWriteEntry(entry: PageContentEntry): Promise<boolean> {
  const pool = await getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO page_contents (slug, draft, published, version, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (slug) DO UPDATE SET draft=EXCLUDED.draft, published=EXCLUDED.published, ...`,
      [entry.slug, entry.draft, entry.published, entry.version, entry.updatedAt, entry.publishedAt]
    );
    return true;
  }
  
  const supabase = createSupabaseDatabase();
  if (!supabase) return false;
  await supabase.putPage({ slug: entry.slug, draft: entry.draft, ... });
  return true;
}

export async function saveDraft(slug: string, draft: JsonObject): Promise<PageContentEntry> {
  const existing = await getEntry(slug);
  const entry = { slug, draft, published: existing?.published ?? null, version: existing?.version ?? 0, updatedAt: new Date().toISOString(), publishedAt: existing?.publishedAt ?? null };
  await writeEntry(entry);
  return entry;
}

export async function publish(slug: string): Promise<PageContentEntry | null> {
  const existing = await getEntry(slug);
  if (!existing?.draft) return existing;
  const entry = { ...existing, published: existing.draft, version: existing.version + 1, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await writeEntry(entry);
  return entry;
}

export async function discardDraft(slug: string): Promise<PageContentEntry | null> {
  const existing = await getEntry(slug);
  if (!existing) return null;
  const entry = { ...existing, draft: existing.published, updatedAt: new Date().toISOString() };
  await writeEntry(entry);
  return entry;
}

export async function getPublished(slug: string): Promise<JsonObject | null> {
  const entry = await getEntry(slug);
  return entry?.published ?? null;
}
```

### Database Schema

```sql
CREATE TABLE page_contents (
  slug TEXT PRIMARY KEY,
  draft JSONB,
  published JSONB,
  version INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

### File Fallback (`.cms-data/`)

```typescript
function fileFor(slug: string) {
  if (!SLUG_RE.test(slug)) throw new Error(`Invalid slug: ${slug}`);
  return path.join(DATA_DIR, `${slug}.json`);
}
```

## Asset Storage

```typescript
// lib/server/assetStorage.ts

export async function uploadAsset(input: { file: Buffer; filename: string; contentType: string }): Promise<{ url: string }> {
  const driver = process.env.ASSET_STORAGE_DRIVER ?? "local";
  
  if (driver === "local") {
    const filename = `${Date.now()}-${safeName(input.filename)}`;
    await fs.writeFile(path.join(PUBLIC_UPLOADS_DIR, filename), input.file);
    return { url: `/uploads/${filename}` };
  }
  
  if (driver === "supabase") {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
    const { data, error } = await supabase.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(filename, input.file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);
    return { url: publicUrl };
  }
  
  throw new Error(`Unsupported asset storage driver: ${driver}`);
}

// Magic-byte validation (client MIME never trusted)
export function inspectAsset(buffer: Buffer): { type: "image" | "video" | "unknown"; ext: string } | null {
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47
  // WebP: 52 49 46 46 .... 57 45 42 50
  // MP4: 00 00 00 18 66 74 79 70 69 73 6F 6D
  // WebM: 1A 45 DF A3
}

export function sanitizeSvg(content: string): string {
  // Strip <script>, on* handlers, javascript: URLs
  return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CMS_EDIT_KEY` | Yes (prod) | HMAC secret for session cookie |
| `DATABASE_URL` | No (falls back to Supabase) | Postgres connection string |
| `DATABASE_SSL` | With DATABASE_URL | `"true"` or `"false"` |
| `SUPABASE_URL` | If no DATABASE_URL | Supabase project URL |
| `SUPABASE_SECRET_KEY` | If no DATABASE_URL | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | If ASSET_STORAGE_DRIVER=supabase | Storage bucket name |
| `ASSET_STORAGE_DRIVER` | No (default: local) | `local` or `supabase` |
| `GMAIL_USER` / `GMAIL_PASSWORD` | For contact form | Nodemailer credentials |
| `NEXT_PUBLIC_SITE_URL` | For sitemap/robots | Canonical site URL |

## Deployment Validation

```bash
# check-deployment-env.mjs validates:
# - CMS_EDIT_KEY always required
# - ASSET_STORAGE_DRIVER in [local, supabase]
# - If DATABASE_URL set: DATABASE_SSL required, pg connectivity test
# - If no DATABASE_URL: SUPABASE_URL + SUPABASE_SECRET_KEY required
# - If ASSET_STORAGE_DRIVER=supabase: SUPABASE_STORAGE_BUCKET required
# Live connectivity test: pg SELECT 1 or Supabase REST /rest/v1/page_contents
```

## Key Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Secrets never `NEXT_PUBLIC_` | Code review + CI check |
| Server-only imports | `lib/server/**` never in client bundles |
| CMS mutations use cookie auth | `cms_session` httpOnly cookie |
| Asset MIME never trusted | Magic-byte sniff + SVG sanitize |
| Slug validation | `^[a-z0-9-]+$` regex |
| Draft ≠ Published | Two parallel doc stores |
| Autosave = draft only | Never writes published directly |