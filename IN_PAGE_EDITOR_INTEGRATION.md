# In-page CMS editor integration contract

## UI first: preserve the target website

The existing public page is both the viewing canvas and the editing canvas. Preserve existing DOM layout, CSS, responsive grids, data-loaded content, menus, links, hover states, motion, icons and media. The CMS must enhance the current page, not replace it with an admin builder, modal-only editor, external form or separate dashboard.

Start with reference/cms/CmsRoot.tsx. In SMTS UAT, ?edit=1 sets a sessionStorage unlock flag and lazily mounts CmsTools. This is NOT a permission grant: GlobalEditToolbar checks the authenticated CMS session; lib/api/cms/session/route.ts issues the cookie after login. The editor reads/writes through authenticated server APIs.

## Screen contract

| User state | Render source | Page click/navigation | Content editing | Editor controls |
|---|---|---|---|---|
| Visitor, editor locked | published | enabled | disabled | none |
| Unlocked, not authenticated | published | normal except editor prompts | disabled | key dialog or status |
| Authenticated draft | draft | blocked except CMS controls | enabled | toolbar, content/asset/structure editors |
| Draft preview | draft | enabled | disabled | toolbar and view selector |
| Live/published comparison | published | enabled | disabled | toolbar and view selector |

ClickBlocker is active only when editing and ready. It intercepts clicks and form submissions in capture phase, allows contentEditable and targets under data-cms-ui, Radix portal wrappers, dialogs and toasts. In draft mode, verify navigation, nested links, card buttons, form submits, keyboard Enter/Space, drag/drop, touch and portals. Do not globally preventDefault for allowed CMS controls; Radix depends on it. In preview and published modes, allow normal visitor interactions.

Inline primitive mapping: reference/cms/editable.tsx exposes E (text), EImg (image), EIcon (icon), add/remove helpers. Lists and structured fields use InlineListControls, DynamicFieldEditor and existing widgets. SiteNavigationEditor and ThemeEditorPanel are dock-accessible controls. For each field, map source value, JSON path, fallback, CMS scope, validation and test. Stable IDs are mandatory for reorderable items.

Theme editing is in context through ThemeEditorPanel and SiteThemeStyle (site document); light/dark, preset, color override, font and contrast guard must be preserved. History/Issues/Advanced are contextual panels tied to the toolbar, not a new screen.

## Avoid unnecessary dialogs

Routine text edits, icon/image changes and list controls should operate directly on the existing page using contextual affordances, preserving spatial context. Do not introduce a popup requiring users to re-enter content available on the page. The pinned UAT source still has Dialog/AlertDialog for the edit key, schema field changes, draft discard and restore confirmation. Treat them as explicit existing behaviors and evaluate alternatives separately; never silently remove security checks or the explicit confirmation for destructive actions.

## Acceptance examples

- ?edit=1 does not expose drafts to unauthenticated visitors and a copied URL does not grant access.
- Clicking any normal link in draft mode cannot navigate away accidentally; the exact same link works in preview, published and visitor states.
- Editing text, media, site chrome, repeaters and theme occurs on the live canvas without layout replacement.
- Save conflicts preserve the local draft with a visible recovery option; publishing is blocked until resolved.
- Published content changes only on successful server-confirmed release. History is immutable, and restoring an old snapshot creates a new version.
- Every target route has a visual desktop/mobile baseline and after-state screenshot; mark untested or inaccessible conditions unverified.
