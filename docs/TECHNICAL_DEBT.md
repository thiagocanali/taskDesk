# Technical debt register

Updated 2026-11-26; AUDIT.md is the evidence inventory, IMPLEMENTATION_STATUS.md
owns task state. This file records tradeoffs, not a second implementation ledger.

| Priority | Debt | Why it matters | Safe treatment |
| --- | --- | --- | --- |
| P0 | Hosted schema/config not activated | READY builds cannot serve persisted user tasks | Dedicated target, credentials, migration review, synthetic verification |
| P1 | Custom auth lifecycle incomplete | No verified email, recovery or account/session management | Keep signup closed; design expiring one-time workflows before public release |
| P1 | Script-readable tokens | XSS can access sessionStorage | Evaluate HttpOnly/Secure/SameSite with origin/CSRF rules; preserve existing users |
| P1 | Account budgets are not platform abuse limits | Account rotation causes row growth; victim budget exhaustion affects availability | Layer platform request limits, trusted-IP verification, retention and monitoring |
| P1 | Shared budget retention not scheduled | Expired rows reset but inactive keys accumulate | Index exists; reviewed bounded cleanup; no production cron added implicitly |
| P2 | TaskDashboard combines API, forms, dates and layout | 506 lines couples independent behavior | Extract tested modules incrementally; preserve stale-response guards |
| P2 | List search uses contains/ILIKE and offset pagination | Deep offsets/search can cost more at scale | Measure query plans/workload first; consider cursor/FTS only with evidence |
| P2 | History endpoint returns whole activity list | Long-lived tasks can grow response size | Add bounded paging with compatibility and UI support |
| P2 | Contract types duplicated between Vue and API | Drift risk | Consolidate used contracts without a premature shared framework |
| P2 | No request IDs or structured request metrics | Hard to correlate outages without sensitive logs | Log status/duration/request ID only; never bearer/body/query values |
| P2 | No shutdown pool lifecycle | Local processes may close abruptly | Inject pool lifecycle and test SIGTERM shutdown separately from serverless |
| P2 | No committed browser E2E or lint command | Local/manual evidence is harder to reproduce | CI disposable full-flow tests; choose lint scope/config explicitly |
| P2 | Runtime versions differ | Local/CI/Vercel behavior may diverge | Matrix validation; production settings require authorization |
| P2 | Visual accessibility not measured | Responsive CSS alone does not prove keyboard/contrast/mobile quality | Rendered viewport and keyboard checks, then measured improvements |
| P3 | No themes/PWA/calendar/advanced task organization | Product roadmap rather than an existing regression | Implement after secure core with real persistence |
| P4 | Shared workspaces/billing/public API | Premature complexity | Defer until core is proven |

No performance benefit, WCAG compliance or legal compliance is claimed without
measurement/review. No service is introduced solely to eliminate a hypothetical
scaling issue.
