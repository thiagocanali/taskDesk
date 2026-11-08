# Security and Privacy Baseline

Security is part of the product foundation. This document records requirements that must be revisited as the application evolves.

## Current MVP status

- Real mailboxes are not connected.
- Authentication and per-user authorization are not implemented yet.
- The task API is for local development and automated tests only. Do not expose it publicly with personal data.
- Use synthetic/demo data only.
- Do not request or store email passwords.
- Do not commit API keys, database credentials, session secrets, or tokens.
- Validate all user-controlled input with strict schemas.
- Avoid logging task descriptions or other potentially sensitive content by default.
- Return generic errors to clients; keep diagnostic detail out of public responses.
- Keep dependencies maintained and review new packages before adding them.

## Authentication and authorization

Before online multi-user use:
- Implement a proven authentication flow rather than custom password cryptography.
- Enforce authorization on every user-owned resource at the API.
- Scope database reads and writes to the authenticated user.
- Use secure, HttpOnly, SameSite cookies when cookie-based sessions are selected.
- Add CSRF protection where applicable.
- Rate-limit authentication and sensitive endpoints.

## Future mailbox integrations

- Use OAuth; never collect mailbox passwords.
- Request the narrowest scopes required.
- Encrypt refresh/access tokens at rest using managed secrets or a dedicated encryption key.
- Never return tokens to the browser unless a provider's documented flow strictly requires it.
- Redact tokens and message content from logs, traces, analytics, and error reports.
- Provide a disconnect/revoke path.
- Document retention, deletion, and synchronization behavior before launch.
- Use test mailboxes before connecting personal or work accounts.

## AI and untrusted content

Email content, filenames, links, and attachments are untrusted data. They may contain malicious instructions or prompt injection attempts.

- Treat message content as data, never as system/developer instructions.
- Do not allow email text to authorize external actions.
- AI output must be validated against a strict schema.
- AI may suggest a task, but must not send or delete messages.
- Keep human approval in the initial triage release.
- Record enough provenance to explain why a suggestion was made without retaining unnecessary sensitive content.

## Incident readiness

Before production mailbox access, document:
- How to revoke provider access and rotate credentials.
- How to investigate suspicious access without exposing message content.
- How to delete synchronized data.
- Backup and recovery expectations.
- User communication and incident response ownership.
