# Security and Privacy

## Authentication and authorization

- Supabase Auth email/password accounts are provisioned by the project operator.
  No self-service signup, mailbox OAuth or email sending is implemented.
- API requests require a Bearer token verified against Supabase Auth getUser.
  Missing/invalid tokens return 401; missing provider configuration or provider
  outages fail closed with 503. Health remains public. Anonymous Supabase accounts
  are rejected. No authorization decision uses user_metadata.
- Every list, read, update, delete and history lookup is owner-scoped. Unknown and
  foreign IDs both return 404. The API rejects ownerId in request payloads.
- Legacy tasks retain a NULL owner and are invisible to all application identities.
  Assign ownership only after explicit operator review; never claim all old tasks
  for the first user to sign in. Back up before running the migration on real data.
- RLS denies direct client access to Task, TaskActivity and _prisma_migrations.
  Prisma uses a trusted server-only database role with BYPASSRLS. The browser uses
  only publishable keys, never database credentials or service_role/secret keys.

## Browser session

Sessions use sessionStorage, bounded to the current tab. Dashboard state is
unmounted on logout, user changes or API 401 responses. getSession is used only
for browser session/token retrieval; it is never the server identity authority.
Bearer headers are not automatically attached by browsers, so cookie-based CSRF
is not the API authentication model. The API enables no cross-origin access.

Browser-readable tokens require XSS prevention. Vue escapes task text; do not add
raw HTML rendering of user content. Passwords are cleared after successful login.
Sign-out is scoped to the current session. Existing access tokens can remain valid
until expiry; this release does not promise immediate JWT revocation. Configure
short token lifetimes and use explicit session checks for future sensitive actions.

## Local development

AUTH_MODE=local is an explicit development-only bypass with a fixed synthetic UUID.
It requires NODE_ENV=development and a loopback API_HOST, and is rejected on Vercel
or production. VITE_AUTH_MODE=local is honored only by the Vite development build.
Both development servers bind to loopback by default. Never override the web
server host to expose the local API through Vite's proxy, or use real personal
data in bypass mode.

## Data and operations

Task deletion cascades to activity history. Removing an Auth account does not
currently delete its tasks; retain or delete orphaned data through a reviewed
operator process. No mailbox data or OAuth tokens are stored. Logs and generic
errors must not expose task contents, provider errors, credentials or tokens.
JSON is limited to 100 KB and validated with strict schemas. Login rate limiting
and password policies are provided by Supabase Auth; configure platform rate
limits before wider public use. The production dependency audit is clean after the Zod/Prisma upgrades. Five
moderate development-only package entries remain in the Vue test formatting
chain; see DEPENDENCIES.md for scope and upgrade decisions.

Before activation: use a dedicated project, configure HTTPS, restrict signups,
verify two-user isolation, review Supabase advisors, and establish backups and
monitoring. See DEPLOYMENT.md.

## Future email/AI

Use OAuth with minimum scopes and encrypted tokens. Treat email content as
untrusted input. AI may suggest tasks, never send or delete messages. Human
approval remains mandatory in the first triage release.
