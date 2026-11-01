# Theme, media, CMS widgets and animation integration

The reference maps a live website's existing components onto field paths, not a generic admin form.

## Dynamic theme controls

- reference/cms/ThemeEditorPanel.tsx is dock-accessible editing of the shared site document. Preset scheme, palette overrides, light/dark preview, font roles, reset controls and contrast warnings are reflected live.
- reference/theme/siteTheme.ts defines bounded color keys, presets, input validation, contrast calculations, theme stylesheet and font roles. reference/theme/SiteThemeStyle.tsx renders document-driven CSS tokens; reference/site-theme-wiring includes provider and toggle examples.
- reference/theme-utils contains additional contrast/token helpers. Reuse behavior but replace SMTS-specific preset colors, brands, fonts and content; never force a different site's visitors into SMTS's default palette. Recheck WCAG contrast and desktop/mobile style baseline.
- Theme changes are draft edits until published; switching device/theme preview is not publishing.

## Assets and widgets

- Inline image/icon controls: reference/cms/AssetField.tsx, editable.tsx, EditableIcon.tsx, IconSelector.tsx and uploadAsset.ts.
- Media APIs: reference/api/assets, reference/api/media, reference/server/assetStorage.ts and mediaStore.ts. Validate uploads, SVG safety, content types, storage permissions, and preview/prod isolation.
- Contextual structure/navigation: InlineAddControl, InlineListControls, SiteNavigationEditor, SectionEditor, AdvancedEditorPanel, DynamicFieldEditor and IssuesPanel.
- Content examples (NOT universal schemas): reference/widget-examples/blog, footer, projects, updates and reference/pages. The SMTS marketing content registry and route-slug logic are site-specific; design target paths, dynamic routings, list IDs and translations anew.
- Animation: reference/animation-editor and reference/animations provide intent mapping, scope, per-element/page motion, preview state and reduced-motion behaviors. Do not copy a site's animation settings without visual regression.

## No redundant editor UI

Bind contextual controls on the exact element being edited, with no replacement dashboard, layout shifts or unnecessary re-entry forms. The pinned reference retains dialogs for login, field/schema changes, discarding drafts, and high-impact restoration; do not claim it is fully popup-free. Any change toward a completely dialog-free UX must preserve authorization and destructive-action confirmation.

## Target acceptance

Every visual element must be present in the coverage matrix and have a test for editor/visitor mode, save, preview, publish, restore, theme and mobile view when applicable. Test assets with broken URLs, uploads, SVG, videos, alt text and responsive layout; verify server-owned storage, cache invalidation and historical rendering before signoff.
