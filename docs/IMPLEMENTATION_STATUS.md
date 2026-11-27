# Implementation status

Updated 2026-11-26. Delivery states distinguish implementation, review, integration
and hosted activation. Source in an open PR is IN_REVIEW, not DONE.
The master plan supplied on 2026-11-26 is the product direction; existing
AGENTS.md safety/review gates remain in force.

## Active batch — foundation audit and authentication (PR #24)
| ID | Phase / priority | Task | Dependencies | State | Acceptance / evidence | Files |
| --- | --- | --- | --- | --- | --- | --- |
| TD-100 | 00 / P0 | Reconcile main, PRs, CI and infrastructure | Read-only connectors | IN_REVIEW | Audit identifies real code vs hosted state; no duplicate PR | AUDIT.md |
| TD-101 | 00 / P0 | Persistent roadmap, status and debt inventory | TD-100 | IN_REVIEW | All master phases mapped; blockers and next action recorded | ROADMAP.md, TECHNICAL_DEBT.md |
| TD-102 | 02 / P0 | Shared account attempt budget | PostgreSQL; additive migration | IN_REVIEW | Exactly ten admissions across concurrent clients; expiry resets; RLS; errors fail closed | attempts.ts, schema.prisma, shared_auth_attempts migration |
| TD-103 | 02 / P0 | Connect shared throttle to auth routes | TD-102 | IN_REVIEW | 429 + Retry-After before credentials; 503 on store error; logout independent | routes.ts, attempts.test.ts |
| TD-104 | 01 / P1 | Preserve tokens during temporary identity outages | Existing independent auth | IN_REVIEW | Preserved incoming 3d7c0ea: network/503/429 retain token; guarded retry; 401 clears | auth.ts, App.vue, related specs |
| TD-105 | 18 / P0 | Regression and integration coverage | TD-102–104 | IN_REVIEW | Local tests/types/build pass; final CI runs migrations and all PostgreSQL tests | attempts*.test.ts, auth.neon.spec.ts |
| TD-106 | 02 / P0 | Document release, retention and rollback | TD-102–105 | IN_REVIEW | Migration before code, shared-store outage policy, privacy and rollback documented | SECURITY.md, DEPLOYMENT.md, ARCHITECTURE.md |
| TD-107 | 19 / P0 | Validate final PR head and review boundaries | TD-100–106 | IN_PROGRESS | Final-head CI successful; no automatic auth merge/production activation | PR #24 |

The session-restoration implementation from concurrent commit 3d7c0ea was preserved rather than overwritten or reimplemented.
The source implementation was validated locally on the synchronized PR snapshot,
not on an old conversation state. A local synchronization commit is bookkeeping
only and is not published as product history. The backup stash is retained.

## Previously implemented (do not repeat)
Main 30d30c5 includes manual task CRUD/history, atomic persistence, strict inputs,
owner isolation, bounded pagination, title/description search, sorting, server
summaries, UTC due-date handling, readiness, Supabase mode and optional independent
credentials/sessions. PR #24 already includes closed registration, unknown-user
password work, local logout safety and provider isolation. Those PR fixes are
not yet integrated into main.

## Blocked release tasks
| ID | Priority | Task | Blocker | Acceptance / next action |
| --- | --- | --- | --- | --- |
| TD-108 | P0 | Hosted database and identity cutover | Target/credentials and explicit deployment approval | Use dedicated isolated DB, complete Prisma history, two-user hosted flow; preserve Supabase |
| TD-109 | P1 | Wider abuse prevention | Trusted client IP/platform enforcement not validated | Shared request limits without trusting arbitrary forwarded headers |
| TD-110 | P1 | Verification and recovery | Provider/delivery/consent design | Single-use expiring tokens; no enumeration; no real emails sent implicitly |
| TD-111 | P1 | Retention and restoration | Operational design and review | Cleanup attempts/sessions safely; restore drill with disposable data |

## Next batch after review
1. Add request IDs, structured metadata-only diagnostics and response-contract tests.
2. Add API timeouts/cancellation and extract a tested frontend API client.
3. Write the cookie/session ADR before changing storage or transport.
4. Perform a rendered responsive/keyboard audit and establish design tokens.
5. Add browser E2E to CI with a disposable database, without paid services.

Do not start email integration or AI until the foundation/privacy gates and the
separate integration phase are explicitly opened. Do not enable auto-merge on
this authentication/migration batch. Continue independent tasks when hosting is
blocked. Resume from PR #24, verify its current head, then follow this ledger.
