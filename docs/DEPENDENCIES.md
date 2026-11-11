# Dependency hardening — 2026-11-11

## Decisions

| Component | Selected version | Reason |
| --- | --- | --- |
| Zod | 4.6.7 | Patched constrained-collection memory exhaustion advisory |
| Prisma CLI/client/pg adapter | 7.10.1 | Stable release with patched deepmerge-ts dependency |
| Vitest | 5.1.0 | Removes old UI/mock-server and worker-pool critical/high chains |
| Vite | 8.3.8 | Patched supported build/dev-server release |
| Vue Vite plugin | 6.0.10 | Compatible with Vite 8 and existing Vue 3 |
| Vue type checker | 3.3.14 | Current compatible type-checking dependency chain |
| Vue test utilities | 2.5.1 | Latest stable test helper release at review time |

The upgraded package versions are pinned and the npm lockfile is committed. Prisma's latest npm tag
points to an 8.0.0 release candidate; it was deliberately not selected. Node
22.12+ is required by the new stable tooling. CI uses Node 22.

Prisma 7 requires the PostgreSQL driver adapter. The shared factory creates a
bounded pool per application instance; repository ownership, serializable
transactions and retry behavior are preserved. CLI datasource configuration moves
from schema.prisma to prisma.config.ts. No database schema change or new migration
is required for this dependency upgrade. Zod uses flattenError while retaining
the existing error/details response shape.

## Audit results

- Before upgrades: production audit reported five high package entries from the
  Zod and deepmerge-ts advisory roots. The full audit additionally reported high
  and critical development-tool advisories.
- After upgrades: npm audit --omit=dev reports zero vulnerabilities.
- The full audit retains five moderate package entries in one development-only
  chain: @vue/test-utils -> js-beautify -> editorconfig/glob -> minimatch.
  Root advisories: GHSA-3g3m-2fjr-6pw4 and GHSA-g3hv-75wg-m249.
- These packages format test output and process developer-controlled paths. They
  are not application runtime dependencies. They are not treated as fixed or
  suppressed. Upstream js-beautify 2.0.3 still depends on affected glob/minimatch
  major versions. Do not force incompatible transitive major-version overrides
  merely to make the full audit green; upgrade when upstream supports the patched
  chain, or replace the formatter dependency with a reviewed alternative.

CI now runs npm run audit:prod and rejects high/critical production advisories.
Moderate development advisories remain visible in the full npm audit output.

Audit results are point-in-time registry observations, not a guarantee that no
unknown vulnerabilities exist.

## Verification

The 46 API/component tests (30 API and 16 Vue) passed with TEST_DATABASE_URL.
Type checks, production builds and the Chromium flow also passed locally.

Run type checks, all API/component tests with TEST_DATABASE_URL, production builds
and the dependency audits. Apply the existing migrations on a disposable database
and run prisma migrate diff from the configured datasource to schema.prisma:
no difference must be detected. Confirm the login/create/reload/logout/two-user
flow in Chromium with actual API/PostgreSQL and synthetic authentication. Hosted
Supabase activation is separately blocked by the account's free-project quota;
no unrelated project should be paused without an explicit selection.
