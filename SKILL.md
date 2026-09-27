---
name: dynamic-cms-generator
description: Use when building a Dynamic CMS system with inline editing, typed fallback content, live animation editing, and draft/publish workflow - similar to SMTS website architecture
---

# Dynamic CMS Generator

## Overview

This skill provides a complete blueprint for building a **Dynamic CMS system** with:
- **Inline CMS editing** - Edit content in-place on the live page (no separate admin UI)
- **Typed fallback content** - Centralized typed registry as single source of truth
- **Draft/Publish workflow** - Edit as drafts, preview live, publish atomically
- **Animation editor** - Intent-driven animation authoring with WAAPI runtime
- **Server-only persistence** - Postgres/Supabase with file fallback, zero client exposure

Based on the SMTS Contracting LLC marketing website architecture (Next.js 16 App Router + React 19).

## When to Use

- Building a marketing/site CMS with inline editing capabilities
- Need typed content registry with complete-document CMS model
- Require live animation editing with intent-driven authoring
- Need server-only persistence with draft/publish workflow
- Building marketing sites with animation-rich interactions

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (BROWSER)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Page Wrappers│  │ CMS Editor  │  │ Animation Runtime       │  │
│  │ (Animated*) │  │ (components/│  │ (components/animations/) │  │
│  │             │  │  cms/)      │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              CMS Store (Module Singleton)                    │ │
│  │  - docs (drafts)    - publishedDocs (immutable snapshots)   │ │
│  │  - dirty flags      - epoch counter                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (NODE)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ CMS Auth    │  │ Content     │  │ Asset Storage           │  │
│  │ (HMAC cookie)│  │ Store       │  │ (local/Supabase)        │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Persistence Layer                              │ │
│  │  Postgres → Supabase REST → .cms-data/*.json (3-tier)      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
project-root/
├── app/                          # Next.js App Router entry points
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── api/                     # Thin API route re-exports
│   │   ├── cms/
│   │   │   ├── session/route.ts     # Auth (login/logout/status)
│   │   │   └── pages/[slug]/route.ts # CMS CRUD (draft/publish)
│   │   └── assets/route.ts         # Asset upload
│   ├── */page.tsx               # Thin route shells
│   └── globals.css
│
├── components/
│   ├── pages/                   # Route-mirrored page components
│   │   ├── HomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── ServicesPage.tsx
│   │   ├── CareersPage.tsx
│   │   ├── CertificationsPage.tsx
│   │   └── ContactPage.tsx
│   │
│   ├── cms/                     # Inline CMS editing layer
│   │   ├── store.ts              # Module-singleton CMS store
│   │   ├── editable.tsx          # Inline primitives (E, EImg, EIcon)
│   │   ├── CmsRoot.tsx           # Entry point (code-split)
│   │   ├── CmsTools.tsx          # Editor chrome (toolbar + toast)
│   │   ├── GlobalEditToolbar.tsx # Main toolbar
│   │   ├── DynamicFieldEditor.tsx# JSON-path field editor
│   │   ├── documentValidation.ts # Pre-publish validation
│   │   ├── documentNormalization.ts # FNV-1a stable IDs, migrations
│   │   ├── animation/            # Animation editor bridge
│   │   │   ├── SmtsAnimationEditorAdapter.ts
│   │   │   ├── SmtsAnimationEditorProvider.tsx
│   │   │   └── scopePaths.ts
│   │   └── [various UI components]
│   │
│   ├── animation-editor/        # Self-contained editor package
│   │   ├── core/                # Pure schema + intent model (NO React)
│   │   │   ├── types.ts              # AnimationConfig, AnimationEditorAdapter
│   │   │   ├── intents.ts            # DEFAULT_ANIMATION_INTENTS catalog
│   │   │   ├── intent-mapper.ts      # intent ↔ config bijection
│   │   │   ├── scope.ts              # 5 apply-scope kinds
│   │   │   ├── page-transitions.ts   # Page transition intents
│   │   │   ├── preview-state.ts      # External preview store
│   │   │   └── undo.ts               # Undo receipts
│   │   ├── runtime/             # React glue
│   │   │   ├── AnimationEditorProvider.tsx
│   │   │   ├── AnimationTargetOverlay.tsx
│   │   │   └── [hooks]
│   │   ├── ui/                  # Presentational widgets
│   │   │   ├── AnimationPopover.tsx
│   │   │   ├── AnimationIntentGallery.tsx
│   │   │   └── [widgets]
│   │   ├── styles/              # CSS for editor
│   │   ├── index.ts             # Public API exports
│   │   ├── portability.test.ts  # Self-contained test
│   │   └── README.md            # Portability docs
│   │
│   ├── animations/              # WAAPI playback runtime
│   │   ├── types.ts             # AnimationConfig (duplicated), ResolvedAnimationConfig
│   │   ├── presets.ts           # animationDefinition() → WAAPI keyframes
│   │   ├── resolveAnimationConfig.ts # 6-layer config merge
│   │   ├── useAnimationRuntime.ts # WAAPI playback hook
│   │   ├── AnimationProvider.tsx # Context providers
│   │   ├── AnimatedElement.tsx  # Component wrapper
│   │   ├── AnimatedSection.tsx  # Section wrapper
│   │   ├── AnimatedPage.tsx     # Page wrapper
│   │   ├── targetRegistry.ts    # Client-side target registry
│   │   └── PageTransitionBoundary.tsx
│   │
│   ├── cms/                     # CMS-specific animation bridge
│   │   ├── SmtsAnimationEditorAdapter.ts
│   │   ├── SmtsAnimationEditorProvider.tsx
│   │   └── scopePaths.ts
│   │
│   ├── ui/                      # shadcn/Radix primitives (vendored)
│   │   └── [49 components]
│   │
│   └── [other components]
│
├── content/                      # Typed fallback content registry
│   ├── registry.ts              # CONTENT_REGISTRY (source of truth)
│   ├── registry.extended.ts     # Extended registry (test alias)
│   ├── careers.ts               # Careers-specific content
│   └── types.ts                 # ImageRef, assetSrc helper
│
├── lib/
│   ├── server/                  # SERVER-ONLY (never import in client)
│   │   ├── db.ts                 # pg.Pool, ensureSchema
│   │   ├── supabaseDatabase.ts   # Supabase REST fallback
│   │   ├── contentStore.ts       # getEntry/saveDraft/publish
│   │   ├── getPageContent.ts     # Read path: deepMerge + normalize
│   │   ├── cmsAuth.ts            # cmsAuthorized (HMAC cookie)
│   │   ├── cmsSession.ts         # HMAC session cookie
│   │   └── assetStorage.ts       # uploadAsset (local|supabase)
│   ├── api/                     # Route handler logic (re-exported by app/api/)
│   │   ├── assets/
│   │   ├── cms/
│   │   └── leads/
│   ├── services/                # Browser-side clients
│   │   └── cms.service.ts       # CMS API client
│   └── [utilities]
│
├── content/                      # Typed fallback registry
│   ├── registry.ts              # CONTENT_REGISTRY
│   ├── registry.extended.ts     # Test alias
│   ├── careers.ts
│   └── types.ts
│
├── public/
│   ├── images/                  # Static assets
│   └── uploads/                 # Local dev uploads
│
├── scripts/                      # Deploy/env validation
│   └── check-deployment-env.mjs
│
├── .opencode/skills/            # Custom skills
└── [config files]
```

## Core Patterns

### 1. Typed Fallback Content + Complete-Document CMS

```typescript
// content/registry.ts - Single source of truth
export const CONTENT_REGISTRY = {
  site: { /* navbar, footer, global animations */ },
  home: { /* hero, services, etc */ },
  about: { /* ... */ },
  // ... one entry per page slug
} as const;

// Server read path: deepMerge(fallback, published) + normalize
// components/cms/store.ts
export function setPath(path: PathSegment[], value: JsonValue, scope: DocScope = "page") {
  const slug = slugForScope(scope);
  const doc = state.docs[slug];
  if (!doc) return;
  const changed = setAtPath(doc, path, value);
  const next = Array.isArray(value) ? normalizeCmsDocument(slug, changed) : changed;
  set({ docs: { ...state.docs, [slug]: next }, dirty: { ...state.dirty, [slug]: true } });
  scheduleSave(slug, next);
}
```

**Key invariant**: Published document replaces fallback wholesale (complete-document model). Edits are per-field but stored as complete documents.

### 2. CMS Store - Module Singleton with External Store

```typescript
// components/cms/store.ts
interface CmsState {
  editing: boolean;
  docs: Record<string, JsonObject | null>;
  publishedDocs: Record<string, JsonObject | null>;
  dirty: Record<string, boolean>;
  epoch: number;
  viewMode: "draft" | "published";
}

let state: CmsState = { editing: false, docs: {}, publishedDocs: {}, dirty: {}, epoch: 0, viewMode: "draft" };
const listeners = new Set<() => void>();

export function useSection<T>(path: PathSegment[], fallback: T, scope: DocScope = "page"): T {
  return useSyncExternalStore(subscribe, () => {
    if (!state.editing) return null;
    const slug = slugForScope(scope);
    const doc = state.viewMode === "published" ? state.publishedDocs[slug] : state.docs[slug];
    return (getAtPath(doc, basePath) ?? null) as T | null;
  }, () => null) ?? fallback;
}
```

### 3. Animation Editor - Intent-Driven Authoring

```typescript
// components/animation-editor/core/types.ts
export interface AnimationEditorAdapter {
  getDraftConfig(target: AnimationEditorTarget, scope: AnimationApplyScope): AnimationConfig;
  getPublishedConfig(target: AnimationEditorTarget, scope: AnimationApplyScope): AnimationConfig;
  getAvailableScopes(target: AnimationEditorTarget): AnimationScopeOption[];
  preview(target: AnimationEditorTarget, config: AnimationConfig): void;
  clearPreview(target: AnimationEditorTarget): void;
  replay(target: AnimationEditorTarget): void;
  cancel(target: AnimationEditorTarget): void;
  saveDraft(input: SaveAnimationDraftInput): Promise<AnimationDraftReceipt>;
  undo(receipt: AnimationDraftReceipt): Promise<void>;
  resetDraft(input: ResetAnimationDraftInput): Promise<void>;
  subscribeStatus(listener: (status: AnimationDraftStatus) => void): () => void;
  // Page transition methods
}

// Intent → Config bijection
export function mapIntentToConfig(input: MapIntentInput): AnimationConfig {
  const intent = DEFAULT_ANIMATION_INTENTS.find(c => c.id === input.intentId);
  const base = { mode: "override", enabled: true, timing, viewport, trigger };
  // ... switch on intentId to add preset, transform, etc.
  return { ...base, preset: intent.defaults.preset, ... };
}

export function recognizeIntent(config: AnimationConfig): { intentId: string; exact: boolean } {
  // Reverse mapping for round-trip
}
```

### 4. Animation Runtime - WAAPI Playback

```typescript
// components/animations/useAnimationRuntime.ts
export function useAnimationRuntime(
  ref: RefObject<HTMLElement | null>,
  config: ResolvedAnimationConfig,
  staggerIndex = 0,
  targetId?: string
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const play = async () => {
      const definition = animationDefinition(config.preset, config);
      if (!definition) return;
      const animation = element.animate(definition.keyframes, definition.options);
      // ... handle triggers, scroll-linked, replay/cancel events
    };
    
    // Triggers: in-view, hover, focus, click, page-load, scroll-progress
    // Scroll-linked: animation.pause() + currentTime = progress * duration
  }, [config, ref, staggerIndex, targetId]);
}

// 6-layer config resolution (last wins)
const layers = [
  siteAnimations.global,
  defaultsByType[type],
  pageAnimations.page,
  sectionId ? sections[sectionId] : undefined,
  targetId ? components[targetId] : undefined,
  previewConfig,  // ← Editor preview overrides runtime
];
return resolveAnimationConfig(layers, preferences.device, preferences.reducedMotion);
```

### 5. Server Persistence - 3-Tier Cascade

```typescript
// lib/server/contentStore.ts
async function dbGetEntry(slug: string): Promise<PageContentEntry | null> {
  const pool = await getPool();
  if (pool) { /* pg query */ }
  const supabase = createSupabaseDatabase();
  if (!supabase) return null;
  return rowToEntry(await supabase.getPage(slug));
}

export async function saveDraft(slug: string, draft: JsonObject): Promise<PageContentEntry> {
  const existing = await getEntry(slug);
  const entry = { slug, draft, published: existing?.published ?? null, ... };
  await writeEntry(entry);  // pg → supabase → .cms-data/*.json
  return entry;
}
```

### 6. CMS Auth - HMAC Cookie Session

```typescript
// lib/server/cmsSession.ts
const CMS_SESSION_COOKIE = "cms_session";

export function createCmsSessionToken(): string {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const sig = crypto.createHmac("sha256", getCmsSessionSecret()).update(nonce).digest("base64url");
  return `v1.${nonce}.${sig}`;
}

export function verifyCmsSessionToken(token: string): boolean {
  const [version, nonce, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", getCmsSessionSecret()).update(nonce).digest("base64url");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// lib/server/cmsAuth.ts
export async function cmsAuthorized(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(CMS_SESSION_COOKIE)?.value;
  if (cookie && verifyCmsSessionToken(cookie)) return true;
  // Dev fallback: localhost + NODE_ENV=development + x-cms-key: dev header
}
```

## Key Conventions

| Aspect | Convention |
|--------|------------|
| **Path aliases** | `@/*` → repo root (no `src/`) |
| **CMS Registry** | `@/content/registry` → `content/registry.extended.ts` (tests assert extended) |
| **lucide-react** | Shimmed via `components/shims/lucide-react.tsx` |
| **API routes** | `app/api/**` = 1-line re-exports of `lib/api/**` |
| **Server-only** | `lib/server/**` never imported in client (by convention) |
| **Type escapes** | `as any` allowed (image props, framer-motion refs); zero `@ts-ignore` |
| **Dev script** | `npm run dev` forces `--webpack`; Turbopack via `dev:turbo` |
| **AnimationConfig** | Duplicated in editor + runtime (portability) |
| **Tests** | Vitest, colocated `*.test.ts`, behavioral + source-inspection |
| **Draft/Publish** | Draft = mutable store; Publish = copy draft→published + revalidatePath |

## Anti-Patterns (Enforced)

| ❌ Never | ✅ Instead |
|--------|------------|
| `NEXT_PUBLIC_` prefix on secrets | Server-only env vars |
| Import `lib/server/**` in client code | Use `lib/services/` or API routes |
| `x-cms-key` header on mutations | Cookie-based `cms_session` |
| `@ts-ignore` / `@ts-expect-error` | Use `as any` escapes |
| Edit `components/ui/*` directly | Fork only if upstream-customizing |
| Trust client MIME on uploads | Magic-byte sniff + SVG sanitize |

## Generation Patterns

### Creating a New Page with CMS

1. Add entry to `content/registry.ts` with typed fallback
2. Create `components/pages/YourPage.tsx` using `<E path={["field"]} value={content.field} />`
3. Create `app/your-page/page.tsx` calling `getPageContent("slug", CONTENT_REGISTRY.slug)`
4. Add route in `app/your-page/page.tsx` (thin shell importing page component)

### Adding a CMS Field

1. Add field to `content/registry.ts` typed fallback
2. Use `<E path={["field", "subfield"]} value={content.field.subfield} />` in page component
3. Field appears in CMS editor automatically (DynamicFieldEditor handles nested paths)

### Adding Animation to Element

```tsx
<AnimatedElement
  id="component:hero:title"
  type="heading"
  label="Hero Title"
  sectionId="hero"
  staggerIndex={0}
>
  <E path={["hero", "title"]} value={content.hero.title} />
</AnimatedElement>
```

### Adding Custom Animation Intent

1. Add to `DEFAULT_ANIMATION_INTENTS` in `animation-editor/core/intents.ts`
2. Add case in `mapIntentToConfig` with preset + transform
3. Add reverse mapping in `recognizeIntent`

## Reference Files

| File | Purpose |
|------|---------|
| `content/registry.ts` | Typed fallback content registry |
| `components/cms/store.ts` | Module-singleton CMS store |
| `components/cms/editable.tsx` | Inline editing primitives |
| `components/cms/store.ts` | Draft/publish store |
| `components/animation-editor/core/types.ts` | AnimationConfig, Adapter interface |
| `components/animation-editor/core/intent-mapper.ts` | Intent ↔ Config bijection |
| `components/animations/useAnimationRuntime.ts` | WAAPI playback hook |
| `components/animations/resolveAnimationConfig.ts` | 6-layer config merge |
| `components/animation-editor/core/intent-mapper.ts` | Intent ↔ Config bijection |
| `lib/server/contentStore.ts` | 3-tier persistence |
| `lib/server/getPageContent.ts` | Read path (deepMerge + normalize) |
| `lib/server/cmsAuth.ts` | HMAC auth |
| `components/animation-editor/core/intent-mapper.ts` | Intent ↔ Config |
| `components/cms/animation/SmtsAnimationEditorAdapter.ts` | Editor ↔ CMS bridge |

## Best Practices

1. **Never mutate published docs directly** - Always go through `setPath` → draft → publish
2. **Preserve `animations` structure in normalization** - See `normalizeCmsDocument`
3. **Keep editor self-contained** - No `@/components/cms`, `@/lib/services`, `@/content/registry` imports
4. **Use `as any` for known escapes** - Image props, framer-motion refs, setPath lists
4. **Server-only imports** - Never import `lib/server/**` in client components
5. **Draft-first** - Preview works on drafts; Publish = atomic copy + revalidatePath

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting `animations` prop on `<AnimatedPage>` | Always pass `animations={content.animations}` |
| Using `useSection` outside edit mode | Wrap in `if (editing)` or handle `null` |
| Mutating published docs directly | Always use `setPath` → draft → publish |
| Hardcoding animation IDs | Use stable IDs: `component:${section}:${id}` |
| Missing `data-animation-target` on elements | Required for target registry + overlay |

## Real-World Impact

- **Zero separate admin UI** - Content authors edit directly on live pages
- **Type-safe content** - Registry provides full TypeScript inference
- **Live animation preview** - Intent changes reflect instantly via preview store
- **Zero-downtime deploy** - Drafts auto-save locally; publish is atomic
- **Portable animation editor** - Copy `components/animation-editor/` to any Next.js app

## Quick Reference

| Task | Files to Touch |
|------|----------------|
| Add new page | `content/registry.ts`, `components/pages/*.tsx`, `app/*/page.tsx` |
| Add CMS field | `content/registry.ts`, page component |
| Add animation | `AnimatedElement/Section/Page` wrapper + `animations` prop |
| Custom intent | `animation-editor/core/intents.ts`, `intent-mapper.ts` |
| Custom animation preset | `components/animations/presets.ts` |
| Modify CMS UI | `components/cms/` |
| Change storage | `lib/server/contentStore.ts`, `db.ts`, `supabaseDatabase.ts` |
| Change auth | `lib/server/cmsAuth.ts`, `cmsSession.ts` |

## Testing Strategy

```bash
# Run all tests
npm test

# Type check (required pre-submit)
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## Migration from Static Site

1. Move static content to `content/registry.ts`
2. Wrap static sections with `<AnimatedSection>` + `<AnimatedElement>`
3. Replace static text with `<E path={["field"]} value={content.field} />`
4. Add `animations` to page content
5. Wrap page root in `<AnimatedPage animations={content.animations}>`
6. Add `CmsRoot` to layout (already in `app/layout.tsx`)

---

**Generated from**: SMTS Contracting LLC marketing website (Next.js 16 + React 19)
**Architecture**: Inline CMS + Intent-driven Animation Editor + WAAPI Runtime
**Portability**: Animation editor is copy-pasteable (`components/animation-editor/`)