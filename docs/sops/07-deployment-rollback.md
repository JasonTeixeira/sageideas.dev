# Deployment rollback

**Trigger:** A release causes availability, security, payment, signup, data-integrity, or severe performance regression.

**Rollback owner:** Incident commander or delegated platform operator. A **second reviewer** confirms the environment and target before any production change.

## Preconditions

1. Open or link the incident record and record severity, affected surfaces, current deployment identifier, candidate rollback deployment identifier, commit SHA, and start time.
2. Obtain **explicit approval** for a production promotion, rollback, traffic change, or database action.
3. Confirm the candidate is the last known-good deployment for the same environment and that its schema contract is compatible with the current database.
4. Freeze unrelated releases and outbound automation when it could compound the incident.

## Execute

1. Prefer the provider's atomic deployment promotion/rollback. Never rebuild an old commit with current environment assumptions during an incident.
2. Do not reverse a database migration unless a separately reviewed, tested, additive correction exists. Application rollback and data recovery are different operations.
3. Record the operator, reviewer, provider event/deployment identifier, start/end timestamps, and every command or dashboard action with secrets redacted.

## Abort criteria

Abort the rollback and return to incident command if the target is ambiguous, the environment does not match, schema compatibility is unknown, evidence indicates data loss, required approval is absent, or the rollback worsens health.

## Verify health after rollback

1. Confirm public readiness twice over five minutes and record release/region correlation.
2. Inspect error telemetry, SLO status, queues, dead letters, provider webhooks, and audit logs for new failures.
3. Exercise the read-only critical customer journeys appropriate to the incident: public acquisition, signup/login recovery, checkout review, portal access, and Academy practice surfaces.
4. Reconcile the active deployment identifier and commit SHA against the approved rollback target.
5. Monitor for at least one alert evaluation window before declaring the service stable.

## Close or continue

Communicate factual status on the incident cadence. If verification passes, mark the incident monitoring and keep the release freeze until the incident commander closes it. If verification fails, follow the abort criteria, preserve evidence, and choose a new mitigation. A local rehearsal validates this procedure only; it does not prove a live rollback.
