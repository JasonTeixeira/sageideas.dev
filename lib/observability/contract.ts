export type ObservabilityRecoveryFinding = {
  code: string
  severity: 'critical' | 'high'
  message: string
}

const REQUIRED_SCRIPTS = {
  'test:observability-recovery': 'tsx --test tests/observability-recovery/observability-recovery.test.ts && npm run audit:observability-recovery',
  'audit:observability-recovery': 'tsx tools/observability-recovery/write-audit.ts',
} as const

export const WEB_VITAL_BOUNDS = Object.freeze({
  CLS: Object.freeze({ min: 0, max: 10 }),
  FCP: Object.freeze({ min: 0, max: 120_000 }),
  FID: Object.freeze({ min: 0, max: 120_000 }),
  INP: Object.freeze({ min: 0, max: 120_000 }),
  LCP: Object.freeze({ min: 0, max: 120_000 }),
  TTFB: Object.freeze({ min: 0, max: 120_000 }),
})

export function sanitizeTelemetryUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return null
  try {
    const parsed = new URL(value, 'https://telemetry.invalid')
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    const path = parsed.pathname.replace(/[\u0000-\u001f\u007f]/g, '')
    return (path.startsWith('/') ? path : `/${path}`).slice(0, 1024) || '/'
  } catch {
    return null
  }
}

export function redactTelemetryText(value: unknown, maxLength = 8000): string {
  if (typeof value !== 'string') return ''
  return value
    .slice(0, maxLength)
    .replace(/\bBearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk|rk|pk)[_-](?:live|test|proj)?[_-]?[A-Za-z0-9_-]{4,}\b/g, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]')
    .replace(/\b(password|token|secret|api[_-]?key|authorization)=([^\s&#]+)/gi, '$1=[REDACTED]')
    .replace(/([?&](?:password|token|secret|api[_-]?key|authorization)=)[^&#\s]+/gi, '$1[REDACTED]')
}

export function parseTraceSampleRate(value: unknown, fallback = 0.1): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

export function validateWebVital(name: unknown, value: unknown): boolean {
  if (typeof name !== 'string' || typeof value !== 'number' || !Number.isFinite(value)) return false
  const bounds = WEB_VITAL_BOUNDS[name as keyof typeof WEB_VITAL_BOUNDS]
  return Boolean(bounds && value >= bounds.min && value <= bounds.max)
}

const REQUIRED_RECOVERY_CHECKS = new Set([
  'migration_chain',
  'constraints',
  'rls',
  'tenant_isolation',
  'business_reconciliation',
  'storage_inventory',
  'read_only_smoke',
])

export function validateRecoveryDrillEvidence(input: Record<string, unknown>) {
  const failures: string[] = []
  if (input.approved !== true) failures.push('approval_missing')
  if (input.isolatedTarget !== true) failures.push('isolated_target_missing')
  if (typeof input.operator !== 'string' || typeof input.reviewer !== 'string' || input.reviewer.trim().length === 0 || input.reviewer === input.operator) failures.push('second_reviewer_missing')
  if (input.externalWritesDisabled !== true) failures.push('external_writes_not_disabled')
  const checks = new Set(Array.isArray(input.integrityChecks) ? input.integrityChecks : [])
  if ([...REQUIRED_RECOVERY_CHECKS].some((check) => !checks.has(check))) failures.push('integrity_checks_incomplete')
  const hashes = Array.isArray(input.evidenceHashes) ? input.evidenceHashes : []
  if (hashes.length === 0 || hashes.some((hash) => !/^sha256:[a-f0-9]{64}$/.test(String(hash)))) failures.push('evidence_hashes_missing')
  const reconciliation = input.reconciliation as Record<string, unknown> | null
  if (!reconciliation
      || !Number.isInteger(reconciliation.sourceCriticalRecords)
      || reconciliation.sourceCriticalRecords !== reconciliation.restoredCriticalRecords
      || reconciliation.missingStorageObjects !== 0) failures.push('reconciliation_missing')

  const startedAt = Date.parse(String(input.startedAt ?? ''))
  const restoredAt = Date.parse(String(input.restoredAt ?? ''))
  const recoveryPointAt = Date.parse(String(input.sourceRecoveryPointAt ?? ''))
  if (![startedAt, restoredAt, recoveryPointAt].every(Number.isFinite) || restoredAt < startedAt || startedAt < recoveryPointAt) {
    failures.push('recovery_timestamps_invalid')
  }
  const achievedRpoHours = Number.isFinite(startedAt) && Number.isFinite(recoveryPointAt)
    ? Math.round(((startedAt - recoveryPointAt) / 3_600_000) * 100) / 100
    : null
  const achievedRtoMinutes = Number.isFinite(startedAt) && Number.isFinite(restoredAt)
    ? Math.round((restoredAt - startedAt) / 60_000)
    : null
  if (achievedRpoHours !== null && achievedRpoHours > 24) failures.push('rpo_exceeded')
  if (achievedRtoMinutes !== null && achievedRtoMinutes > 240) failures.push('rto_exceeded')
  return { ok: failures.length === 0, failures, achievedRpoHours, achievedRtoMinutes }
}

function hasAll(source: string, tokens: string[]) {
  return tokens.every((token) => source.toLowerCase().includes(token.toLowerCase()))
}

export function auditObservabilityRecoveryContract(input: Record<string, any>): ObservabilityRecoveryFinding[] {
  const findings: ObservabilityRecoveryFinding[] = []
  const add = (code: string, message: string, severity: 'critical' | 'high' = 'high') => findings.push({ code, severity, message })

  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (input.packageScripts?.[name] !== command) add('script_missing', `Missing or changed package script: ${name}`, 'critical')
  }
  if (!hasAll(input.healthSource ?? '', ['HEALTH_TIMEOUT_MS', 'createRequestId'])) add('health_timeout_missing', 'Public readiness probes require a bounded timeout and correlation identifier', 'critical')
  if (!hasAll(input.healthSource ?? '', ['publicHealthErrorCode', 'Cache-Control'])) add('health_error_redaction_missing', 'Public health responses must use safe error codes and disable caching', 'critical')
  if (/supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/.test(input.portalHealthSource ?? '') || !/checkPublicReadiness/.test(input.portalHealthSource ?? '')) add('portal_service_role_health', 'Public portal health must use the anonymous canonical readiness probe', 'critical')
  const slo = input.sloSource ?? ''
  if (!hasAll(slo, ['observability_unavailable', 'status: 503', 'unknown']) || /catch[\s\S]{0,400}lcp_p75_ok:\s*true/.test(slo)) add('slo_fail_open', 'SLO query failures must be unavailable/unknown, never healthy', 'critical')
  if (!hasAll(slo, ['lcpP75 == null ? null', 'totalSamples > 0', 'error_signal_ratio'])) add('slo_no_data_healthy', 'Missing samples must remain unknown and diagnostic ratios must be labeled honestly', 'critical')

  for (const source of [input.errorTelemetrySource ?? '', input.perfTelemetrySource ?? '']) {
    if (!source.includes('sanitizeTelemetryUrl')) add('telemetry_url_sanitization_missing', 'Telemetry URLs must discard origins, queries, and fragments', 'critical')
    if (!source.includes('telemetry_persistence_failed')) add('telemetry_failure_signal_missing', 'Telemetry persistence failures need a privacy-safe operational signal')
  }
  if (!input.errorTelemetrySource?.includes('redactTelemetryText')) add('telemetry_secret_redaction_missing', 'Error messages and stacks must be redacted before persistence', 'critical')
  if (!input.perfTelemetrySource?.includes('WEB_VITAL_BOUNDS')) add('telemetry_metric_bounds_missing', 'Web-vital values need metric-specific finite bounds', 'critical')

  const sentrySources = Array.isArray(input.sentrySources) ? input.sentrySources : []
  if (sentrySources.length !== 3 || sentrySources.some((source: string) => !hasAll(source, ['sendDefaultPii: false', 'beforeSend', 'scrubSentryEvent']))) add('sentry_pii_control_missing', 'Every Sentry runtime must disable default PII and scrub events', 'critical')
  if (sentrySources.length !== 3 || sentrySources.some((source: string) => !source.includes('parseTraceSampleRate'))) add('sentry_sample_bounds_missing', 'Every Sentry runtime must bound trace sampling configuration')
  if (!hasAll(input.loggerSource ?? '', ['requestId', 'traceId', 'release', 'redactTelemetryText', 'JSON.stringify'])) add('structured_log_contract_missing', 'Structured logs require correlation, release, and redaction fields')
  if (!hasAll(input.observabilityPageSource ?? '', ['queryUnavailable', 'No samples', 'Diagnostic ratio', 'vital samples'])) add('slo_no_data_healthy', 'The observability dashboard must distinguish missing/query-failed data from healthy data', 'critical')

  const incident = input.incidentRunbook ?? ''
  if (!hasAll(incident, ['incident commander', 'communications lead', 'scribe', 'SEV1'])) add('incident_roles_missing', 'Incident response must define severity and explicit roles')
  if (!hasAll(incident, ['every 15 minutes', 'timeline', 'postmortem', 'blameless'])) add('incident_communications_missing', 'Incident response must define communication cadence, timeline, and blameless review')
  const recovery = input.recoveryRunbook ?? ''
  if (!hasAll(recovery, ['RPO', 'RTO', 'point-in-time', 'isolated restore drill', 'integrity checks'])) add('recovery_objectives_missing', 'Recovery requires measurable objectives and an isolated integrity drill', 'critical')
  if (!hasAll(recovery, ['explicit approval', 'live recovery evidence'])) add('recovery_evidence_boundary_missing', 'Local procedure must not be presented as live restore evidence', 'critical')
  if (!hasAll(input.rollbackRunbook ?? '', ['rollback owner', 'second reviewer', 'deployment identifier', 'abort criteria', 'verify health', 'telemetry', 'customer journeys', 'explicit approval'])) add('rollback_contract_missing', 'Rollback requires ownership, target verification, abort criteria, and post-rollback proof', 'critical')

  const requiredSignals = new Set(['readiness', 'error_rate', 'lcp_p75', 'dead_letters', 'recovery_point_age'])
  const alerts = Array.isArray(input.alertCatalog) ? input.alertCatalog : []
  for (const alert of alerts) requiredSignals.delete(alert?.signal)
  if (requiredSignals.size > 0 || alerts.some((alert: any) => !alert.id || !alert.severity || !alert.owner || !alert.threshold || !alert.runbook)) add('alert_catalog_incomplete', 'Every critical signal needs a threshold, severity, owner, and runbook', 'critical')
  return findings
}
