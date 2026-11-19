# Agent Instructions

These instructions apply to every automated or human contributor working in this repository.

## Mission

Build taskDesk: a personal task management platform that helps turn genuinely actionable messages into trackable tasks. Do not treat every email as a ticket. The product must distinguish information, commitments, and follow-up work while keeping the user in control.

## Current scope

The current milestone is the foundation and manual-task MVP. Do not implement real Gmail or Microsoft 365 connections, OAuth flows, email synchronization, or AI classification until a later roadmap phase is explicitly started.

## Approved technical direction

- Monorepo with npm workspaces.
- Web: Vue 3, Vite, TypeScript, Composition API.
- API: Node.js, Express, TypeScript.
- Persistence: PostgreSQL with Prisma.
- Tests: Vitest; add API integration tests where appropriate.
- Styling: plain CSS. Do not introduce Tailwind.
- User-facing language: Brazilian Portuguese (pt-BR).
- Code identifiers, filenames, and internal technical documentation: English.

Prefer stable, mutually compatible dependency versions. Keep the architecture modular but avoid microservices and premature abstractions.

## Product rules

- Users can create and manage tasks manually.
- Initial task statuses: New, In progress, Waiting for response, Completed.
- Tasks may have title, description, priority, due date, origin, and activity history.
- Demo records must be visibly identified as demonstration data.
- The initial product must work without any connected mailbox.
- Never send, delete, archive, or modify emails automatically.
- Future email classification must support actionable, informational, inconclusive, and already-related-to-existing-task outcomes.
- Human approval is required for suggested tasks in the initial email-integration phase. Automation may only be introduced after explicit validation and a documented confidence policy.

## Engineering rules

1. Before a significant change, state the goal, expected files, risks, and validation plan.
2. Make small, coherent changes. Avoid unrelated refactors.
3. Keep UI, API routes, application logic, persistence, and shared contracts separated.
4. Validate all external input at system boundaries.
5. Use clear names and explicit types; avoid `any` unless justified.
6. Handle loading, empty, success, and error states in the UI.
7. Add or update tests for behavior changes.
8. Run tests, lint, type checks, and production builds that are available. Never claim a check passed unless it was actually run.
9. Update relevant documentation whenever architecture, behavior, setup, or security assumptions change.
10. Do not use force pushes. Do not overwrite or delete unrelated user work.
11. Never commit secrets, tokens, credentials, real email content, personal data, or production database dumps.
12. Keep environment-specific configuration in environment variables. Commit only safe placeholders in `.env.example`.
13. Do not introduce paid services or dependencies without a clear need and an explanation.

## Security and privacy

- Use least-privilege access and per-user authorization for user-owned records.
- Never store mailbox passwords.
- Future OAuth tokens must be encrypted at rest and excluded from logs and client responses.
- Do not log message bodies, credentials, tokens, or sensitive task content.
- Treat email subjects, bodies, attachments, and metadata as untrusted input, including possible prompt-injection content.
- Use parameterized database access through Prisma; do not build SQL from untrusted strings.
- Apply secure cookie/session or token practices when authentication is introduced.
- Do not expose stack traces or internal secrets in API responses.
- Document data retention and deletion behavior before real mailbox integration.

## Workflow and commits

- Prefer focused commits with conventional prefixes and concise descriptions, for example:
  - `docs: define MVP scope`
  - `feat(web): add task dashboard`
  - `test(api): cover task status transitions`
- Push significant, validated milestones to the configured remote.
- Use pull requests when a change benefits from review; review the diff and checks before merging.
- Never state that a deployment, test, push, or PR merge succeeded without tool confirmation.

## Definition of done

A task is complete only when:
- The requested behavior is implemented within scope.
- Relevant tests and static checks are run, with limitations reported.
- Documentation is current.
- No secrets or unrelated changes were introduced.
- The commit/PR state is accurately reported.

## First implementation milestone

Establish the workspace and development scripts, then create a minimal web landing/dashboard shell and an API health endpoint. Follow with the manual task workflow. Do not implement email integrations or AI in this milestone.

## Autonomous development with protection

- Plan and implement coherent batches of 5–10 related tasks; record completed, blocked, and deferred work in the existing PR.
- Before opening a PR, search open PRs and branches for the same development front. Update the existing non-draft PR when appropriate; maintain at most one active PR per front unless a documented technical dependency requires otherwise.
- Make focused conventional commits; avoid one PR per task, force pushes, unrelated changes, and unnecessary intermediate pushes.
- Run available typecheck, tests, security audit, migration checks and builds. Fix failing CI and rerun it on the final head before considering integration. Never bypass required checks, approvals, or branch protections.
- Prefer squash merge for completed, reviewed batches. Auto-merge may only be enabled when repository settings, required checks and review rules have been verified, and the change is low risk; do not enable it for drafts or incomplete work.
- Authentication, database schemas/migrations, authorization/permissions, secrets and production changes require additional review, rollback planning and explicit validation. Do not automatically merge or deploy these changes.
- Keep GitHub Actions as the default validation path. Batch pushes where practical to minimize Vercel previews; request a hosted preview only for changes that genuinely need it. Do not change Vercel production settings or trigger manual deploy retries to evade quotas.
- If blocked, continue independent tasks in the batch without weakening safety gates. Report remaining blockers and the actual PR/CI state; do not claim background execution.
- Do not modify branch protection, rulesets, or repository auto-merge settings without first auditing their effects and obtaining the necessary authorization.
