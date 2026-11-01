# Versioned CMS releases, immutable history and rollback

Pinned source: urbanNexusTech/smtswebsite UAT efcfa632cf9ba6e36c476a2a6ca3b589b942db14.

## UI and API flow

1. Editing is inside GlobalEditToolbar and inline primitives. The mode switch offers Edit (draft), Drafts (preview) and Live (published).
2. Each editable document has a published version and independent draftRevision. Autosave PUT /api/cms/pages/[slug] sends both expectedVersion and expectedDraftRevision and must fail with 409 on a stale update.
3. Publishing goes through POST /api/cms/releases, which checks document preconditions, validates all supplied documents, uses cms_publish_release and revalidates affected routes. A release can group multiple documents; inspect shared-site dependency implications.
4. Version history is opened from the same toolbar. CmsVersionHistoryPanel loads page or shared site versions with keyset pagination; the history APIs are authenticated and cache-disabled. CmsHistoryCompareRestore uses historical and current snapshots for diff and preview.
5. Restore can select draft or publish. POST /api/cms/history/[slug]/[version]/restore requires a UUID requestId, expectedVersion and expectedDraftRevision and validates a server-reloaded historical snapshot. 409 indicates another editor changed state.
6. Restore-to-draft does NOT alter the live website. Restore-and-publish creates a new version and preserves all older versions; reverse-rollback is a later new restore, not deletion of evidence.

## Reference map

- UI: reference/cms/CmsVersionHistoryPanel.tsx, CmsHistoryCompareRestore.tsx, cmsHistoryDiff.ts, cmsHistoryPreview.ts, GlobalEditToolbar.tsx.
- Client: reference/services/cms.service.ts, reference/cms/store.ts.
- Routes: reference/api/cms/history, reference/api/cms/releases/route.ts and reference/app/api/cms.
- Server: reference/server/cmsHistory.ts, cmsRestore.ts, cmsRelease.ts, cmsReleaseValidation.ts, cmsRevalidation.ts.
- SQL: reference/db/migrations/202610280001_cms_revision_history.sql, 202610280002_cms_release_functions.sql, 202610280003_cms_restore_revision.sql.
- Source tests: reference/db/scripts/cms-release-integration.test.ts and cms-revision-migration.test.ts, plus CMS history/restore/release route and UI tests.

## Failure and recovery scenarios

No silently overwritten draft, no restore of a browser-supplied JSON snapshot, no pre-migration historical versions invented, no disappearance of earlier versions, no partial multi-document release, no cache-inconsistent live view, and no background publish after a save conflict. Verify two editors, network interruptions, invalid schema, related content dependencies, missing media and restore of a previous rollback in the target environment. Confirm that backups and database migrations are independently recoverable.

The pinned SMTS UAT code is a REFERENCE, not a guarantee that another tenant/framework/database is correctly configured. SQL and authorization must be tested in the target's environment.
