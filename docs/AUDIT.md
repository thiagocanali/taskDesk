# Engineering audit — 2026-11-26

## Scope and evidence
Reviewed main 30d30c5, PR #24 head 3d7c0ea and the pending shared-budget changes.
The repository has 77 tracked files at that PR baseline. This is a source,
configuration and automated-test audit, not a claim that every future feature
or WCAG requirement has been validated. Existing ENGINEERING_REVIEW.md remains
a historical baseline; do not copy its obsolete findings as current defects.

Read-only infrastructure checks on this date:
- Vercel task-desk has five Supabase auth configuration variables, no DATABASE_URL
  and no hidden production secrets reported. Node 26 is configured; CI uses 22.
  The latest returned deployment is a canceled preview, not proof production is down.
- Supabase taskDesk exists and is INACTIVE.
- Dedicated Neon project polished-voice-01104596, branch br-small-unit-b6cyf068,
  database taskdesk: to_regclass returned NULL for Task, AuthUser, AuthSession,
  AuthAttempt and _prisma_migrations. No hosted schema or identity cutover occurred.
- Main remains 30d30c5. PR #24 is open; later branch changes must not be described
  as integrated. Last previously green CI: 45271308952 on 27d048c.

## Inventory
| Boundary | Implemented | Limits / evidence |
| --- | --- | --- |
| Monorepo | npm workspaces, Vue/Vite/TypeScript, Express, shared package | Preserve stack; no rewrite or Tailwind |
| API | Strict task validation, bounded pagination, search/sort, owner summaries | No OpenAPI contract, request IDs or structured request logs yet |
| Persistence | Prisma PostgreSQL adapter; bounded reusable pool; atomic task/history updates | Hosted schema absent; migrations must precede activation |
| Authorization | Owner-scoped CRUD, search, summary and activity queries; foreign IDs return 404 | Hosted two-user test remains a gate |
| Authentication | Supabase default; optional application-managed credentials and revocable sessions | Independent mode is not managed Neon Auth |
| Frontend | Login, CRUD, history, filters, search, progressive list loading, error/empty states | TaskDashboard.vue is 506 lines, 27 KB; several concerns remain combined |
| Dates | UTC date-key semantics shared by current UI/API | User-specific timezones and timed tasks not implemented |
| CSS / UX | Plain CSS, current responsive rules and interactive component tests | No complete visual audit, keyboard audit or measured contrast report in this batch |
| Quality | CI: locked install, audit, migrations, typecheck, tests, builds against PostgreSQL 17 | No lint script; no committed browser E2E suite |
| Operations | /health and /ready are separate; generic server errors | No graceful shutdown, alert configuration or verified restore drill |
| Integrations | None activated | Email/AI remain gated; no mailbox data was fetched |

## Prioritized findings
| ID | Priority | Finding | Action / status |
| --- | --- | --- | --- |
| A-01 | P0 | No usable hosted database connection/schema | BLOCKED: isolated target, credentials and deployment approval |
| A-02 | P0 | Per-process throttle can be bypassed across serverless instances | IN_REVIEW: atomic PostgreSQL per-account budget in this batch |
| A-03 | P1 | Temporary identity failures erase valid browser credentials | IN_REVIEW: incoming 3d7c0ea preserves tokens and supports guarded retry |
| A-04 | P1 | Public abuse can rotate accounts or consume a victim's account budget | BACKLOG: platform-wide limits and trusted proxy/IP validation |
| A-05 | P1 | No independent email verification or password recovery | BACKLOG; registration remains closed by default |
| A-06 | P1 | sessionStorage exposes bearer tokens to script on origin | READY: ADR for HttpOnly cookies, CSRF/origin policy and staged migration; do not silently change auth |
| A-07 | P1 | Expired sessions and attempt rows need operational retention | READY: cleanup design, bounded deletion and monitoring before public launch |
| A-08 | P2 | Large dashboard and API/date logic embedded in component | READY: extract API client and date utilities with regression coverage |
| A-09 | P2 | API has no request IDs/OpenAPI or privacy-preserving request metrics | READY: foundation observability batch |
| A-10 | P2 | CI Node 22, Vercel Node 26; docs contain historical runtime claims | READY: validate a runtime matrix before production configuration changes |
| A-11 | P2 | Visual/mobile/accessibility verification is incomplete | READY: rendered audit, keyboard/focus/contrast and viewport evidence |
| A-12 | P3 | Themes, PWA, calendar, command palette and focus mode absent | BACKLOG after foundation |
| A-13 | P4 | Collaboration, billing and public webhooks not in current product | Deferred; do not scaffold prematurely |

No evidence of a currently exploitable cross-user task read was found in the
reviewed owner filters/tests. This is not a certification that all security
defects are absent. No complete dead-code analysis, load test, Lighthouse run or
production browser login was performed. List those as unverified, not passing.

## Validation boundary
This batch locally regenerated Prisma, type-checked all workspaces, compiled all
applications and passed 79 tests (46 API, 33 web). Fifteen PostgreSQL tests require
a disposable database and are delegated to final-head CI, including the new
concurrency/expiry/RLS tests. The existing network-enabled shell failed to start;
Node-based direct tool entry points were used instead. No lint command exists.
No hosted migrations, production settings or real data were changed.

See IMPLEMENTATION_STATUS.md for delivery states and exact resumption point.
