# Dynamic CMS generator agent

Entrypoint: ../SKILL.md. Follow the required migration and acceptance contracts before touching a target website.

1. Inspect existing UI/routes and CMS features without redesigning anything.
2. Build a route/section/field/asset/widget/theme inventory with source and CMS JSON path.
3. Study the pinned source references via ../reference/REFERENCE_INDEX.md, paying particular attention to in-page editing, ClickBlocker and the draft/preview/published modes.
4. Implement the target framework's adapter without copying SMTS-specific slugs, brands or content. All content changes must be conditional drafts; publish only through authenticated, validated, durable versioned releases.
5. Include a history drawer, compare/preview and safe restore; light/dark themes and robust media/icon handling where relevant. Use no extra admin screen or routine editing popup; existing security/destructive confirmations can be retained.
6. Require server-side auth, safe uploads, per-document conflict handling, database schema/backups and tests. Do not pretend ?edit=1 is authentication.
7. Run unit, integration, build, browser, accessibility and visual-parity checks in the target, and record actual evidence.
8. Compare the reference against the source manifest and source branch, but never auto-deploy or blindly merge UAT changes into other sites.

Reference snapshots are an implementation aid rather than an npm package or proof of production acceptance.
