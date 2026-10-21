export type CommunicationsIntegrityFinding = {
  code: string
  severity: 'critical' | 'high'
  file: string
  message: string
}

export function auditCommunicationsSourceFiles(files: ReadonlyMap<string, string>) {
  const findings: CommunicationsIntegrityFinding[] = []
  const add = (code: string, severity: 'critical' | 'high', file: string, message: string) => {
    findings.push({ code, severity, file, message })
  }

  for (const [file, source] of files) {
    if (file !== 'lib/email/send.ts' && source.includes('.emails.send(') && !source.includes('idempotencyKey')) {
      add('direct_email_idempotency_missing', 'critical', file, 'A direct provider email send lacks an idempotency key or the canonical sender.')
    }
  }

  const sender = files.get('lib/email/send.ts') ?? ''
  if (sender.includes('missing_api_key') && /status:\s*['"]queued['"]/.test(sender)) {
    add('email_false_queue', 'critical', 'lib/email/send.ts', 'Missing provider configuration is labeled queued without a durable payload queue.')
  }
  if (!sender.includes('buildEmailIdempotencyKey') || !/send\(payload,\s*\{\s*idempotencyKey/.test(sender)) {
    add('email_idempotency_missing', 'critical', 'lib/email/send.ts', 'Provider delivery is not protected by a stable idempotency key.')
  }
  if (!sender.includes('calculateEmailRetryDisposition') || !sender.includes('status: disposition.status')) {
    add('email_retry_policy_missing', 'high', 'lib/email/send.ts', 'Delivery failures do not transition through bounded retry and dead-letter policy.')
  }
  if (!sender.includes('delivery_ledger_failed')) {
    add('email_ledger_failure_missing', 'high', 'lib/email/send.ts', 'Provider success can be reported without durable delivery-ledger evidence.')
  }

  const sequence = files.get('app/api/cron/academy-sequence/route.ts') ?? ''
  if (!sequence.includes(".in('status', DELIVERED_EMAIL_STATUSES)") || !/if\s*\(delivery\.ok\)\s*count\+\+/.test(sequence)) {
    add('sequence_success_filter_missing', 'critical', 'app/api/cron/academy-sequence/route.ts', 'Sequence deduplication or success counts include unsuccessful delivery attempts.')
  }

  const webhook = files.get('app/api/email/webhook/route.ts') ?? ''
  if (!webhook.includes('claim_email_webhook_event') || !webhook.includes('webhook_duplicate')) {
    add('webhook_replay_protection_missing', 'high', 'app/api/email/webhook/route.ts', 'Repeated provider events can mutate counters more than once.')
  }
  if (!webhook.includes('MAX_WEBHOOK_BYTES') || !webhook.includes('payload_too_large')) {
    add('webhook_body_bound_missing', 'high', 'app/api/email/webhook/route.ts', 'Signed webhook bodies are read without an explicit size bound.')
  }

  const migrationFile = 'supabase/migrations/0122_email_delivery_integrity.sql'
  const migration = files.get(migrationFile) ?? ''
  for (const token of ['idempotency_key', 'dead_lettered', 'next_retry_at', 'attempt_count', 'unique index']) {
    if (!migration.toLowerCase().includes(token)) {
      add('email_delivery_schema_incomplete', 'critical', migrationFile, `Canonical email delivery schema is missing ${token}.`)
      break
    }
  }

  return { ok: findings.length === 0, findings }
}
