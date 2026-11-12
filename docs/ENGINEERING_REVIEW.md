> Historical baseline from the first review. Authentication, ownership and
> Vercel API routing have since been implemented on the authentication branch;
> hosted activation remains pending. Production dependency advisories were
resolved in the subsequent dependency hardening work; see DEPENDENCIES.md. See
> DEPLOYMENT.md and SECURITY.md for the current design.

# Engineering review — 2026-11-11

## Scope and findings

Reviewed the repository instructions, product/architecture/security/roadmap documents,
workspace manifests and lockfile, CI, Prisma schema and migration, API routes,
validation, persistence, Vue dashboard and component tests, and local configuration.
The application remains a manual-task MVP. Email integration and AI are deferred.

### Implemented

- Persist task creation and its CREATED activity as one nested Prisma write.
- Persist task changes and all field history in one serializable transaction.
  Retry P2034 serialization conflicts up to three total attempts, rereading the
  task each time. Other failures propagate to the generic API error handler.
- Move activity messages out of HTTP routes; the repository owns the atomic
  mutation/history contract. No schema migration is needed.
- Exercise actual PostgreSQL persistence, rollback on activity failure, concurrent
  updates, missing records, no-op history and cascading deletion in integration tests.
- Run integration tests against the disposable CI database via TEST_DATABASE_URL.
- Use npm ci in CI so validation installs the committed dependency graph.
- Return HTTP 413 for oversized JSON without logging the request or treating it
  as an unexpected server failure.

## Prioritized follow-up work

1. **Authentication and ownership before online personal data.** Introduce a
   confirmed identity provider and owner model, migrate existing demo records
   explicitly, and test cross-user isolation on every CRUD/history endpoint.
   The current API is unauthenticated and cannot safely serve personal tasks online.
2. **Confirm infrastructure linkage.** The connected Vercel account has a
   task-desk project with a READY production frontend deployment. No connected
   Supabase project is named taskDesk; a database association has not been proven.
   GET https://mytaskdesk.vercel.app returned HTTP 200, while
   GET https://mytaskdesk.vercel.app/api/v1/tasks returned HTTP 404 during this
   review. This proves the default same-origin API route is unavailable; an
   independently configured API origin was not verified.
   Do not repurpose another application's database. Confirm API hosting, database,
   same-origin routing, secrets, backups and readiness monitoring together.
3. **Dependency advisories.** npm audit --omit=dev reports five high-severity
   package entries: zod, deepmerge-ts, @prisma/config, prisma and @prisma/client.
   These represent two advisory roots (GHSA-mrhx-c7xc-m3w5 and
   GHSA-ggr8-5vv4-36mx), not five independent exploits. npm reports no automatic
   fix. Plan compatible Zod/Prisma upgrades with schema and boundary regression
   tests. The API currently validates bounded scalar task fields and caps JSON at
   100 KB; this does not establish that the advisories are resolved.
4. **Bound list growth.** Add cursor pagination and adapt dashboard summaries and
   filtering together; pagination alone would silently make current counts wrong.
5. **Frontend maintainability and interaction races.** Split API access, date
   handling and task/history forms into focused modules; guard per-task writes
   and late history responses, preserving existing component interaction tests.
6. **Operational lifecycle.** Add graceful HTTP/Prisma shutdown and a separate
   database readiness probe. Keep liveness independent from database readiness.

## Validation

Executed successfully: npm ci, npm run typecheck, npm run build and git diff
--check. Applied the committed migration to an isolated PostgreSQL 16 container.
With TEST_DATABASE_URL configured, npm test passed 31 tests (17 API including
three PostgreSQL integration tests, 14 Vue component tests). No lint command is
configured. npm audit --omit=dev returned nonzero for the advisories listed above.
Local validation used Node 24.22.1; CI remains configured for Node 20. Run locally with a disposable
PostgreSQL database and apply migrations before enabling integration tests:

```sh
DATABASE_URL="$TEST_DATABASE_URL" npm run db:deploy --workspace @taskdesk/api
npm run typecheck
npm test
npm run build
```

Integration tests skip when TEST_DATABASE_URL is absent. They create synthetic
records and a temporary failure trigger, remove their own records/trigger, and
must never target a shared or production database. No hosted data was changed.
