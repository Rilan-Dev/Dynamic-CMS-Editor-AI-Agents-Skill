# Dynamic CMS Generator - Reference Index

## Overview

This reference folder contains the complete source code from the SMTS Contracting LLC marketing website (Next.js 16 + React 19) that demonstrates a production-ready Dynamic CMS with inline editing, animation editor, and WAAPI runtime.

## Folder Structure

```
reference/
├── components/
│   ├── cms/                    # Inline CMS editing layer
│   │   ├── store.ts            # Module-singleton CMS store (useSyncExternalStore)
│   │   ├── editable.tsx        # Inline primitives (E, EImg, EIcon, ERemove, EAdd)
│   │   ├── CmsRoot.tsx         # CMS entry point (code-split, ?edit=1 gate)
│   │   ├── CmsTools.tsx        # Editor chrome (toolbar + toast + click blocker)
│   │   ├── GlobalEditToolbar.tsx   # Main toolbar (save/publish/discard/view mode)
│   │   ├── DynamicFieldEditor.tsx    # JSON-path field editor (Dialog + dnd-kit)
│   │   ├── documentValidation.ts     # Pre-publish validation (URLs, IDs, animations)
│   │   ├── documentNormalization.ts  # FNV-1a stable IDs, migrations
│   │   ├── animation/            # Animation editor bridge
│   │   │   ├── SmtsAnimationEditorAdapter.ts  # Adapter implementation
│   │   │   ├── SmtsAnimationEditorProvider.tsx  # Provider + toast slots
│   │   │   └── scopePaths.ts     # Scope → CMS path mapping
│   │   ├── editable.tsx exports: E, EImg, EIcon, ERemove, EAdd, EditableIcon
│   │   ├── CmsRoot.tsx           # Code-split entry point (?edit=1 gate)
│   │   ├── CmsTools.tsx          # Editor chrome (toolbar + toast + click blocker)
│   │   ├── GlobalEditToolbar.tsx # Main toolbar with save/publish/discard/view mode
│   │   ├── DynamicFieldEditor.tsx # JSON-path field editor (Dialog + dnd-kit)
│   │   ├── documentValidation.ts # Pre-publish validation (URLs, IDs, animations)
│   │   ├── documentNormalization.ts # FNV-1a stable IDs, migrations
│   │   ├── animation/            # Animation editor bridge
│   │   │   ├── SmtsAnimationEditorAdapter.ts
│   │   │   ├── SmtsAnimationEditorProvider.tsx
│   │   │   └── scopePaths.ts
│   │
│   ├── animation-editor/         # SELF-CONTAINED PORTABLE PACKAGE
│   │   ├── core/                 # Pure schema + intent model (NO React)
│   │   │   ├── types.ts          # AnimationConfig, AnimationEditorAdapter interface
│   │   │   ├── intents.ts        # DEFAULT_ANIMATION_INTENTS catalog (28+ intents)
│   │   │   ├── intent-mapper.ts  # intent ↔ config bijection
│   │   │   ├── scope.ts          # 5 apply-scope kinds (target/similar-page/section/page/global)
│   │   │   ├── page-transitions.ts  # Page transition intents
│   │   │   ├── preview-state.ts  # External preview store (Map + subscribers)
│   │   │   ├── undo.ts           # Undo receipts with AnimationPathChange
│   │   │   ├── types.ts          # AnimationConfig, AnimationEditorAdapter interface
│   │   │   ├── intent-mapper.ts  # intent ↔ config bijection
│   │   │   ├── scope.ts          # 5 apply-scope kinds
│   │   │   ├── page-transitions.ts  # Page transition intents
│   │   │   ├── preview-state.ts  # External preview store
│   │   │   └── undo.ts           # Undo receipts
│   │   ├── runtime/              # React glue
│   │   │   ├── AnimationEditorProvider.tsx  # Context + preview store
│   │   │   ├── AnimationTargetOverlay.tsx   # Portal'd badge + popover
│   │   │   ├── active-popover.ts   # Single-active-popover coordinator
│   │   │   ├── popover-position.ts # Viewport clamping
│   │   │   └── usePopoverFocus.ts  # Focus trap + Escape close
│   │   ├── ui/                   # Presentational widgets
│   │   │   ├── AnimationPopover.tsx      # Popover orchestrator
│   │   │   ├── AnimationIntentGallery.tsx
│   │   │   ├── AnimationIntentCard.tsx
│   │   │   ├── AnimationSimpleControls.tsx
│   │   │   ├── AnimationScopePicker.tsx
│   │   │   ├── AnimationFineTune.tsx
│   │   │   ├── AnimationDraftStatus.tsx
│   │   │   └── PageTransitionEditor.tsx
│   │   ├── styles/               # CSS for editor (animation-editor.css + -dark.css)
│   │   ├── index.ts              # Public API exports
│   │   ├── portability.test.ts   # Self-contained test (no host imports)
│   │   └── README.md             # Portability docs
│   │
│   ├── animations/               # WAAPI playback runtime
│   │   ├── types.ts              # AnimationConfig (duplicated), ResolvedAnimationConfig
│   │   ├── presets.ts            # animationDefinition() → WAAPI keyframes (~30 presets)
│   │   ├── resolveAnimationConfig.ts # 6-layer config merge
│   │   ├── useAnimationRuntime.ts # WAAPI playback hook
│   │   ├── AnimationProvider.tsx  # Context providers
│   │   ├── AnimatedElement.tsx   # Component wrapper
│   │   ├── AnimatedSection.tsx   # Section wrapper
│   │   ├── AnimatedPage.tsx      # Page wrapper
│   │   ├── targetRegistry.ts     # Client-side target registry
│   │   ├── PageTransitionBoundary.tsx # Click-intercept page transitions
│   │   ├── EditableAnimationTarget.tsx # Lazy-loaded editor overlay
│   │   ├── targetRegistry.ts     # Client-side target registry
│   │   ├── AnimatedElement.tsx   # Component wrapper
│   │   ├── AnimatedSection.tsx   # Section wrapper
│   │   ├── AnimatedPage.tsx      # Page wrapper
│   │   ├── presets.ts            # animationDefinition() → WAAPI keyframes
│   │   ├── resolveAnimationConfig.ts # 6-layer config merge
│   │   ├── useAnimationRuntime.ts # WAAPI playback hook
│   │   ├── AnimationProvider.tsx # Context providers
│   │   ├── PageTransitionBoundary.tsx # Click-intercept page transitions
│   │   └── EditableAnimationTarget.tsx # Lazy-loaded editor overlay
│   │
│   ├── pages/                    # Example page components
│   │   ├── HomePage.tsx          # Hero, services, about preview
│   │   ├── AboutPage.tsx         # About section with CMS
│   │   ├── ServicesPage.tsx      # Services grid with CMS
│   │   ├── CareersPage.tsx       # Careers with job catalog
│   │   ├── CertificationsPage.tsx # Certifications grid
│   │   ├── ContactPage.tsx       # Contact form + map
│   │   ├── AboutPage.tsx
│   │   ├── CareersPage.tsx
│   │   ├── CertificationsPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── HomePage.tsx
│   │   └── ServicesPage.tsx
│   │
│   ├── footer/                   # Footer with inline CMS
│   │   ├── FooterInlineCms.module.css
│   │   ├── FooterServicePicker.tsx
│   │   ├── FooterSocialLinksEditor.tsx
│   │   └── SocialPlatformIcon.tsx
│   │
│   ├── ui/                       # shadcn/Radix primitives (49 components)
│   │   └── [49 components]
│   │
│   └── [other components]
│
├── animation-editor/             # Self-contained editor package (copy-pasteable)
│   ├── core/                     # Pure schema + intent model (NO React)
│   ├── runtime/                  # React glue
│   ├── ui/                       # Presentational widgets
│   ├── styles/                   # CSS for editor
│   ├── index.ts                  # Public API exports
│   ├── portability.test.ts       # Self-contained test
│   └── README.md                 # Portability docs
│
├── animations/                   # WAAPI playback runtime
│   ├── types.ts                  # AnimationConfig (duplicated), ResolvedAnimationConfig
│   ├── presets.ts                # animationDefinition() → WAAPI keyframes (~30 presets)
│   ├── resolveAnimationConfig.ts # 6-layer config merge
│   ├── useAnimationRuntime.ts    # WAAPI playback hook
│   ├── AnimationProvider.tsx     # Context providers
│   ├── AnimatedElement.tsx       # Component wrapper
│   ├── AnimatedSection.tsx       # Section wrapper
│   ├── AnimatedPage.tsx          # Page wrapper
│   ├── targetRegistry.ts         # Client-side target registry
│   ├── PageTransitionBoundary.tsx # Click-intercept page transitions
│   ├── EditableAnimationTarget.tsx # Lazy-loaded editor overlay
│   ├── targetRegistry.ts         # Client-side target registry
│   ├── AnimatedElement.tsx       # Component wrapper
│   ├── AnimatedSection.tsx       # Section wrapper
│   ├── AnimatedPage.tsx          # Page wrapper
│   ├── presets.ts                # animationDefinition() → WAAPI keyframes
│   ├── resolveAnimationConfig.ts # 6-layer config merge
│   ├── useAnimationRuntime.ts    # WAAPI playback hook
│   ├── AnimationProvider.tsx     # Context providers
│   ├── PageTransitionBoundary.tsx # Click-intercept page transitions
│   └── EditableAnimationTarget.tsx # Lazy-loaded editor overlay
│
├── content/                      # Typed fallback content registry
│   ├── registry.ts               # CONTENT_REGISTRY (source of truth)
│   ├── registry.extended.ts      # Extended registry (test alias)
│   ├── careers.ts                # Careers-specific content
│   └── types.ts                  # ImageRef + assetSrc helper
│
├── lib/
│   ├── server/                   # SERVER-ONLY (never import in client)
│   │   ├── db.ts                 # pg.Pool, ensureSchema
│   │   ├── supabaseDatabase.ts   # Supabase REST fallback
│   │   ├── contentStore.ts       # getEntry/saveDraft/publish/discardDraft
│   │   ├── db.ts                 # pg.Pool from DATABASE_URL
│   │   ├── getPageContent.ts     # Read path: deepMerge + normalize
│   │   ├── cmsAuth.ts            # cmsAuthorized (HMAC cookie)
│   │   ├── cmsSession.ts         # HMAC session cookie
│   │   ├── assetStorage.ts       # uploadAsset (local|supabase)
│   │   └── *.test.ts             # Colocated tests
│   ├── api/                      # Route handler logic (re-exported by app/api/)
│   │   ├── assets/route.ts       # POST upload handler
│   │   ├── assets/validation.ts  # Magic-byte sniff + SVG sanitize
│   │   ├── cms/session/route.ts  # GET/POST/DELETE auth
│   │   ├── cms/pages/[slug]/route.ts # GET/PUT/POST/DELETE drafts
│   │   └── leads/route.ts        # POST lead intake
│   ├── services/                 # Browser-side CMS client
│   │   └── cms.service.ts        # CMS API client (fetch wrapper)
│   └── [utilities]
│
├── app/
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── api/                     # Thin route re-exports
│   │   ├── assets/route.ts       # POST asset upload
│   │   ├── cms/session/route.ts  # GET/POST/DELETE auth
│   │   └── cms/pages/[slug]/route.ts # GET/PUT/POST/DELETE drafts
│   ├── layout.tsx
│   └── page.tsx
│
├── scripts/                      # Deploy/env validation scripts
│   └── check-deployment-env.mjs
│
├── agents/                       # Agent configurations
│   └── dynamic-cms-generator.md  # Agent configuration
│
├── SKILL.md                      # Main skill document
├── CMS_STORE_REFERENCE.md        # CMS store module reference
├── ANIMATION_EDITOR_REFERENCE.md # Animation editor package reference
├── ANIMATION_RUNTIME_REFERENCE.md # WAAPI playback runtime reference
├── CMS_AUTH_STORAGE_REFERENCE.md # Auth, 3-tier storage, asset upload
└── REFERENCE_INDEX.md            # This file
```

## Key Files for Common Tasks

| Task | Key Files |
|------|-----------|
| Add new CMS page | `content/registry.ts`, `components/pages/*.tsx`, `app/*/page.tsx` |
| Add CMS field | `content/registry.ts`, page component |
| Add animation | `AnimatedElement/Section/Page` wrapper + `animations` prop |
| Custom intent | `animation-editor/core/intents.ts`, `intent-mapper.ts` |
| Custom preset | `components/animations/presets.ts` |
| CMS UI changes | `components/cms/` |
| Storage backend | `lib/server/contentStore.ts`, `db.ts`, `supabaseDatabase.ts` |
| Auth changes | `lib/server/cmsAuth.ts`, `cmsSession.ts` |
| Asset upload | `lib/server/assetStorage.ts` |

## Key Architectural Decisions

1. **Complete-document CMS model** - Published doc replaces fallback wholesale
2. **Draft-first editing** - Drafts mutable, publish = atomic copy + revalidatePath
2. **Server-only boundary** - `lib/server/**` never imported in client code
3. **Self-contained animation editor** - Zero host imports, portable package
4. **Intent-driven animation** - Plain-language intents mapped to numeric configs
5. **6-layer config resolution** - site.global → defaultsByType → page → section → component → preview
6. **Draft-first editing** - Preview works on drafts; Publish = atomic copy + revalidatePath
6. **Code-split CMS** - `CmsRoot` lazy-loads `CmsTools` only when `?edit=1`
6. **Portable animation editor** - Copy `components/animation-editor/` to any Next.js app

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CMS_EDIT_KEY` | Yes (prod) | HMAC secret for session cookie |
| `DATABASE_URL` | No | Postgres connection string |
| `DATABASE_SSL` | With DATABASE_URL | `"true"` or `"false"` |
| `SUPABASE_URL` | If no DATABASE_URL | Supabase project URL |
| `SUPABASE_SECRET_KEY` | If no DATABASE_URL | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | If driver=supabase | Storage bucket name |
| `ASSET_STORAGE_DRIVER` | No (default: local) | `local` or `supabase` |
| `GMAIL_USER` / `GMAIL_PASSWORD` | For contact form | Nodemailer credentials |
| `NEXT_PUBLIC_SITE_URL` | For sitemap/robots | Canonical site URL |

## Commands

```bash
npm ci                    # Install dependencies
npm run dev               # Next.js dev server (webpack)
npm run dev:turbo         # Next.js dev server (turbopack)
npm run build             # Production build
npm start                 # Serve production build
npm run lint              # Next.js lint
npm test                  # Vitest run (node env)
npm run check:deploy-env  # Validate deployment env + connectivity
npx tsc --noEmit          # REQUIRED pre-submit (build ignores TS errors)
docker compose up -d --build # Production container
```

## Portability

The animation editor (`components/animation-editor/`) is designed to be **copy-pasteable** into any Next.js app:
- No `@/components/cms`, `@/lib/services`, `@/content/registry` imports
- Own `README.md` + `portability.test.ts` enforcing self-containment
- Provide `AnimationEditorAdapter` implementation to integrate with host CMS
- Own `index.ts` exports all public API
- Own `styles/` with `animation-editor.css` + `-dark.css`