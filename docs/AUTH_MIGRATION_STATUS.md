# TaskDesk — independent authentication worklog

Updated 2026-11-15. Source of truth: PR #19 and GitHub Actions run for its latest head.

| Priority | Work item | State | Evidence / next action |
| --- | --- | --- | --- |
| P0 | Add Prisma users/sessions schema | Implemented, pending PR integration | Versioned migration, PostgreSQL integration tests |
| P0 | Hashed opaque sessions and revocation | Implemented, pending PR integration | Unit/integration tests and CI |
| P0 | Salted password hashing and credential service | Implemented, pending PR integration | Unit/integration tests and CI |
| P0 | Register/login/me/logout API | Implemented, pending PR integration | HTTP tests; opt-in AUTH_MODE=neon |
| P0 | Vue login/registration/session/logout | Implemented, awaiting latest CI | Opt-in VITE_AUTH_MODE=neon, browser tests |
| P0 | Validate latest PR #19 head | In progress | Check GitHub Actions run matching head SHA, fix failures |
| P0 | Production-grade rate limiting | Pending | Current per-process IP limiter is insufficient across serverless instances; design shared store and tests |
| P0 | Neon schema deployment | Blocked on validated migration and authorization review | Neon database is empty; do not apply migrations until compatibility/security reviewed |
| P1 | Email verification and recovery | Pending | Add token lifecycle, delivery integration and tests |
| P1 | Hosted end-to-end tests | Pending | Separate environment, valid credentials, and deployment authorization |
| P1 | Retire Supabase auth | Blocked | Only after full independent auth verification and authorized cutover |

## Safe configuration

Keep Supabase as default; opt into Neon auth in a separate development environment only.
Never commit credentials, enable Neon auth in production, merge protected branches,
or deploy Vercel without explicit approval. GitHub Actions is the primary gate.

## Known risks

- Registration currently permits unverified accounts; verification/recovery remain unfinished.
- Browser stores a bearer token in sessionStorage; consider hardened HttpOnly cookies
  with CSRF protection for public release. Do not claim this flow is production-ready.
- In-memory throttling does not enforce global rate limits across serverless workers.
- Existing Supabase users are not migrated; clean re-registration is expected.
