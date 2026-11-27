# ADR 0001 — shared account attempt budgets

Date: 2026-11-26. Status: proposed for review in PR #24.

## Context
The existing IP limiter is process-local. Vercel can serve requests from multiple
instances and restart them, so it cannot enforce a shared account budget.
There is no approved external cache and the application already requires PostgreSQL.

## Decision
Use one atomic parameterized upsert per normalized account before password work,
with database time, ten admissions in fifteen minutes and a capped counter.
Login and opt-in registration share the budget. Logout and /me remain independent.
Add an RLS-protected AuthAttempt table and an expiry index via Prisma migration.
Fail closed with a generic 503 on store errors. Preserve the local IP cap.

This works with the existing PostgreSQL adapter regardless of the eventual
hosting provider. It adds no paid service or provider-specific credential.

## Alternatives and consequences
A Redis/platform limiter may later replace/complement this after configuration,
cost and trusted-IP review. A local Map alone cannot coordinate instances.
Account throttling can be abused to exhaust a victim's budget; rotating account
names can grow storage. Keep public signup closed, layer platform request limits,
monitor resource use and schedule bounded retention before public activation.
Derived keys are personal data; no anonymization claim is made.

## Verification and rollout
Integration tests use independent clients, concurrent requests, expiry resets,
RLS metadata and forged forwarding headers. Apply the additive migration to a
disposable DB in CI before review. A hosted migration requires separate approval.
Retain the table during app rollback; dropping it while new instances run would
deny login. An older release only has local throttling, so restrict public traffic
before rollback. Existing tasks, credentials and sessions are not rewritten.
