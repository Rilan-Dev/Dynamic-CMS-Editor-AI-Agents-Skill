# CMS reference code instructions

These files are byte-for-byte copies of the pinned SMTS UAT CMS sources, tracked by ../SMTS_UAT_MANIFEST.json. Do not modify them in place to make the reference generic; adapt the code inside a target project or generate a separate portable wrapper.

Actual data flow: ?edit=1 lazy-loads CmsTools but only an authenticated server cookie unlocks data access. Inline E/EImg/EIcon and list controls update draft. A module external store tracks docs, publishedDocs, dirty state, version and draftRevision. Conditional draft autosave rejects stale writes. View modes: draft, preview, published. POST /api/cms/releases validates and publishes atomically; the old page POST returns 410. Versions and rollback use separate history APIs and DB SQL functions. ClickBlocker prevents normal link/form interactions during draft editing and exempts data-cms-ui and allowed portals.

Top-level docs: ../../IN_PAGE_EDITOR_INTEGRATION.md, ../../CMS_STORE_REFERENCE.md, ../../CMS_VERSIONING_ROLLBACK_REFERENCE.md and ../../THEME_MEDIA_WIDGETS_REFERENCE.md.

Validation: compare Git blob hashes against the manifest. Do not claim these snapshots are independently buildable without original @/ aliases, shadcn/Radix and site wiring. Never package company-specific fallback content or the editor key as a reusable default.
