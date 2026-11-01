# SMTS source audit and verification status

Reference source: urbanNexusTech/smtswebsite, UAT branch, commit efcfa632cf9ba6e36c476a2a6ca3b589b942db14 (inspected 2026-11-01).
Skill source branch: sync/smts-uat-cms-parity-2026-11-01.
The source selection is tracked in reference/SMTS_UAT_MANIFEST.json.

## Verified by GitHub source inspection

- 288 selected file paths in the skill reference tree have the exact same Git blob SHA as the pinned SMTS UAT source (including CMS UI, content and widget examples, relevant route handlers, server storage, theme/animation and migrations).
- UAT uses three view modes: draft, preview and published. ClickBlocker prevents ordinary interactions during active draft editing while permitting CMS controls.
- CMS saves accept expectedVersion and expectedDraftRevision; release publishing uses POST /api/cms/releases, not the old single-page POST route (which returns 410). Restoration uses expected revisions and an immutable server-side version.
- The editor toolbar includes History, Theme, Issues and structured edit affordances. History has compare, preview and restore-to-draft/restore-and-publish; theme uses per-mode palette/font controls.
- SQL migrations for history, atomic release and restoration, plus the server/Supabase handlers, are present in source.
- The reference is a snapshot with site-specific content and Next.js dependencies, not an independently built npm package.

## Not yet verified

- Target build/runtime tests of the copied reference as a standalone library (it is not currently packaged to build independently).
- Authenticated browser/micro-interaction tests, keyboard/mobile/visual parity, upload attempts, actual Supabase/Postgres transaction execution, deployed application and full end-to-end rollback in another environment.
- Security penetration tests, tenant isolation, permissions/RBAC and operational backup restoration in a new website.
- Whether the currently deployed SMTS production environment exactly matches UAT branch; UAT is the user's specified canonical source for synchronization.

## Audit outcome

Source parity: verified at the pinned commit for the 288 selected files; CI will validate Git blob checksums. This DOES NOT certify portable production operation. Feature portability and target deployment: unverified until the migration acceptance contract passes. New UAT commits must trigger a fresh review and source manifest update, not blind automated merge.
