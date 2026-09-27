# lib/server — server-only data + auth

## OVERVIEW

Server-only modules: Postgres/Supabase persistence, CMS auth/session, asset storage. The boundary is **by file layout** (no `server-only` import guard) — never import these (as values) into `"use client"` code.

## MODULES

- `db.ts` — `pg.Pool` from `DATABASE_URL`; `DATABASE_SSL=true` opts into TLS; `ensureSchema()` creates `page_contents` + `leads`; `saveLead()`.
- `supabaseDatabase.ts` — fallback store (REST via `SUPABASE_URL` + `SUPABASE_SECRET_KEY`); returns `null` factory when keys absent.
- `contentStore.ts` — `getEntry/saveDraft/publish/discardDraft/getPublished`; 3-tier: pg → supabase → `.cms-data/<slug>.json`; slug regex `^[a-z0-9-]+$`.
- `getPageContent.ts` — read path: `deepMerge(fallback, published)` (objects recurse, arrays/primitives replaced) + `normalizeCmsDocument`. Swallows errors → fallback only.
- `assetStorage.ts` — `uploadAsset` driver switch: `local` (public/uploads) | `supabase` (`SUPABASE_STORAGE_BUCKET`, auto-creates public bucket).
- `cmsAuth.ts` — `cmsAuthorized`: HMAC cookie OR dev-localhost `x-cms-key: dev` header.
- `cmsSession.ts` — `cms_session` cookie `v1.<nonce>.<sig>` HMAC-SHA256; secret = `CMS_EDIT_KEY`.

## STORAGE CASCADE

`DATABASE_URL` (pg) → `SUPABASE_URL`+`SUPABASE_SECRET_KEY` (REST) → `.cms-data` file. `saveLead` never throws (returns `false` on failure).

## GOTCHAS

- Secrets read **only here**: `DATABASE_URL`, `CMS_EDIT_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, `ASSET_STORAGE_DRIVER` — never under `NEXT_PUBLIC_`.
- `cmsAuthorized` gates every CMS + asset mutation route.
- Dev fallback (`x-cms-key: dev`) only works on localhost + `NODE_ENV=development`.
- Colocated tests: `cmsAuth.test.ts`, `cmsSession.test.ts`, `assetStorage.test.ts`, `supabaseDatabase.test.ts`.
