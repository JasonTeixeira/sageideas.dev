import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

import { ALERT_CATALOG } from '../../lib/observability/alert-catalog'
import { auditObservabilityRecoveryContract } from '../../lib/observability/contract'

const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')
const input = {
  packageScripts: JSON.parse(read('package.json')).scripts,
  healthSource: read('app/api/health/route.ts'),
  portalHealthSource: read('app/api/portal/health/route.ts'),
  sloSource: read('app/api/telemetry/slo/route.ts'),
  errorTelemetrySource: read('app/api/telemetry/error/route.ts'),
  perfTelemetrySource: read('app/api/telemetry/perf/route.ts'),
  sentrySources: [read('sentry.client.config.ts'), read('sentry.server.config.ts'), read('sentry.edge.config.ts')],
  loggerSource: read('lib/observability/structured-log.ts'),
  observabilityPageSource: read('app/admin/observability/page.tsx'),
  incidentRunbook: read('docs/sops/05-incident-response.md'),
  recoveryRunbook: read('docs/sops/06-data-backup-restore.md'),
  rollbackRunbook: read('docs/sops/07-deployment-rollback.md'),
  alertCatalog: ALERT_CATALOG,
}
const findings = auditObservabilityRecoveryContract(input)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: 'observability-recovery',
  status: findings.length === 0 ? 'pass_local_contract' : 'fail',
  controls: {
    publicReadiness: 'bounded_anonymous_probe_with_safe_error_codes',
    telemetryPrivacy: 'bounded_redacted_route_only',
    telemetryFailure: 'privacy_safe_structured_signal',
    sloFailure: 'unknown_and_503',
    tracing: 'bounded_sampling_and_scrubbed_events',
    alerts: ALERT_CATALOG,
    incidentResponse: 'roles_severity_cadence_timeline_blameless_postmortem',
    rollback: 'approved_two_person_target_and_verification',
    recovery: 'approved_isolated_rpo_rto_integrity_reconciliation',
  },
  deterministicEvidence: [
    'known-good and deliberately broken contract fixtures',
    'telemetry redaction, URL minimization, metric bounds, and sampling tests',
    'signal-to-alert mapping tests',
    'recovery-drill evidence validator tests',
    'checked-in source and runbook audit',
  ],
  externalEvidencePending: [
    'Configure a real alert destination and prove delivery/escalation in isolated staging.',
    'Observe release-correlated Sentry traces and scrubbed events over an operating window.',
    'Perform an approved isolated deployment rollback drill.',
    'Perform an approved isolated database and storage restore drill and measure achieved RPO/RTO.',
    'No credential, deployment, remote restore, provider mutation, or customer communication was performed.',
  ],
  findings,
}
const output = resolve(root, 'docs/evidence/project-loop/observability-recovery-audit.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ status: report.status, findings: findings.length, evidence: relative(root, output) }))
if (findings.length) process.exitCode = 1
