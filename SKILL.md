---
name: dynamic-cms-generator
description: Implement or migrate an in-page dynamic CMS in an existing website while preserving its rendered UI, with inline editing, drafts, preview/live modes, versioned publishing, history and rollback, themes, assets, widgets, and optional Supabase persistence.
---

# Dynamic CMS Generator — current UAT reference

Canonical inspected implementation: urbanNexusTech/smtswebsite, branch UAT, commit efcfa632cf9ba6e36c476a2a6ca3b589b942db14. This is a pinned source snapshot, not a claim that a deployed production instance was tested. See reference/SMTS_UAT_MANIFEST.json and SMTS_REFERENCE_AUDIT.md.

## Mandatory reading order

1. WEBSITE_MIGRATION_PLAYBOOK.md and MIGRATION_ACCEPTANCE_CONTRACT.md: preserve the target's existing design, framework, routes, assets, responsiveness, and runtime behavior.
2. IN_PAGE_EDITOR_INTEGRATION.md: actual same-screen editing and click-isolation behavior.
3. CMS_STORE_REFERENCE.md and CMS_VERSIONING_ROLLBACK_REFERENCE.md: draft lifecycle, compare, history, release and restore.
4. THEME_MEDIA_WIDGETS_REFERENCE.md and CMS_AUTH_STORAGE_REFERENCE.md: theme, content widgets, media, auth, database.
5. reference/REFERENCE_INDEX.md and relevant framework adapter in frameworks/: map current source paths and dependencies.

These documents replace outdated procedural descriptions from older snapshots. All feature claims below refer to code present at the pinned UAT commit; do not infer deployment or universal portability from source parity alone.

## Work order for an agent

1. Inspect the TARGET repository first. Identify rendering framework, site routes, actual content models, UI components, theme system, media store, forms, auth, deployment, data migration state, and tests. Do not assume SMTS, Next.js, Supabase, static industry content, or an existing admin area.
2. Inventory all visible page regions and editable content: headers, text, rich content, links, buttons, SVG/icons, media, galleries, navigation, footer, blog, projects, service cards, updates, animations, SEO, theme typography/colors, repeatable sections, ordering and visibility. Record original source and CMS path in a coverage matrix.
3. Keep the SAME live website DOM, styling, accessibility semantics, mobile layout, behavior, navigation and animations. Add inline affordances only in an authorized edit session. Do not create a replacement admin screen. Use existing component adapters rather than copying SMTS branding or page copy.
4. Establish secure server-only persistence and a typed content schema with stable IDs. Define published and draft documents, version and draftRevision; reject stale conditional writes. Set up migrations and backups before enabling writes. Never treat ephemeral files or browser localStorage as durable production storage.
5. Integrate editing through the actual page. Keep normal visitor interactions functional, and block normal navigation/forms while active editing, without blocking CMS chrome or contentEditable controls. The current UAT ClickBlocker uses capture-phase handlers and data-cms-ui exemptions; customize and test against the target DOM.
6. Implement the three view states: draft (editable), preview (unpublished content read-only; navigation works), published (live read-only). Switching view state must not publish, mutate or discard drafts.
7. Support validation and conditional save, atomic versioned publishing through release API, paginated immutable history, diff/preview, restore-to-draft and restore-and-publish with stale-version rejection. A rollback creates a NEW version. Never use the legacy POST /api/cms/pages/[slug] for publish: UAT intentionally returns 410.
8. Implement editable site theme in both light/dark variants, palettes, fonts and contrast checks; safe images, icons, SVG/video, upload validation and durable storage; portable blog/project/services/updates/footer widgets as applicable. Validate target-specific responsive tokens.
9. Build, test and verify in a real authenticated browser at desktop/tablet/mobile, across themes, draft/preview/live and ordinary visitor states. Test wrong permissions, conflicts, simultaneous editors, failed persistence, invalid media, history/restore/reverse-restore, migration rollback, cache revalidation, and SEO.
10. Present results with source commit, change list, tests actually run, screenshot comparisons, remaining limits and deployment status. Do not call code that merely exists in GitHub production-verified.

## Reference paths for Next.js/React adaptations

- reference/cms: CmsRoot, CmsTools, editable primitives, ClickBlocker, GlobalEditToolbar, DynamicFieldEditor, panels and store.
- reference/cms/CmsVersionHistoryPanel.tsx and CmsHistoryCompareRestore.tsx: paginated history, preview, diff, safe restore UX.
- reference/server: contentStore, cmsHistory, cmsRelease, cmsRestore, cmsRevalidation, cmsSession, supabaseDatabase, assetStorage and mediaStore.
- reference/api/cms and reference/app/api/cms: server route logic and thin Next.js route re-exports.
- reference/db/migrations: CMS schema, media, revision history and SQL transaction functions.
- reference/theme, reference/theme-utils and reference/site-theme-wiring: theme editor controls, dynamic CSS, tokens, light/dark and fonts.
- reference/widget-examples, reference/pages and reference/content: SMTS-specific examples. Replace business copy, slugs, static defaults, logos and domain assumptions for other websites.
- reference/animation-editor and reference/animations: animation authoring and playback reference.

## Essential mode and interaction contract

- Unlock with ?edit=1 only makes the editor bundle available in the browser. It does NOT authenticate or authorize. The server must verify session/cookie and permissions for all draft/history/upload/restore/release operations.
- draft: content editable and click blocker active; normal page links/actions should not fire. All editor chrome and portalled CMS widgets must remain accessible.
- preview: draft content rendered without edit controls; page navigation/buttons behave normally.
- published: last published content rendered read-only; no draft leakage; navigation works.
- Stop editing/logout: ordinary visitor behavior returns; changes remain drafts unless explicitly published.
- Prefer editing selected elements and assets in the exact on-page context. The UAT example still uses some dialogs (login, field schema changes, discard and dangerous restore confirmations); these are not evidence of a completely dialog-free product. Do not add routine text-editing popups or redundant forms; retain explicit confirmation for destructive operations.

## Data and security rules

- Save draft with expectedVersion and expectedDraftRevision; treat HTTP 409 as conflict, not retry-as-overwrite.
- Validate both documents and shared cross-page dependencies before release.
- The release path POST /api/cms/releases coordinates transactional publication, immutable history and cache revalidation. It is NOT equivalent to setting published= draft from the browser.
- Historical restoration reloads the selected immutable snapshot on the server; browser-provided snapshots are not trusted.
- The UAT implementation is NOT a universal RBAC/multi-tenant package. Design tenant boundaries, identity, audit, authorization, CSRF/XSS and storage isolation for each target.
- Keep credentials server-side. Do not publish secrets, copied environment files, production records or company assets as generic templates. Do not run migrations or deploy to production without appropriate approval.

## Portability and validation

Source references are exact snapshots but NOT a standalone installable npm package and not automatically framework-independent. Next.js route handlers, aliases, shadcn/Radix controls, dnd-kit, React 19, Tailwind classes, pg and Supabase drivers must be adapted to the target. Use the frameworks/ guidance and the dependency inventory in reference/site-styles/package.json. Source parity is checked using the Git blob hashes pinned in the manifest. Run node scripts/check-source-parity.mjs locally and with --remote to detect a newer UAT head; follow WEBSITE_MIGRATION_PLAYBOOK.md acceptance gates. Keep this skill on its own feature branch until validated, then merge via PR.
