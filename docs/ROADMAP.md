# Roadmap

## Phase 0 — Foundation
- [x] Public repo, overview, agent instructions, product documentation.
- [x] npm workspaces, Vue shell, Express health endpoint.
- [x] CI workflow for type checks, tests, and builds.
- [ ] Verify local setup and database startup.

## Phase 1 — Manual task MVP
- [x] Define initial task/activity database models.
- [x] Implement validated task CRUD API.
- [x] Add route tests for create, list/filter, update, validation, missing records, and delete.
- [x] Add local PostgreSQL Docker Compose service.
- [ ] Generate and verify first Prisma migration against a running database.
- [ ] Connect Vue dashboard to the API.
- [ ] Add task forms, filters, status controls, and activity history.
- [ ] Add browser interaction tests.

## Phase 2 — Online and secure
- [ ] Choose hosting and managed PostgreSQL based on cost.
- [ ] Configure HTTPS and environment variables.
- [ ] Add authentication and per-user authorization before storing personal tasks online.
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
