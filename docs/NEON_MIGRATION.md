> Current status: see AUTH_MIGRATION_STATUS.md (reviewed 2026-11-21).
> The implementation inventory below reflects the verified source; historical
> migration plans must not be mistaken for a completed hosted cutover.

# Neon migration — taskDesk

## Current state

Neon project `taskdesk` (`polished-voice-01104596`) exists in
`aws-sa-east-1`, PostgreSQL 17, with an independent default `main` branch.
The existing Supabase project remains unchanged; no production cutover has
been performed. Do not assume that Neon schema or authentication is ready.

## Dependency inventory (audited on main)

| Component | Current dependency | Migration requirement |
| --- | --- | --- |
| Database | Prisma 7, PostgreSQL adapter | Keep Prisma; run versioned migrations against Neon |
| API auth | `apps/api/src/auth/authentication.ts` | Optional server-validated opaque sessions implemented; Supabase remains default |
| Browser auth | `apps/web/src/auth.ts`, `App.vue` | Optional independent flow implemented; preserve existing Supabase mode |
| Package dependencies | `@supabase/supabase-js` in both workspaces | Remove after replacement and lockfile regeneration |
| Task ownership | `Task.ownerId` UUID, repository owner filters | Bind to new auth user UUID; test cross-user access |
| Task history | `TaskActivity` via parent task | Preserve scoped access and cascading deletes |
| Database migrations | Prisma migrations `init`, `task_ownership` and `independent_auth` | Apply to clean Neon DB, inspect RLS/owner privileges |
| Hosting | Vercel API + Vite web | Configure secret server-only Neon URL per environment |
| CI | GitHub Actions PostgreSQL service | Validate against PostgreSQL 17; use isolated ephemeral DB |
| Storage/Realtime/Edge | No application use identified in audited source | No replacement service required for current MVP |

## Safe cutover sequence

1. Implement and test independent authentication with a versioned users,
   sessions and verification schema. Prefer a maintained authentication library
   that supports Express and Prisma/PostgreSQL. Never reuse Supabase JWTs as
   Neon sessions; create new accounts after migration.
2. Preserve existing task ownership boundaries. Test a user cannot read,
   update or delete another user's tasks or history.
3. Apply the complete versioned Prisma migration history to the dedicated Neon
   database using a secure direct/unpooled connection. Do not manually create
   tables and then falsely mark migrations as applied.
4. Verify schema, indexes, constraints, PostgreSQL 17 compatibility, SSL and
   transactions. Do not remove RLS until database role privileges and API
   authorization have been reviewed and tested.
5. Configure environment-scoped server-only `DATABASE_URL` and auth secrets.
   Never expose database URLs or auth secrets through `VITE_*` variables.
6. Run registration, login, logout, recovery, session expiry and two-user CRUD
   tests on an isolated environment. Keep Supabase unchanged as rollback until
   functional verification is complete.
7. Cut over Vercel only with explicit production deployment authorization;
   avoid intermediate previews and do not interpret READY as a health check.

## Blockers

- Hosted Neon schema has not yet been migrated with Prisma migration history.
- Supabase remains selected in production. Independent auth and tests are implemented in main; PR #24 hardening is pending integration and public-release gates remain.
- Production Vercel environment has not been changed. Do not publish a cutover
  until migrations, authentication and API integration are validated.

## Rollback

Keep the original Supabase resources and original Vercel environment variables
untouched until a validated cutover. Revert the application release and its
corresponding environment configuration if hosted validation fails. Never
blindly copy or discard user records.

## Incremental auth implementation (PR #19)

- Versioned AuthUser and AuthSession migrations are covered by disposable DB tests.
- Auth session tokens are random 256-bit opaque values; SQL stores only SHA-256
  hashes, expiry and revocation state.
- Passwords use versioned salted scrypt hashes; raw passwords are never persisted.
- The optional server-only `AUTH_MODE=neon` enables register/login/me/logout
  endpoints. Existing Supabase mode remains the default.
- HTTP registration and login are rate limited by client IP (in-process). This
  is only a preliminary defense: deploy a shared rate limiter before scaling to
  multiple serverless instances, and add account verification, recovery, and
  session lifecycle controls before public release.
- The browser has an optional independent flow selected by VITE_AUTH_MODE=neon. It is application-managed auth, not Neon Auth. Do not enable it in production before the hosted flow and remaining release gates pass.
