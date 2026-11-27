# Deployment

## Runtime and boundaries

Use Node 22.12 or newer. The Supabase SDK is pinned to 2.119.0 and requires Node 22+.
The web application and API are served from the same Vercel project, rooted at
apps/web. Its vercel.json installs the complete locked workspace dependency graph
(including build tooling), builds the API before the Vite client and rewrites
/api/v1/* and /health to api/index.mjs. The function reuses one Express app and
Prisma pool per warm instance. Prisma 7 uses the PostgreSQL driver adapter with
a maximum of five connections, a five-second connection timeout and a ten-second
idle timeout. Prisma CLI reads DATABASE_URL from apps/api/prisma.config.ts; client
generation does not require runtime secrets. Pool sizing is configured in the
adapter, not through legacy connection_limit URL parameters. Include files outside the root directory in Vercel
monorepo settings so the API workspace and generated Prisma client are packaged.
Do not expose a second unauthenticated API deployment.

## Hosted configuration

The configuration below describes Supabase mode. The alternative application
authentication mode requires `AUTH_MODE=neon` on the server and
`VITE_AUTH_MODE=neon` at client build time, plus DATABASE_URL and all committed
migrations. It is not Neon Auth, and a database provider must be chosen explicitly.
Do not switch modes on a live application without an identity/ownership plan.

Independent HTTP registration is closed by default. Only set
`AUTH_ALLOW_REGISTRATION=true` (server) and
`VITE_AUTH_ALLOW_REGISTRATION=true` (client build) after reviewing the signup
policy. The client flag does not grant permission on its own. Public activation
also requires platform-wide request limits and the checks in SECURITY.md. Account
attempt budgets now use PostgreSQL: apply the additive AuthAttempt migration
before releasing this code. Without the table, login fails closed with 503. Use a
trusted server role able to access the RLS-protected AuthAttempt table, and schedule
cleanup of rows expired for over one day. Never run migrations from HTTP handlers.

Migration rollback: retain the additive AuthAttempt table if reverting the app;
do not drop it while any new server instance is running. An older app release has
only local limiting, so restrict public traffic before reverting. No existing
user, session or task is modified by this migration. Verify shared-budget
concurrency and expired-window tests in an isolated database before approval.

For rollback of this change, keep both registration flags unset or false and
retain the hardened server release. Do not revert to a release with public
registration enabled by default. Disabling registration does not delete accounts
or revoke existing sessions. This change requires no database migration and does
not change the selected production authentication mode.

Choose a dedicated Supabase project before activation. Never reuse an unrelated
application database. New resources may incur cost; do not provision a paid
project without the user's approval.

Configure these in each intended Vercel environment (preview and production
should use separate databases/projects):

| Variable | Purpose | Browser exposure |
| --- | --- | --- |
| DATABASE_URL | Server-only PostgreSQL connection, with pooling for serverless workloads | Never |
| AUTH_MODE | supabase | No |
| SUPABASE_URL | Dedicated project URL | Public URL |
| SUPABASE_PUBLISHABLE_KEY | sb_publishable_ key for token verification | Public key |
| VITE_SUPABASE_URL | Same auth project URL | Yes |
| VITE_SUPABASE_PUBLISHABLE_KEY | Same publishable key | Yes |

Leave VITE_AUTH_MODE unset. Never deploy AUTH_MODE=local. Do not put secret or
service_role keys into browser variables. VITE_* variables are baked into the
client at build time; redeploy after changing them. The API fails closed with 503
and the client shows an unavailable state when authentication is unconfigured.

Use a server-only trusted PostgreSQL role that can bypass RLS, with credentials
kept in the deployment secret store. Follow Supabase's Prisma/pooling connection
guidance; migrations may require a direct/session connection rather than a
transaction-pool connection. DATABASE_URL may be set differently for the one-off
migration process. Never run migrations from a request handler.

## Activation sequence

1. Confirm the project and database, back up existing data, and review the migration.
2. Apply npm run db:deploy --workspace @taskdesk/api with a migration connection.
   Existing ownerless tasks remain untouched and invisible. Do not auto-assign them.
3. Configure the variables above and redeploy the intended environment.
4. Provision two synthetic email/password accounts in Supabase Auth. Keep public
   signup disabled unless deliberately needed; configure password policy and rate
   limits. No real mailbox integration is needed.
5. Verify health, unauthenticated 401, login, persisted CRUD/history, second-user
   isolation, logout and expired sessions in the deployed environment.
6. Run Supabase security/performance advisors, configure backups and monitoring,
   then evaluate whether personal data can be admitted.

## Validation performed for this change

Type checks, unit/component tests, production build and PostgreSQL integration
tests are run before commit. A local Chromium check exercises login, create,
reload persistence, logout and a second isolated account against the actual API
and PostgreSQL, with a synthetic Auth HTTP provider. This proves the application
flow under the provider contract; it does not prove a hosted Supabase account or
Vercel database connection is configured.

The existing connected task-desk Vercel project had no environment variables at
review time. Hosted activation remains pending project selection and credentials.

## Health and readiness probes

- GET /health is a public liveness probe and does not access PostgreSQL.
- GET /ready is a public database readiness probe. It runs a minimal SELECT 1 through the same Prisma connection pool used by the API. HTTP 200 means the query succeeded; HTTP 503 means unavailable. It does not reveal credentials or database error details.
- A successful /ready response does not establish that migrations, RLS, Supabase Auth, or task CRUD work. Verify those independently before accepting real data.
- Monitor both probes separately; alert on repeated /ready failures while /health remains healthy. Avoid exposing either endpoint as proof of production readiness on its own.

## Preview deployment budget (Vercel Hobby)

Git-connected branches currently trigger Vercel preview deployments on push, even
when changes affect only tests, documentation or backend logic already covered by
GitHub Actions. A canceled preview can still consume deployment quota. The
GitHub Actions CI is the primary validation gate: PostgreSQL 16 migrations,
security audit, typecheck, tests and production builds run for pull requests.

**Default contributor workflow:** commit locally as often as needed, but push
one coherent, validated batch per PR milestone; prefer PRs with a single push
when practical. Do not force-push, suppress CI or merge unvalidated changes.
Avoid manual Vercel CLI deploys and retries while Hobby quota is exhausted.
Reserve a preview for changes requiring hosted runtime validation (Vercel
routing, environment-dependent auth, serverless behavior, browser integration).
A Vercel READY build is not proof of database connectivity or working auth.

**Optional project-level control (requires separate approval):** Vercel's Git
settings support an Ignored Build Step command and, depending on plan and
integration, branch/environment deployment controls. An ignored-build command
must be reviewed against the production branch and all deployment triggers;
never install a blanket skip that can suppress production releases. Confirm
current product support and test on a disposable non-production project before
changing project settings. Do not alter production Git settings automatically.

**Evidence:** Vercel deployment history for `task-desk` includes multiple
canceled preview records for successive commits on
`fix/dashboard-request-races` and `fix/api-default-list-limit`, while
`main` received its own production deployment. This confirms the cost of
intermediate pushes; it does not prove that canceled builds are free.
