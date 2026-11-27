# TaskDesk — independent authentication worklog

Reviewed 2026-11-21 against source, PRs, CI and read-only infrastructure checks.
The conversation available in this thread ends its earlier implementation at PR
#4; subsequent progress is reconstructed from Git, PRs and checked-in documents.
Commit messages and old checkboxes are not deployment evidence.

## Resume baseline

- main: 30d30c5 (2026-11-19), protected autonomous batches and CI concurrency.
- dd7cf27 / PR #19: independent authentication implementation is already merged.
- 7badeee / PR #22: search/summary ownership regression tests are merged.
- e2faa95 / PR #21 and fc025ee / PR #20: stale-pagination protection and UTC due
  dates are merged. Search, sorting, bounded lists and server summaries predate them.
- PR #24 is the active, unmerged authentication hardening front. Its reviewed
  starting head ab4bd94 had passing GitHub Actions on the matching SHA. Continue
  this PR rather than recreate its registration/login changes in another branch.

## Status by delivery boundary

| Work item | Source state | Hosted state / next action |
| --- | --- | --- |
| Prisma AuthUser/AuthSession schema | Merged in PR #19; migration and constraint tests exist | Neon has none of the application tables or Prisma migration history |
| Salted scrypt credentials and hashed opaque sessions | Merged, expiry/revocation/cascade tests exist | Not activated; this is application-managed auth, not Neon Auth |
| Register/login/me/logout and Vue flow | Merged, opt-in AUTH_MODE=neon / VITE_AUTH_MODE=neon | Production still selects Supabase |
| Closed registration and equalized unknown-account password work | Implemented in PR #24, not main | Requires additional authentication review; not a constant-timing guarantee |
| Immediate local logout and provider isolation | Added to PR #24 during resumption | Local tests cover slow/failed revocation and removal of private UI |
| Distributed/platform rate limiting and trusted IP boundary | Pending | Existing limiter is per process and is insufficient across serverless workers |
| Email verification and recovery | Pending | verifiedAt exists but no ownership verification/recovery flow is implemented |
| Hosted migration / two-user verification | Blocked | Need an approved isolated target, credentials, migrations and review |
| Supabase retirement / identity cutover | Not performed | Requires an explicit identity and task-ownership plan |

## Infrastructure evidence (2026-11-21)

- Vercel production serves main 30d30c5, deployment marked READY. Actual HTTP
  checks returned /health 200, /ready 503, and anonymous /api/v1/tasks 401.
  READY and liveness do not establish working database access or authenticated CRUD.
- Listed production variables select Supabase and include its public URL/key;
  DATABASE_URL is absent. No preview auth/database variables were listed.
- Supabase taskDesk eztgqelzooznmckehbex exists in sa-east-1 and is INACTIVE.
  The old statement that it had never been created is historical, not current.
- Neon taskdesk polished-voice-01104596 exists on PostgreSQL 17 in aws-sa-east-1.
  A read-only to_regclass check on branch br-small-unit-b6cyf068 / database taskdesk
  returned NULL for Task, AuthUser, AuthSession and _prisma_migrations. No schema
  deployment or data migration is inferred from the existence of the project.

## Resumption validation and next steps

The local batch applied all three existing migrations to disposable PostgreSQL
17. Typecheck, builds, production audit (zero reported vulnerabilities), and all
72 tests passed: 52 API and 20 Vue. New regressions first reproduced the logout
and cross-provider subscription issues, then passed after the fix. Final-head
CI and browser-flow evidence are recorded in PR #24 to avoid confusing an old
passing run with the current branch head.

Local Chromium used two synthetic accounts with the actual independent auth API
and disposable PostgreSQL 17: login, create, persisted reload, normal logout
revocation, cross-user 404 and failed-network logout all passed. The failed
revocation left the server token valid as expected, while clearing browser
storage and private views and showing a warning. No Supabase requests or page
errors occurred. This is local evidence, not a hosted activation.

Next: finish reviewing the complete PR #24 batch and its final-head CI. Do not
merge auth changes automatically. Then address shared/platform throttling and
trusted client IPs, verification/recovery, and an approved isolated hosted flow.
Do not enable independent auth publicly simply because local tests passed.

## Safe configuration and rollback

Keep Supabase as the default. Independent registration stays closed unless both
server and browser flags are explicitly enabled; the server flag is the authority.
No hosted environment, database schema, account or production setting was changed
by this resumption. Existing identities, records and sessions are preserved.

Independent logout removes the local token and private dashboard immediately.
The captured old token is sent only for revocation; auth HTTP requests time out
after eight seconds unless a caller provides its own abort signal. If revocation
fails, the login screen warns that local sign-out succeeded but the server could
not confirm it. The server session can remain valid until revoked or expired.
Supabase session events are not subscribed to when independent mode is selected.

Retain the hardened release with registration flags false/unset if rollout is
postponed; reverting to pre-hardening code would reopen default registration.
No hosted rollback operation is needed for a local-only batch. Do not delete
accounts, reassign tasks, pause projects, apply hosted migrations or change
production providers as an implicit continuation of this review.

## Session restoration follow-up (2026-11-26, local only)

Prepared against PR #24 head 27d048c. A local snapshot's Git tree was verified
identical to that head before editing; unrelated work in another checkout was
preserved. This follow-up was subsequently published as 3d7c0ea in PR #24; it has not been merged or deployed.

Restoration clears the captured token only after /me confirms HTTP 401. Network
errors, timeouts, throttling and other HTTP failures preserve it and show a
retry state instead of the login form. The private dashboard remains hidden
until identity confirmation succeeds. Users can retry explicitly; the browser's
online event also retries after a failed restoration. Concurrent retries are
deduplicated and stale responses cannot restore private views after invalidation
or remove a replacement token.

Regression tests reproduced ten failures before the fix. Local validation used
existing dependencies without installing or changing them: 33 Vue tests and 42
API tests passed; 11 database integration tests were skipped because no disposable
PostgreSQL was configured. Frontend typecheck and production build passed.
The API and database schema were not changed. The existing GitHub Actions check
on 27d048c passed, but does not validate this unpublished follow-up. A new CI run
must follow authorized publication to PR #24 before this batch is considered
fully validated. Production settings and hosted databases remain untouched.

## Master-plan batch — 2026-11-26

Preserved the newer 3d7c0ea session restoration implementation and its tests.
This batch adds the reviewed AuthAttempt schema proposal and per-account
PostgreSQL budgets, failure-closed routing and concurrency/expiry/RLS tests.
See AUDIT.md, IMPLEMENTATION_STATUS.md and adr/0001-shared-account-budgets.md.
No hosted schema, identity provider or production configuration was changed.
