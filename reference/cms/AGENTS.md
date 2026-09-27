# components/cms — Inline CMS

## OVERVIEW

In-place content editing. Pages render typed defaults from `content/registry.ts`; authorized editors unlock via `?edit=1`, edit inline, autosave drafts, and publish. No separate admin UI.

## DATA FLOW

```
server render → getPageContent (published) → <E path value> primitives (zero-overhead in view mode)
?edit=1 → CmsRoot lazy-loads CmsTools (code-split) → startEditing(slug) loads page+site+services docs
edit → setPath (immutable json.ts) → dirty → 1.2s debounced autosave → PUT draft
publish → validateCmsDocuments → POST publish → revalidatePath
```

## KEY MODULES

- `store.ts` — module-singleton state (`useSyncExternalStore`): `docs` + `publishedDocs` + `dirty` + `viewMode`; debounced autosave to server + `localStorage`.
- `editable.tsx` — inline primitives `<E>` (contentEditable), `<EImg>`, `<EIcon>`, `<ERemove>`/`<EAdd>`. View mode renders server markup untouched.
- `json.ts` — `JsonObject`, `PathSegment[]`, immutable `getAtPath`/`setAtPath`.
- `documentNormalization.ts` — `normalizeCmsDocument`: FNV-1a stable IDs, social/service/job shape migrations. **Every write path runs through it.**
- `documentValidation.ts` — `validateCmsDocuments`: pure, pre-publish gate; emits `{code, path, message}`.
- `CmsRoot.tsx` / `CmsTools.tsx` — code-split entry (`?edit=1` gate, `sessionStorage` unlock flag).
- `GlobalEditToolbar.tsx` / `AdvancedEditorPanel.tsx` / `DynamicFieldEditor.tsx` — editor chrome (dock, sheet, JSON-path field editor).
- `animation/` — `SmtsAnimationEditorAdapter` + `scopePaths` (bridge animation-editor ↔ CMS docs).

## DRAFT vs PUBLISH

- Drafts mutable in store; `publishedDocs` is an immutable snapshot loaded at `startEditing`.
- `viewMode: "draft" | "published"` flips render; `epoch` counter forces primitive remount.
- Autosave targets **draft only**. Publish = copy draft→published + `revalidatePath`. Discard = reload from `publishedDocs`/fallback.
- Validation blocks **publish only**, never draft edits.

## AUTH

`POST /api/cms/session` → `cmsKeyMatches` (timing-safe HMAC) → httpOnly `cms_session` cookie (`v1.<nonce>.<sig>`). All mutations guarded by `cmsAuthorized` (`lib/server/cmsAuth.ts`). Dev-only escape: `x-cms-key: dev` header on localhost + `NODE_ENV=development`.

## CONVENTIONS / GOTCHAS

- Two scopes: `"page"` (current slug) + `"site"` (`SITE_SLUG` shared chrome — navbar/footer). Related docs (`services`) preloaded for cross-page editing.
- Paths are `PathSegment[]`; list items keyed by stable `cmsId` for dnd-kit.
- Editor bundle is code-split — regular visitors never download it.
- Tests: behavioral unit + source-inspection (grep source for required exports).
