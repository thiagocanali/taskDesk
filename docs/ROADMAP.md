# Roadmap

## Phase 0 — Foundation
- [x] Public repo, overview, agent instructions, product documentation.
- [x] npm workspaces, Vue shell, Express health endpoint.
- [x] CI workflow for type checks, tests, and builds.
- [x] Verify disposable PostgreSQL startup and all versioned migrations during the resumption review (PostgreSQL 17).

## Phase 1 — Manual task MVP
- [x] Define initial task/activity database models.
- [x] Implement validated task CRUD API.
- [x] Add route tests for create, list/filter, update, validation, missing records, and delete, including strict filters, invalid dates, empty updates, and missing activity history.
- [x] Add local PostgreSQL Docker Compose service.
- [x] Apply the initial Prisma migration to an ephemeral PostgreSQL database in CI (now PostgreSQL 17).
- [x] Connect Vue dashboard to the API.
- [x] Add task forms, status and priority filters, status controls, and activity history.
- [x] Record field-level history with previous and new status/priority values; ignore no-op updates.
- [x] Add overdue and upcoming due-date indicators.
- [x] Add browser-environment component interaction tests for combined filters, due-date indicators, task creation, editing, status changes, history, and confirmed deletion.
- [x] Add API error-handling and HTTP security-header regression tests.

- [x] Persist task mutations and activity history atomically; test PostgreSQL rollback and concurrency.
- [x] Use locked CI installs and validate persistence against the CI database.

## Phase 2 — Online and secure
- [x] Configure Vercel hosting and inventory dedicated Supabase/Neon resources.
- [ ] Approve the target authentication/database environment and cutover plan.
- [x] Serve HTTPS on Vercel and configure Supabase auth variables.
- [ ] Configure and validate server-only database connectivity; current production readiness returns 503.
- [x] Implement Supabase Auth login, verified Bearer tokens and per-user ownership on all task/history operations.
- [x] Quarantine legacy ownerless tasks and deny direct Data API reads with RLS.
- [x] Prepare same-origin Vercel Function routing for the API.
- [ ] Activate and validate the approved hosted environment with synthetic accounts. Supabase taskDesk exists but is inactive; Neon exists without the application schema.
- [ ] Add backups and monitoring.

## Phase 3 — Email providers
- [ ] Create dedicated test mailboxes.
- [ ] Add Gmail and Microsoft 365 OAuth with minimum scopes.
- [ ] Synchronize only required metadata/content and deduplicate.
- [ ] Keep task creation behind explicit human approval.

## Phase 4 — Assisted triage
- [ ] Deterministic baseline rules, classification, explanations, confidence.
- [ ] Review queue and approval/rejection.
- [ ] Evaluate false positives/negatives before considering automation.

## Phase 5 — Hardening
- [x] Upgrade production dependencies to resolve the initial Zod/Prisma advisories.
- [x] Upgrade Vite/Vitest and Vue tooling to remove high/critical development advisories.
- [ ] Track remaining moderate advisories in the Vue test formatting dependency chain.
- [ ] Retention/deletion review, auditability, operational alerts, accessibility.

## Pagination and dashboard — implemented in main

- [x] Bounded legacy listing (50 rows) and validated page/limit requests (limit 1–100).
- [x] Vue progressive loading in pages of 25 and server-side status/priority filters.
- [x] Owner-scoped case-insensitive title/description search and deterministic sorts.
- [x] Server-side summary counts independent of the loaded page.
- [x] Reject stale page responses after filter changes; normalize due-date handling to UTC.
- [x] PostgreSQL tests verify search/summary cannot expose another user's tasks.

This is implemented source behavior, not evidence of a functioning hosted database.

## Independent authentication — implementation and release gates

- [x] Merge additive AuthUser/AuthSession migration and revocable opaque sessions (PR #19).
- [x] Implement scrypt credentials, optional HTTP auth and Vue session restoration/logout.
- [ ] Integrate reviewed PR #24: closed registration, login hardening and local logout safety.
- [ ] Enforce distributed/platform throttling with a reviewed trusted-IP boundary.
- [ ] Implement email ownership verification, recovery and session-retention operations.
- [ ] Apply migrations only to an approved isolated hosted target; validate two-user CRUD and logout.
- [ ] Approve identity/ownership transition before changing production or retiring Supabase.

See AUTH_MIGRATION_STATUS.md for checked commits, infrastructure evidence and
remaining blockers. A passing CI run or READY deployment is not a hosted cutover.
