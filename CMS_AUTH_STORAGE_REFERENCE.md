# CMS auth, data storage and media — pinned SMTS UAT

Prefer the real source code in reference/server, reference/api and reference/db/migrations; old inline examples and assumptions about basic POST publish are obsolete.

## Authentication and authorization

- reference/cms/CmsRoot.tsx uses ?edit=1/sessionStorage only to load the editing bundle. It does not authorize APIs.
- reference/api/cms/session/route.ts and reference/server/cmsSession.ts issue and verify an httpOnly browser-session cookie from a server-side CMS edit key; reference/server/cmsAuth.ts guards endpoints.
- The built-in editor-key model is a site-specific mechanism, not a reusable enterprise identity/RBAC/multi-tenancy solution. Adapt server-side access control, tenant isolation, CSRF policies, rate limiting and audit to the destination's identity provider.
- Never persist raw editor keys in the browser or expose secret keys in NEXT_PUBLIC or other client environment variables.
- Test denied GET of draft/history and denied save/publish/restore/upload, expired session behavior, invalid origins and cross-tenant access as applicable.

## Durable documents

- reference/server/contentStore.ts models slug, draft, published, version, draftRevision and timestamps. Reads support PostgreSQL (pg) or the Supabase client. A legacy .cms-data read fallback exists; mutation operations require configured database storage and reject stale preconditions. Do not promote file fallback to durable production writes.
- reference/server/db.ts manages PostgreSQL connections and environment rules; reference/server/supabaseDatabase.ts provides Supabase RPC methods for compare-and-swap drafts, releases, revision history and restore.
- reference/server/databaseSchema.ts configures the database schema; the same provider/settings should be used coherently throughout one deployment. Do not copy SMTS environment names into a different platform without documenting the mapping.
- reference/db/migrations/202609160001_lock_page_contents.sql, 202609280001_media_assets.sql and three 20261028 CMS revision/release/restore SQL migrations must be reviewed and applied in order using the target's migration tooling. Test grants, RLS, stored-procedure execution, schema history, backups and rollback before deployment.
- Versioned releases and restore use server-side SQL/RPC functions (cms_save_draft, cms_discard_draft, cms_publish_release, cms_restore_revision). Do not assemble a pseudo-transaction from unrelated browser writes.

## Assets and media

- reference/api/assets/route.ts and validation.ts inspect uploads rather than trusting filename or MIME declarations. reference/server/assetStorage.ts supports local or Supabase storage and a database-backed fallback on some storage refusal paths. Preview uses a UAT object prefix in the shared bucket; customize environment and tenant partitioning for each destination.
- reference/server/mediaStore.ts and reference/api/media/[name]/route.ts serve database media with safe type/headers; test malicious SVG, XSS, size limits, upload auth, signed/private media policy, storage permissions, orphan cleanup and rollback interactions.
- No actual SMTS brand images or real production storage credentials are required to migrate the CMS reference. Copy only needed target media through an approved content migration.

## Verification

Test authenticated/unauthenticated access, stale draft revision, invalid/oversized asset, storage refusal, failed RPC and transaction rollback, cache revalidation, history/restore, non-durable environment and backup recovery. Existence of these modules is NOT evidence of an authenticated live browser test or production approval.
