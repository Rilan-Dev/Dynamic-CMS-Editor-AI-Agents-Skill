# Migration acceptance contract

An agent MUST produce evidence, not merely say a migration is complete.

## Deliverables
- Target repository/branch and baseline commit; framework, runtime, data sources, and deployment inventory.
- Route-by-route coverage matrix including original source, CMS field mapping, type, editor capability, and verification status.
- Visual baseline screenshots and after screenshots for desktop/tablet/mobile, across available themes/locales. Report diffs; preserve original UI/UX unless expressly approved.
- Security evidence: server-side authorization, CSRF defenses where applicable, XSS sanitation, asset validation, and no secret leakage.
- Draft/publish/version-history/compare/rollback recovery evidence and concurrent edit conflict handling.
- Build, test, accessibility, performance, and browser test commands with outcomes.
- Backup, schema migration dry-run, feature-flag rollout, and rollback procedure.

## Status vocabulary
Use **not started**, **implemented**, **tested**, **deployed**, **verified in production**, **blocked**, or **unverified**. Never conflate these states.

## Blocking acceptance failures
Any missing route, unmapped editable content, unintended visual difference, lost animation, broken mobile navigation, broken form, authorization bypass, unsafe upload, non-durable production storage, or untested rollback blocks sign-off. Where screenshot/browser tooling is unavailable, visual parity is **unverified**. Never invent screenshots or test evidence.

## Definition of done
Every in-scope field has an owner, CMS path, editing method, publish verification, and rollback verification. Public pages match the approved baseline. Admin changes are permission-gated and recoverable. User approval is required for any design-changing or destructive action.
