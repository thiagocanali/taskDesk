# Security and Privacy

## Current status
- No real mailboxes connected.
- Authentication and per-user authorization are not implemented.
- API is for local development/tests only; do not expose it with personal data.
- Use synthetic/demo data.
- Never commit credentials, tokens, or database passwords.
- Validate inputs with strict schemas and avoid logging task content.
- Return generic errors; never expose stack traces or secrets.

## Before online multi-user use
- Add proven authentication and per-resource authorization.
- Scope every database query to the authenticated user.
- Use secure HttpOnly SameSite cookies if cookie sessions are selected.
- Add CSRF protection where applicable and rate-limit sensitive endpoints.

## Future email/AI
Use OAuth and minimum scopes; encrypt tokens at rest; redact tokens and message content from logs; provide disconnect/revoke and data deletion. Treat email, links, filenames, and attachments as untrusted input and possible prompt injection. AI can suggest tasks but cannot send or delete messages. Human approval remains mandatory in the first triage release.
