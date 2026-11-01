# Existing Website → Dynamic CMS Migration Playbook

## Mandatory agent workflow
This playbook applies to existing websites in any framework. **Never assume the target is SMTS, Next.js, React, or Supabase.** Inspect first. Do not replace the design, rewrite the frontend, or migrate frameworks unless the user explicitly approves.

### Phase 0 — Baseline and inventory (no edits)
1. Identify repository, branch, framework, build/test commands, routes, rendering strategy, deployment constraints, existing CMS, auth, database, and media storage.
2. Inventory every route, section, content field, image, SVG/icon, menu, footer, form, SEO field, responsive breakpoint, theme token, and animation.
3. Trace each visible element to its actual source file and runtime data source; distinguish static, dynamic, third-party, and generated content.
4. Capture screenshots at representative desktop/tablet/mobile sizes, record interactions, animations, accessibility semantics, and performance baselines. If browser access is unavailable, mark visual parity **unverified**, never assumed.
5. Inspect existing versioning, drafts, approval workflow, schema migrations, roles, tenancy, and audit logging. Preserve existing systems where possible.
6. Produce a coverage matrix: route → component → content source → editable properties → proposed CMS schema → risks → verification.
7. Record a clean commit baseline and reversible migration/backup plan.

### Phase 1 — Written implementation plan and approval gates
Provide: architecture findings, coverage matrix, proposed adapters and data model, files to modify, migration and backfill strategy, security boundaries, incremental milestones, rollback procedure, tests, and unresolved questions. Mark design-sensitive or destructive changes as approval-required. Avoid speculative architecture changes.

### Phase 2 — Framework-native CMS integration
1. Keep the original component tree, CSS selectors, DOM semantics, responsive layout, motion, assets, and visual appearance unless a change is explicitly approved.
2. Introduce a framework-appropriate content adapter and schema. Use stable field identifiers and schema versioning; do not couple persistence to array positions or generated DOM selectors.
3. Seed editable content from existing source data. On first enablement, published output must be visually and semantically equivalent to the original website.
4. Add editing affordances only for authorized editor sessions. Normal visitors must not receive editor chrome or editor-only runtime dependencies unnecessarily.
5. Support text, rich text, links, images, alt text, icons, menus, footers, metadata, repeatable blocks, ordering, visibility, and applicable design tokens. Expose layout/style controls only when they can preserve responsive behavior; provide bounded validation and undo.
6. Preserve forms, integrations, structured data, locale routing, accessibility, SSR/SSG/cache behavior, and existing animation triggers.
7. Never silently discard unsupported content or turn unknown fields into blank values. Preserve and report them.

### Phase 3 — Secure editing and publication
- Enforce server-side authentication, role authorization, tenant isolation, CSRF protection where relevant, input/schema validation, upload content inspection, storage quotas, and audit trails.
- Treat content and rich HTML as untrusted; sanitize output against XSS. Do not expose secrets in browser bundles.
- Support drafts, preview, publish, version history, compare, rollback, and conflict detection using optimistic concurrency/version identifiers.
- Publish atomically where storage supports transactions; otherwise provide compensating recovery and never claim atomicity.
- Use explicit durable persistence; do not silently fall back to ephemeral local files in production.
- Use least-privilege media permissions, safe deletion/reference checks, and recoverable backups.
- Preserve public output during migration and use feature flags/canary where practical.

### Phase 4 — Verification gates
Run build, lint, typecheck, tests, migration dry-run, authorization/CSRF/XSS tests, asset and broken-link checks, accessibility checks, and real browser tests for editor and visitor flows.
Compare before/after screenshots across routes, viewports, themes, and locale variants. Verify fonts, spacing, positioning, images, hover/focus, transitions, mobile menus, SEO, page speed, and reduced-motion behavior.
Test editing → save draft → preview → publish → cache invalidation → reload → history → rollback → restore. Test simultaneous editors, stale revisions, interrupted publish, bad uploads, invalid schema, failed persistence, and backup recovery.
Never declare migration complete with missing routes, untested publishing, or unverified visual parity.

### Required final agent report
Provide the baseline commit, changed files, coverage matrix with every field's status, screenshots/diff findings, security tests, test commands and outcomes, migration/rollback evidence, production deployment status, unresolved blockers, and next action. Distinguish implemented, tested, deployed, and verified-in-production.

## Portability rule
The existing SMTS-oriented SKILL.md and reference documents are **examples**, not universal prescriptions. Adapt patterns to the target framework. Do not copy Next.js-specific paths, Supabase, HMAC-cookie auth, singleton stores, or WAAPI into unrelated projects without first proving compatibility.

## Non-negotiable stop conditions
Stop and request explicit approval before destructive database migration, replacing a site's visual design, deleting original assets, changing public URLs, changing auth providers, or deploying to production. Never fabricate test results.
