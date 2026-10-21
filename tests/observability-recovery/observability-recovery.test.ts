import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  auditObservabilityRecoveryContract,
  parseTraceSampleRate,
  redactTelemetryText,
  sanitizeTelemetryUrl,
  validateRecoveryDrillEvidence,
  validateWebVital,
} from '../../lib/observability/contract'
import { ALERT_CATALOG, evaluateOperationalSignals } from '../../lib/observability/alert-catalog'
import { scrubSentryEvent } from '../../lib/observability/sentry-policy'

const fixture = (name: string) => JSON.parse(readFileSync(`tests/observability-recovery/fixtures/${name}.json`, 'utf8'))

test('known-good observability and recovery contract passes', () => {
  assert.deepEqual(auditObservabilityRecoveryContract(fixture('known-good')), [])
})

test('deliberately broken contract fails across every production dimension', () => {
  const codes = new Set(auditObservabilityRecoveryContract(fixture('known-broken')).map((finding) => finding.code))
  for (const code of [
    'script_missing',
    'health_timeout_missing',
    'health_error_redaction_missing',
    'portal_service_role_health',
    'slo_fail_open',
    'slo_no_data_healthy',
    'telemetry_url_sanitization_missing',
    'telemetry_secret_redaction_missing',
    'telemetry_metric_bounds_missing',
    'telemetry_failure_signal_missing',
    'sentry_pii_control_missing',
    'sentry_sample_bounds_missing',
    'structured_log_contract_missing',
    'incident_roles_missing',
    'incident_communications_missing',
    'recovery_objectives_missing',
    'recovery_evidence_boundary_missing',
    'rollback_contract_missing',
    'alert_catalog_incomplete',
  ]) assert.ok(codes.has(code), `expected broken fixture finding: ${code}`)
})

test('telemetry privacy and bounds fail closed', () => {
  assert.equal(sanitizeTelemetryUrl('/reset-password?token=secret#fragment'), '/reset-password')
  assert.equal(sanitizeTelemetryUrl('https://sageideas.dev/checkout/audit?client_secret=nope'), '/checkout/audit')
  assert.equal(sanitizeTelemetryUrl('javascript:alert(1)'), null)
  const redacted = redactTelemetryText('Bearer abc.def.ghi user@example.com sk-proj-secret password=hunter2')
  assert.doesNotMatch(redacted, /abc\.def|user@example|sk-proj|hunter2/)
  assert.match(redacted, /\[REDACTED\]/)

  assert.equal(parseTraceSampleRate('0.2'), 0.2)
  assert.equal(parseTraceSampleRate('2'), 0.1)
  assert.equal(parseTraceSampleRate('not-a-number'), 0.1)
  assert.equal(validateWebVital('LCP', 2500), true)
  assert.equal(validateWebVital('LCP', 120001), false)
  assert.equal(validateWebVital('CLS', -1), false)
  assert.equal(validateWebVital('UNKNOWN', 1), false)

  const event = scrubSentryEvent({
    message: 'token=secret-value',
    request: { url: 'https://sageideas.dev/reset?token=secret-value', headers: { authorization: 'Bearer secret' }, cookies: 'session=secret' },
    user: { id: 'user-1', email: 'user@example.com', ip_address: '127.0.0.1' },
    exception: { values: [{ value: 'password=hunter2' }] },
    breadcrumbs: [{ message: 'Bearer abc.def.ghi', data: { email: 'user@example.com' } }],
  })
  assert.deepEqual(event.request, { url: '/reset', query_string: undefined, cookies: undefined, headers: undefined, data: undefined })
  assert.deepEqual(event.user, { id: 'user-1' })
  assert.doesNotMatch(JSON.stringify(event), /secret-value|user@example|hunter2|abc\.def/)
})

test('alert policy maps actionable signals to severity, owner, and runbook', () => {
  assert.equal(ALERT_CATALOG.length, 5)
  const alerts = evaluateOperationalSignals({
    readinessFailuresFiveMinutes: 2,
    errorRateFiveMinutes: 0.07,
    lcpP75FifteenMinutes: 2700,
    deadLetters: 1,
    recoveryPointAgeHours: 25,
  })
  assert.deepEqual(alerts.map((alert) => alert.id), ['availability', 'errors', 'latency', 'jobs', 'backups'])
  assert.ok(alerts.every((alert) => alert.owner && alert.runbook && alert.severity))
})

test('recovery drill evidence requires approval, isolation, reconciliation, and measured objectives', () => {
  const good = {
    approved: true,
    isolatedTarget: true,
    operator: 'primary-operator',
    reviewer: 'second-operator',
    startedAt: '2026-09-04T10:00:00.000Z',
    restoredAt: '2026-09-04T11:30:00.000Z',
    sourceRecoveryPointAt: '2026-09-04T09:00:00.000Z',
    integrityChecks: ['migration_chain', 'constraints', 'rls', 'tenant_isolation', 'business_reconciliation', 'storage_inventory', 'read_only_smoke'],
    externalWritesDisabled: true,
    evidenceHashes: ['sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    reconciliation: { sourceCriticalRecords: 120, restoredCriticalRecords: 120, missingStorageObjects: 0 },
  }
  assert.deepEqual(validateRecoveryDrillEvidence(good), { ok: true, failures: [], achievedRpoHours: 1, achievedRtoMinutes: 90 })
  const broken = validateRecoveryDrillEvidence({ ...good, approved: false, isolatedTarget: false, reviewer: 'primary-operator', externalWritesDisabled: false, integrityChecks: [], evidenceHashes: [], reconciliation: null })
  assert.equal(broken.ok, false)
  assert.deepEqual(broken.failures, ['approval_missing', 'isolated_target_missing', 'second_reviewer_missing', 'external_writes_not_disabled', 'integrity_checks_incomplete', 'evidence_hashes_missing', 'reconciliation_missing'])
})

test('checked-in repository passes the observability and recovery source contract', () => {
  const input = {
    packageScripts: JSON.parse(readFileSync('package.json', 'utf8')).scripts,
    healthSource: readFileSync('app/api/health/route.ts', 'utf8'),
    portalHealthSource: readFileSync('app/api/portal/health/route.ts', 'utf8'),
    sloSource: readFileSync('app/api/telemetry/slo/route.ts', 'utf8'),
    errorTelemetrySource: readFileSync('app/api/telemetry/error/route.ts', 'utf8'),
    perfTelemetrySource: readFileSync('app/api/telemetry/perf/route.ts', 'utf8'),
    sentrySources: [
      readFileSync('sentry.client.config.ts', 'utf8'),
      readFileSync('sentry.server.config.ts', 'utf8'),
      readFileSync('sentry.edge.config.ts', 'utf8'),
    ],
    loggerSource: readFileSync('lib/observability/structured-log.ts', 'utf8'),
    observabilityPageSource: readFileSync('app/admin/observability/page.tsx', 'utf8'),
    incidentRunbook: readFileSync('docs/sops/05-incident-response.md', 'utf8'),
    recoveryRunbook: readFileSync('docs/sops/06-data-backup-restore.md', 'utf8'),
    rollbackRunbook: readFileSync('docs/sops/07-deployment-rollback.md', 'utf8'),
    alertCatalog: ALERT_CATALOG,
  }
  assert.deepEqual(auditObservabilityRecoveryContract(input), [])
})
