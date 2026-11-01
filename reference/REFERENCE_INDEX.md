# Reference source index — SMTS UAT pinned snapshot

The selected reference source files are Git blob-exact snapshots of urbanNexusTech/smtswebsite UAT efcfa632cf9ba6e36c476a2a6ca3b589b942db14. The machine-readable mapping and checksums live in SMTS_UAT_MANIFEST.json. The reference tree deliberately keeps examples under reference/ rather than making this repository a silently deployable site.

| Reference folder | Original UAT folder | Role |
|---|---|---|
| cms/ | components/cms/ | inline primitives, editor toolbar, version history, issues, theme, click blocking, draft store |
| animations/ and animation-editor/ | components/animations/ and components/animation-editor/ | animation runtime/authoring |
| api/ | lib/api/ | actual server logic for authenticated CMS, history, release, assets, media |
| app/ | app/ | Next.js thin route shells and layout examples |
| server/ | lib/server/ | CMS auth, durable storage, Supabase, history, release, restore, media |
| services/ | lib/services/ | client CMS service |
| theme/ and theme-utils/ | components/theme/ and lib/theme/ | palette, font tokens, contrast, dynamic style |
| site-theme-wiring/ | components/ThemeToggle and theme-provider | Next.js theme wiring example |
| db/migrations/ and db/scripts/ | db/migrations/ and scripts/ | schema/RPC migrations and integration tests |
| widget-examples/ | components/blog, footer, projects, updates | feature and screen integration examples |
| pages/ and content/ | components/pages/ and content/ | SMTS-specific page and typed content examples |
| site-styles/ | styles and configuration files | example CSS/theme/build dependencies |

Start with ../SKILL.md, ../IN_PAGE_EDITOR_INTEGRATION.md, ../CMS_STORE_REFERENCE.md, ../CMS_VERSIONING_ROLLBACK_REFERENCE.md, ../THEME_MEDIA_WIDGETS_REFERENCE.md and ../CMS_AUTH_STORAGE_REFERENCE.md.

## IMPORTANT dependency boundaries

The reference files are NOT a self-contained runnable application: UAT uses @/ path aliases, a Next.js App Router app, React, UI components under the original components/ui, route-specific content and SEO, dynamic data models, CSS assets, dependencies from site-styles/package.json and PostgreSQL/Supabase migrations. Its pages refer to site-specific modules outside the reference selection, and assets in public/ were deliberately not copied. Do not claim an npm build or cross-framework drop-in. Copy or replace those imports only after auditing the target and preserving visual parity. Build the target in its own repository and test real DB/browser behavior.

## Source-update policy

Run node scripts/check-source-parity.mjs to verify all included source SHA-1 Git blobs, and node scripts/check-source-parity.mjs --remote to compare the pinned source head with current UAT. A changed source must lead to a reviewed synchronization PR and tests, not silent replacement of target behavior. Browser/media/SQL/production checks remain separate acceptance gates.
