# Roadmap

## Phase 0 — Repository foundation

- [x] Public repository, project overview, agent instructions, and product documentation.
- [x] npm workspaces, Vue dashboard shell, Express API health endpoint.
- [x] GitHub Actions for type checks, tests, and builds.
- [ ] Verify local dependency installation and database startup.

## Phase 1 — Manual task MVP

- [x] Define the initial task and activity database models.
- [x] Add validated task CRUD API endpoints.
- [x] Add API tests for create, list/filter, update, validation, missing records, and delete.
- [x] Add a local PostgreSQL Docker Compose service.
- [ ] Create and verify the first Prisma migration against a running database.
- [ ] Connect the Vue dashboard to the API.
- [ ] Add create/edit forms, filters, and task status controls.
- [ ] Add task activity history to the API and UI.
- [ ] Add browser-level interaction tests.

## Phase 2 — Online deployment and account safety

- [ ] Choose hosting and managed PostgreSQL options based on cost.
- [ ] Configure HTTPS and environment variables.
- [ ] Add authentication and per-user authorization before storing personal tasks online.
- [ ] Add backups, health monitoring, and operational documentation.

## Phase 3 — Email provider foundation

- [ ] Create dedicated test mailboxes before any real account is connected.
- [ ] Design provider adapter interfaces.
- [ ] Implement Gmail and Microsoft 365 OAuth with minimum scopes.
- [ ] Synchronize only the metadata/content required for triage.
- [ ] Add deduplication and retry handling.
- [ ] Keep task creation behind explicit human approval.

## Phase 4 — Assisted triage

- [ ] Establish deterministic baseline rules.
- [ ] Classify messages as actionable, informational, inconclusive, or related.
- [ ] Explain suggestions and show confidence.
- [ ] Add a review queue and approval/rejection actions.
- [ ] Evaluate false positives and false negatives before considering automation.

## Phase 5 — Hardening and expansion

- [ ] Review privacy, retention, and deletion behavior.
- [ ] Add auditability and operational alerts.
- [ ] Improve accessibility and responsive behavior.

A phase is complete only when its acceptance criteria, tests, documentation, and operational implications have been reviewed.
