# CMS Store Reference

## Module: `components/cms/store.ts`

The module-singleton CMS store using `useSyncExternalStore` for React 18+ concurrent features.

## State Structure

```typescript
interface CmsState {
  editing: boolean;           // Global edit mode flag
  loading: boolean;           // Loading drafts
  pageSlug: string;           // Current page slug
  docs: Record<string, JsonObject | null>;           // Draft documents
  publishedDocs: Record<string, JsonObject | null>;  // Published snapshots
  dirty: Record<string, boolean>;    // Per-doc dirty flags
  epoch: number;              // Incremented on viewMode/edit toggle
  saving: boolean;            // Autosave in progress
  authError: boolean;         // Auth failure on autosave
  validationErrors: CmsValidationError[];  // Pre-publish validation
  viewMode: "draft" | "published";  // View mode toggle
}
```

## Core Functions

### `useSection<T>(path, fallback, scope?)`
Returns live slice of document at `path` for current scope.

```typescript
export function useSection<T>(
  basePath: PathSegment[],
  fallback: T,
  scope: DocScope = "page"
): T {
  const slice = useSyncExternalStore(
    subscribe,
    () => {
      if (!state.editing) return null;
      const slug = slugForScope(scope);
      const doc = state.viewMode === "published"
        ? state.publishedDocs[slug]
        : state.docs[slug];
      if (!doc) return null;
      return (getAtPath(doc, basePath) ?? null) as T | null;
    },
    () => null
  );
  return slice ?? fallback;
}
```

### `setPath(path, value, scope?)`
Immutably sets value at JSON path, marks dirty, schedules autosave.

```typescript
export function setPath(
  path: PathSegment[],
  value: JsonValue,
  scope: DocScope = "page"
): void {
  const slug = slugForScope(scope);
  const doc = state.docs[slug];
  if (!doc) return;
  const changed = setAtPath(doc, path, value);
  const next = Array.isArray(value) ? normalizeCmsDocument(slug, changed) : changed;
  set({
    docs: { ...state.docs, [slug]: next },
    dirty: { ...state.dirty, [slug]: true },
    validationErrors: [],
  });
  scheduleSave(slug, next);
}
```

### `startEditing(pageSlug)` / `stopEditing()`
Lifecycle for edit mode. `startEditing` loads drafts for page + site + related docs.

### `publishDraft()` / `discardDraft()`
Publish = copy draft → published + `revalidatePath`. Discard = reload from published.

### `useCmsEditing()`
Returns `{ editing, epoch, ready }` for gating editor UI.

### `useCmsViewMode()` / `useCmsStatus()` / `useCmsValidationErrors()`
Selectors for view mode, combined status string, validation errors.

## Data Flow

```
User Edit → setPath() → set() → emit() → subscribers re-render
                          ↓
                    scheduleSave() → 1.2s debounce
                          ↓
                    CmsService.saveDraft() → PUT /api/cms/pages/[slug]
                          ↓
                    lib/api/cms/pages/[slug]/route.ts
                          ↓
                    lib/server/contentStore.saveDraft()
                          ↓
                    pg / supabase / .cms-data/*.json
```

## Key Invariants

1. **Draft ≠ Published** - Two parallel doc stores, `viewMode` toggles which is read
2. **Epoch forces remount** - Incremented on `viewMode`/`editing` toggle
3. **Autosave = draft only** - Never writes to published directly
4. **Validation = pre-publish gate** - Runs in `publishDraft()` only
4. **Normalization on load** - `normalizeCmsDocument` runs on every `getPageContent` call