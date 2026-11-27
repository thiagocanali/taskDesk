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

## Client transport follow-up — 2026-11-27

TaskDashboard now delegates transport to services/api.ts. It preserves existing
payloads, selected-provider Bearer handling and unauthorized events. ApiError
retains HTTP status and a bounded server request ID for diagnosis; the user-facing
message does not include that metadata. No token, payload or URL is logged.

The default fifteen-second deadline covers credential retrieval, fetch and JSON
decoding. Caller cancellation is separate from timeout. Superseded list/summary
and pagination requests are canceled on filter changes and disposal; existing
generation guards remain necessary when a transport ignores cancellation.
Canceled requests cannot dispatch an unauthorized event from a late 401 response.

There are no automatic retries, especially for mutations: the server may commit
after the client stops waiting. Users must refresh persisted state before retrying.
Canceling a client request does not roll back a database transaction. The current
timeout is not a measured SLA or a guarantee of server availability.

| ID | Phase / priority | Task | State | Acceptance / files |
| --- | --- | --- | --- | --- |
| TD-205 | 01 / P1 | Extract reusable API client | IN_REVIEW | Existing payloads and auth behavior; services/api.ts |
| TD-206 | 20 / P2 | Typed errors and request-ID correlation | IN_REVIEW | Safe messages, status/correlation metadata, 204/invalid JSON handling |
| TD-207 | 01 / P1 | Bound requests without automatic retries | IN_REVIEW | Timeout while awaiting credentials or mutation response; no late fetch |
| TD-208 | 01 / P1 | Cancel obsolete dashboard reads | IN_REVIEW | Filter/unmount cancellation plus retained generation guards |
| TD-209 | 18 / P0 | Regression tests and diagnosis guidance | IN_REVIEW | Transport/unit and dashboard interaction coverage; final-head CI |
