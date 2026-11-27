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

## Master-plan alignment — 2026-11-26

The earlier phase numbers above are historical milestones. The following mapping
uses the user's current master-plan numbering; implemented entries above are not
recreated. Detailed states/acceptance live in IMPLEMENTATION_STATUS.md.

| Phase | Priority | Scope | Current boundary / next action |
| --- | --- | --- | --- |
| 00 | P0 | Audit | Source/infrastructure audit in AUDIT.md; rendered visual audit pending |
| 01 | P0 | Stability/architecture | Preserve stack; next request IDs, errors, API client, graceful shutdown, OpenAPI |
| 02 | P0 | Auth/security/Neon | PR #24 hardening plus shared budgets; hosted cutover separately blocked |
| 03 | P1 | UX/design system | Audit rendered views first; tokens, themes, responsive layout; no dead modules |
| 04 | P1 | Task core | Existing CRUD/search/history/paging preserved; next archive/restore and safe task evolution |
| 05 | P1 | Operational dashboard | Counts exist; next today/focus explanations based on persisted tasks |
| 06 | P1 | Projects/areas/tags | Backlog; owner-scoped additive model and optional organization |
| 07 | P2 | Manual inbox | Backlog; explicit conversion/linking and duplicate prevention |
| 08 | P2 | Gmail/Microsoft | Gated by foundation, privacy and separate integration authorization |
| 09 | P2 | Classification | Gated; deterministic baseline, structured outputs and human review |
| 10 | P2 | Follow-ups | Backlog; manual persisted follow-ups before provider-based detection |
| 11 | P3 | Calendar/planning | Backlog; shared task data and explicit timezone/date semantics |
| 12 | P3 | Notifications/automation | Backlog; idempotent execution, preferences and no sensitive external actions |
| 13 | P3 | Optional assistant | Backlog; authorized real data, no invented facts or direct model writes |
| 14 | P3 | Global search/focus | Task search exists; other entities wait for real models |
| 15 | P2 | Settings/privacy | Backlog; session management, export/retention and deletion policy |
| 16 | P3 | Mobile/PWA/accessibility | Responsive CSS exists; measure keyboard/contrast/viewports before claims; no sensitive offline cache |
| 17 | P2 | Performance | Bounded requests/pool exist; measure workloads before adding indexes/cache |
| 18 | P0 | Quality | CI migrations/tests/types/build/audit; add reproducible browser E2E |
| 19 | P0 | Governance | Existing protected-batch workflow retained; one PR per active front |
| 20 | P2 | Observability | Health/readiness exist; next privacy-safe IDs/logs/latency metrics |
| 21 | P2 | Documentation/portfolio | Honest source/hosted status, ADRs and actual diagrams; screenshots only after rendered checks |

P4 collaboration, billing, native apps, public APIs and webhooks remain deferred.
No email/AI integration phase was opened implicitly by accepting this roadmap.
