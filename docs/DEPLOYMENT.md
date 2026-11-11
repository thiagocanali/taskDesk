# Deployment

## Runtime and boundaries

Use Node 22 or newer. The Supabase SDK is pinned to 2.119.0 and requires Node 22+.
The web application and API are served from the same Vercel project, rooted at
apps/web. Its vercel.json builds the API before the Vite client and rewrites
/api/v1/* and /health to api/index.mjs. The function reuses one Express app and
Prisma pool per warm instance. Include files outside the root directory in Vercel
monorepo settings so the API workspace and generated Prisma client are packaged.
Do not expose a second unauthenticated API deployment.

## Hosted configuration

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
