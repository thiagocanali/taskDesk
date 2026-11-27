# API request diagnostics

Proposed independent foundation batch, 2026-11-26. No hosted configuration,
identity, schema or API response-body contract changes are required.

## Correlation and privacy
Every Express request receives a server-generated UUID in X-Request-ID before
JSON parsing, including 400/401/404/413/500/503 responses. Caller-supplied IDs
are ignored. Operators can correlate the response header with one structured
http_request event containing requestId, normalized method, registered route
template, status, durationMs and completed/aborted outcome.

The event contains no raw URL/path/query, task/user identifier, IP, request or
response body, email, authorization/cookie header, token or exception detail.
Unmatched requests use the constant unmatched label. Mounted routes may share
the same template; this deliberately favors privacy over granular URL metrics.

Timing uses a monotonic clock and measures server response completion, not
end-to-end browser latency. Aborted responses have null status. Finish/close
notifications produce at most one event. A failing log sink is best effort and
cannot crash the request. No external monitoring vendor is added.

## Diagnosis
1. Read X-Request-ID from the failing response; never copy bearer/body into tickets.
2. Find the matching structured event in existing server logs.
3. Compare status/duration and /health versus /ready. A healthy liveness probe
   does not prove database, migrations or authentication are ready.
4. Investigate the service boundary using synthetic data. Keep production
   credentials and task/email content out of diagnostic output.

Log storage/retention/access is an operator responsibility and must be reviewed
before public activation. This change neither installs telemetry exports nor
changes production retention. The generic central API error remains generic.

## Acceptance / checkpoint
- Server-generated unique request IDs and response/log correlation.
- Structured status/duration/outcome with no sensitive fields.
- Parser and authentication failure regression coverage.
- Route-template and unmatched-path privacy tests.
- Logging failures isolated from API availability.
- Full final-head CI must pass before integration.

Rollback only requires the previous application code: no migration, secret or
deployment configuration is involved. Production release remains separately
authorized. Next: define a measured latency/error baseline and OpenAPI contract;
do not infer performance gains or full observability from instrumentation alone.

## Batch ledger

Branch: feat/api-request-diagnostics, stacked on auth PR #24 (999f7b3).
The dependency is explicit: main still has the vulnerable effect version already
fixed in #24. This delta changes only diagnostics, but must not integrate before
the authentication/schema review of its base. No duplicate security patch is made.

| ID | Phase / priority | Task | State | Acceptance / files |
| --- | --- | --- | --- | --- |
| TD-200 | 01 / P1 | Server request IDs | IN_REVIEW | Unique non-reflected UUID headers; observability.ts |
| TD-201 | 20 / P2 | Structured completion metadata | IN_REVIEW | Status/duration/outcome without raw URL or user fields |
| TD-202 | 18 / P0 | Error/lifecycle regressions | IN_REVIEW | Parser/auth failures, aborted and duplicate completion covered |
| TD-203 | 18 / P0 | Privacy and sink-failure regressions | IN_REVIEW | Sensitive sentinels absent; logging failure cannot fail API |
| TD-204 | 21 / P2 | Diagnosis/retention/rollback guidance | IN_REVIEW | This runbook; no external telemetry or production configuration |

Final-head CI evidence is recorded in the PR. No lint script exists. Database
integration runs only on a disposable database. Next action: review before
integration; add OpenAPI and real operational baselines in a later batch.
