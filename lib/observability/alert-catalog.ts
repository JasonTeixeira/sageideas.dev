export type OperationalSignals = {
  readinessFailuresFiveMinutes: number
  errorRateFiveMinutes: number
  lcpP75FifteenMinutes: number
  deadLetters: number
  recoveryPointAgeHours: number
}

export const ALERT_CATALOG = Object.freeze([
  Object.freeze({ id: 'availability', signal: 'readiness', severity: 'SEV1', owner: 'platform-on-call', threshold: 'failed twice in five minutes', runbook: 'docs/sops/05-incident-response.md' }),
  Object.freeze({ id: 'errors', signal: 'error_rate', severity: 'SEV2', owner: 'platform-on-call', threshold: '>=5% for five minutes', runbook: 'docs/sops/05-incident-response.md' }),
  Object.freeze({ id: 'latency', signal: 'lcp_p75', severity: 'SEV3', owner: 'web-on-call', threshold: '>2500ms for fifteen minutes', runbook: 'docs/sops/05-incident-response.md' }),
  Object.freeze({ id: 'jobs', signal: 'dead_letters', severity: 'SEV2', owner: 'automation-on-call', threshold: '>0 for five minutes', runbook: 'docs/sops/05-incident-response.md' }),
  Object.freeze({ id: 'backups', signal: 'recovery_point_age', severity: 'SEV2', owner: 'data-on-call', threshold: '>24h', runbook: 'docs/sops/06-data-backup-restore.md' }),
])

export function evaluateOperationalSignals(signals: OperationalSignals) {
  const active = new Set<string>()
  if (signals.readinessFailuresFiveMinutes >= 2) active.add('availability')
  if (signals.errorRateFiveMinutes >= 0.05) active.add('errors')
  if (signals.lcpP75FifteenMinutes > 2500) active.add('latency')
  if (signals.deadLetters > 0) active.add('jobs')
  if (signals.recoveryPointAgeHours > 24) active.add('backups')
  return ALERT_CATALOG.filter((alert) => active.has(alert.id))
}
