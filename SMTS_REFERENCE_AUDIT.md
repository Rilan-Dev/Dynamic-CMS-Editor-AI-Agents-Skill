# SMTS reference verification (partial)
Reference repository: urbanNexusTech/smtswebsite (private), default branch main. Read-only inspection only; do not alter the website.

## Verified from source inspection
- package.json declares Next.js build/dev commands, Vitest test command, and database migration scripts.
- content/registry.ts contains CONTENT_REGISTRY with shared site navigation, footer and home content.
- components/cms/store.ts uses a client-side React store and document normalization/validation imports.
- lib/server/contentStore.ts declares draft, published, version and draftRevision entry fields and references Postgres/Supabase and local file paths.

## Not yet verified
Actual end-to-end draft/publish and version rollback; permission checks; database transaction semantics; visual parity across routes; production fallback policy; CI status. These require deeper inspection and runtime tests. Do not treat examples in SKILL.md as evidence of passing acceptance.
