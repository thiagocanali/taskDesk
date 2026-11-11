# Roadmap

## Phase 0 — Foundation
- [x] Public repo, overview, agent instructions, product documentation.
- [x] npm workspaces, Vue shell, Express health endpoint.
- [x] CI workflow for type checks, tests, and builds.
- [ ] Verify local setup and database startup.

## Phase 1 — Manual task MVP
- [x] Define initial task/activity database models.
- [x] Implement validated task CRUD API.
- [x] Add route tests for create, list/filter, update, validation, missing records, and delete, including strict filters, invalid dates, empty updates, and missing activity history.
- [x] Add local PostgreSQL Docker Compose service.
- [x] Apply the initial Prisma migration to an ephemeral PostgreSQL 16 database in CI.
- [x] Connect Vue dashboard to the API.
- [x] Add task forms, status and priority filters, status controls, and activity history.
- [x] Record field-level history with previous and new status/priority values; ignore no-op updates.
- [x] Add overdue and upcoming due-date indicators.
- [x] Add browser-environment component interaction tests for combined filters, due-date indicators, task creation, editing, status changes, history, and confirmed deletion.
- [x] Add API error-handling and HTTP security-header regression tests.

- [x] Persist task mutations and activity history atomically; test PostgreSQL rollback and concurrency.
- [x] Use locked CI installs and validate persistence against the CI database.

## Phase 2 — Online and secure
- [ ] Choose hosting and managed PostgreSQL based on cost.
- [ ] Configure HTTPS and environment variables.
- [x] Implement Supabase Auth login, verified Bearer tokens and per-user ownership on all task/history operations.
- [x] Quarantine legacy ownerless tasks and deny direct Data API reads with RLS.
- [x] Prepare same-origin Vercel Function routing for the API.
- [ ] Activate a dedicated Supabase project, run migrations and validate hosted login with synthetic accounts.
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
- [ ] Retention/deletion review, auditability, operational alerts, accessibility.
