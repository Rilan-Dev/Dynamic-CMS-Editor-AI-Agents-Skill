# CMS store and view mode — pinned SMTS UAT

Source: reference/cms/store.ts, reference/cms/editable.tsx, reference/services/cms.service.ts. Always read the current code rather than reusing obsolete snippets.

The React external store holds current pageSlug, docs (editable drafts), publishedDocs (published snapshots), per-document versions (version and draftRevision), dirty state, saving/loading/publishing, validation and save errors, viewMode and epoch. Main document scopes: page, site, and doc:<slug>. SMTS-specific routing and related docs include services, blogs and projects; replace those conventions when installing elsewhere.

viewMode is exactly draft | preview | published. Draft loads and renders draft content with edit affordances; preview uses draft content read-only while navigation works; published renders the published snapshot read-only. A view switch does not publish or overwrite a draft.

setPath applies JSON-path changes and schedules a local draft cache plus server-side debounced autosave. queueSave serializes writes and sends BOTH expectedVersion and expectedDraftRevision, preventing stale tabs from overwriting another editor. Local storage is recovery-only and is never authoritative server content. A conflict blocks blind auto-overwrite and preserves the local copy for review.

The versioned publish operation uses CmsService.publishRelease -> POST /api/cms/releases, with document validation, version preconditions, durable storage and revalidation. Do not call the old POST /api/cms/pages/[slug] as a shortcut: the pinned implementation returns 410. Discard uses conditional preconditions. prepareCmsRestoration flushes pending saves and verifies no unresolved conflict before restore; applyRestoredCmsRevision adopts the server response and resets the selected document to draft mode.

Source checks: reference/cms/storeRevision.test.ts, storeDocScope.test.ts, storeAuthLoad.test.ts, cmsViewMode.test.ts, reference/api/cms/pages/[slug]/route.test.ts, reference/db/scripts/cms-release-integration.test.ts.

Migration rule: create an adapter for the TARGET project's dynamic routes, related documents, fallback data and model lifecycle. Never treat SMTS's slug/name logic, marketing content or localStorage key conventions as universal.
