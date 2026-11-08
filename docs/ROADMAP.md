# Roadmap

The roadmap is ordered by dependency. Each phase should be completed and validated before the next begins.

## Phase 0 — Repository foundation

- [x] Create public GitHub repository.
- [x] Add project overview.
- [ ] Add contributor/agent instructions and product documentation.
- [ ] Establish npm workspace and application folders.
- [ ] Add formatting, linting, type-checking, and test scripts.
- [ ] Add minimal web app and API health endpoint.
- [ ] Verify local development and production builds.

## Phase 1 — Manual task MVP

- [ ] Define and migrate the initial task schema.
- [ ] Implement task create, read, update, and delete behavior.
- [ ] Implement task status and priority transitions.
- [ ] Build dashboard, filters, task detail, and edit form.
- [ ] Add activity history.
- [ ] Add clearly labeled demo records.
- [ ] Cover domain rules and API behavior with tests.

## Phase 2 — Online deployment and account safety

- [ ] Choose hosting and managed PostgreSQL options based on cost and operational needs.
- [ ] Configure HTTPS and environment variables.
- [ ] Add authentication and per-user authorization.
- [ ] Add backups, health monitoring, and basic operational documentation.
- [ ] Verify production build and persistence.

## Phase 3 — Email provider foundation

- [ ] Create dedicated test mailboxes before any real account is connected.
- [ ] Design provider adapter interfaces.
- [ ] Implement Gmail OAuth with minimum scopes.
- [ ] Implement Microsoft Graph OAuth with minimum scopes.
- [ ] Synchronize only the metadata/content required for triage.
- [ ] Add deduplication and retry handling.
- [ ] Keep all task creation behind explicit human approval.

## Phase 4 — Assisted triage

- [ ] Establish deterministic baseline rules.
- [ ] Classify messages as actionable, informational, inconclusive, or related.
- [ ] Explain suggestions and show confidence.
- [ ] Add a review queue and approval/rejection actions.
- [ ] Evaluate false positives and false negatives using test data.
- [ ] Consider high-confidence automation only after documented evaluation and explicit product decision.

## Phase 5 — Hardening and expansion

- [ ] Review privacy, retention, and deletion behavior.
- [ ] Add auditability and operational alerts.
- [ ] Improve accessibility and responsive behavior.
- [ ] Evaluate additional providers or workflows only when justified.

## Release discipline

A phase is not complete because code exists. It is complete when its acceptance criteria, tests, documentation, and operational implications have been reviewed.
