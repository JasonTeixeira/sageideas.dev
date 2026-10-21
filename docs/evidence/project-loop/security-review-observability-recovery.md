# Observability and Recovery Security Review

- Reviewed: 2026-09-04
- Scope: public health probes, telemetry ingestion and SLO reporting, Sentry configuration, structured logs, alerts, incident response, deployment rollback, and recovery-drill evidence
- Result: PASS for safe local code and deterministic evidence
- Unresolved critical/high local findings: none

## Threat model and controls

This workstream handles privileged telemetry and operational decisions. The relevant threats are public service-role use, secret/PII capture, query-string token retention, forged or abusive telemetry, unbounded metrics, raw provider-error disclosure, false-green SLOs, unbounded tracing overhead, ambiguous rollback targets, and recovery claims without an approved isolated drill.

The implementation now:

- uses a two-second anonymous database readiness probe for public health and exposes only safe error codes plus release/request correlation;
- removes service-role access from the public portal health endpoint;
- keeps public telemetry schema-bounded and rate-limited, strips URL origin/query/fragment, redacts common credentials and email addresses, bounds user agents, and emits a privacy-safe persistence-failure signal;
- bounds every web-vital measurement by metric and rejects non-finite or implausible values;
- returns HTTP 503 with unknown values when SLO queries fail and keeps missing samples unknown rather than healthy;
- labels errors-per-vital-sample as a diagnostic ratio rather than a true request error rate;
- disables default PII in every Sentry runtime, bounds trace sampling to 0..1, and scrubs requests, users, exceptions, breadcrumbs, contexts, and extras before delivery;
- maps availability, error, latency, dead-letter, and stale-recovery signals to explicit severity, owner, threshold, and runbook;
- requires incident roles, factual communication cadence, UTC timelines, blameless postmortems, two-person rollback target review, abort criteria, and post-rollback verification;
- validates recovery evidence for approval, isolation, a distinct second reviewer, disabled external writes, complete integrity checks, evidence hashes, record/storage reconciliation, and measured RPO/RTO.

## Deterministic proof

- `npm run test:observability-recovery`: 6 tests passed, including known-good and deliberately broken fixtures, telemetry privacy/bounds, alert mapping, recovery evidence validation, and checked-in source/runbook audit.
- `npm run test:security`: 15 passed, 0 failed.
- `npm run test:unit`: 334 passed, 0 failed.
- `npm run project:program:test`: 10 passed, 0 failed.
- `npm run typecheck`, `npm run lint`, and the Next.js production build passed.
- The 22-command canonical observer passed with zero production or development dependency vulnerabilities.

## Evidence not claimed

No monitoring credential or alert destination was configured. No Sentry event, page, provider action, production rollback, database/storage restore, customer communication, deployment, push, or other external mutation was performed. Only an approved isolated remote rollback/restore drill and a real operating observation window can close those external readiness gaps.
