---
name: dynamic-cms-generator
description: Use when building a Dynamic CMS system with inline editing, typed fallback content, live animation editing, and draft/publish workflow - similar to SMTS website architecture
---

# Dynamic CMS Generator Agent

## Overview

This agent specializes in generating and extending Dynamic CMS systems with inline editing, typed fallback content, live animation editing, and draft/publish workflow - based on the SMTS website architecture (Next.js 16 App Router + React 19).

## Capabilities

- Generate new Dynamic CMS projects from scratch
- Add new pages with CMS integration
- Add CMS fields to existing pages
- Create and configure animations with intent-driven editor
- Set up server persistence (Postgres/Supabase/file fallback)
- Configure CMS authentication and asset storage
- Extend the portable animation editor package

## Key Files to Reference

When working on Dynamic CMS tasks, always reference these files in the skill:

### Core CMS
- `reference/components/cms/store.ts` - Module-singleton CMS store
- `reference/components/cms/editable.tsx` - Inline editing primitives (E, EImg, EIcon, ERemove, EAdd)
- `reference/components/cms/CmsRoot.tsx` - CMS entry point (code-split)
- `reference/components/cms/CmsTools.tsx` - Editor chrome (toolbar + toast)
- `reference/components/cms/GlobalEditToolbar.tsx` - Main toolbar
- `reference/components/cms/DynamicFieldEditor.tsx` - JSON-path field editor
- `reference/components/cms/documentValidation.ts` - Pre-publish validation
- `reference/components/cms/documentNormalization.ts` - FNV-1a stable IDs, migrations

### Animation Editor (Portable Package)
- `reference/components/animation-editor/core/types.ts` - AnimationConfig, AnimationEditorAdapter interface
- `reference/components/animation-editor/core/intent-mapper.ts` - Intent ↔ Config bijection
- `reference/components/animation-editor/core/intents.ts` - DEFAULT_ANIMATION_INTENTS catalog
- `reference/components/animation-editor/core/scope.ts` - 5 apply-scope kinds
- `reference/components/animation-editor/runtime/AnimationEditorProvider.tsx` - Context + preview store
- `reference/components/animation-editor/runtime/AnimationTargetOverlay.tsx` - Portal'd badge
- `reference/components/animation-editor/ui/AnimationPopover.tsx` - Popover orchestrator

### Animation Runtime
- `reference/components/animations/useAnimationRuntime.ts` - WAAPI playback hook
- `reference/components/animations/resolveAnimationConfig.ts` - 6-layer config merge
- `reference/components/animations/presets.ts` - animationDefinition() → WAAPI keyframes
- `reference/components/animations/AnimationProvider.tsx` - Context providers
- `reference/components/animations/AnimatedElement.tsx` - Component wrapper
- `reference/components/animations/AnimatedSection.tsx` - Section wrapper
- `reference/components/animations/AnimatedPage.tsx` - Page wrapper

### CMS Integration
- `reference/components/cms/animation/SmtsAnimationEditorAdapter.ts` - Editor ↔ CMS bridge
- `reference/components/cms/animation/SmtsAnimationEditorProvider.tsx` - Editor provider
- `reference/components/cms/animation/scopePaths.ts` - Scope → path mapping

### Server
- `reference/lib/server/contentStore.ts` - 3-tier persistence
- `reference/lib/server/getPageContent.ts` - Read path: deepMerge + normalize
- `reference/lib/server/cmsAuth.ts` - HMAC auth
- `reference/lib/server/cmsSession.ts` - HMAC session cookie
- `reference/lib/server/assetStorage.ts` - uploadAsset (local|supabase)

### Content & Pages
- `reference/content/registry.ts` - Typed fallback content registry
- `reference/components/pages/` - Example page components (HomePage, AboutPage, etc.)
- `reference/app/` - App routes and layout

## Generation Patterns

### Adding a New Page with CMS
1. Add entry to `content/registry.ts` with typed fallback
2. Create `components/pages/YourPage.tsx` using `<E path={["field"]} value={content.field} />`
3. Create `app/your-page/page.tsx` calling `getPageContent("slug", CONTENT_REGISTRY.slug)`
4. Add route in `app/your-page/page.tsx` (thin shell importing page component)

### Adding a CMS Field
1. Add field to `content/registry.ts` typed fallback
2. Use `<E path={["field", "subfield"]} value={content.field.subfield} />` in page component

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

## Anti-Patterns (Enforced)

| ❌ Never | ✅ Instead |
|----------|------------|
| `NEXT_PUBLIC_` prefix on secrets | Server-only env vars |
| Import `lib/server/**` in client code | Use `lib/services/` or API routes |
| `x-cms-key` header on mutations | Cookie-based `cms_session` |
| `@ts-ignore` / `@ts-expect-error` | Use `as any` escapes |
| Edit `components/ui/*` directly | Fork only if upstream-customizing |
| Trust client MIME on uploads | Magic-byte sniff + SVG sanitize |

## Reference Files

- `reference/CMS_STORE_REFERENCE.md` - CMS store module reference
- `ANIMATION_EDITOR_REFERENCE.md` - Portable animation editor package
- `ANIMATION_RUNTIME_REFERENCE.md` - WAAPI playback runtime
- `CMS_AUTH_STORAGE_REFERENCE.md` - Auth, 3-tier storage, asset upload