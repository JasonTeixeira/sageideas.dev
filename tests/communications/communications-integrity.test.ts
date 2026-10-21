import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildEmailIdempotencyKey,
  calculateEmailRetryDisposition,
  validateEmailDeliveryInput,
} from '../../lib/communications/delivery-policy'
import { auditCommunicationsSourceFiles } from '../../lib/communications/integrity'

test('email idempotency keys are stable, bounded, and content-sensitive', () => {
  const base = {
    to: ['learner@example.com'],
    subject: 'Your weekly proof',
    html: '<p>Proof</p>',
    text: 'Proof',
    templateKey: 'weekly_digest',
    metadata: { week: '2026-W36', score: 9 },
  }
  const reordered = { ...base, metadata: { score: 9, week: '2026-W36' } }
  const first = buildEmailIdempotencyKey(base)
  assert.equal(first, buildEmailIdempotencyKey(reordered))
  assert.notEqual(first, buildEmailIdempotencyKey({ ...base, html: '<p>Different proof</p>' }))
  assert.match(first, /^sage-email-[a-f0-9]{64}$/)
  assert(first.length <= 256)
  assert.equal(buildEmailIdempotencyKey({ ...base, idempotencyKey: 'academy:week-36:learner-1' }), 'academy:week-36:learner-1')
  assert.throws(() => buildEmailIdempotencyKey({ ...base, idempotencyKey: 'spaces are unsafe' }))
})

test('email delivery inputs and retry/dead-letter transitions fail closed', () => {
  assert.equal(validateEmailDeliveryInput({
    to: 'learner@example.com',
    subject: 'Welcome',
    html: '<p>Hello</p>',
  }).ok, true)
  assert.equal(validateEmailDeliveryInput({ to: [], subject: 'Welcome', html: '<p>Hello</p>' }).ok, false)
  assert.equal(validateEmailDeliveryInput({ to: 'not-an-email', subject: 'Welcome', html: '<p>Hello</p>' }).ok, false)
  assert.equal(validateEmailDeliveryInput({ to: 'a@example.com', subject: 'x'.repeat(999), html: '<p>Hello</p>' }).ok, false)
  assert.equal(validateEmailDeliveryInput({
    to: 'a@example.com',
    subject: 'Welcome',
    html: '<p>Hello</p>',
    headers: { 'X-Unsafe': 'good\r\nBcc: attacker@example.com' },
  }).ok, false)
  assert.equal(validateEmailDeliveryInput({
    to: 'a@example.com',
    subject: 'Welcome',
    html: '<p>Hello</p>',
    attachments: [{ filename: '../secret.txt', content: 'nope' }],
  }).ok, false)

  assert.deepEqual(calculateEmailRetryDisposition({ attempt: 1, maxAttempts: 3, retryable: true }), {
    status: 'failed',
    retryAfterSeconds: 60,
  })
  assert.deepEqual(calculateEmailRetryDisposition({ attempt: 3, maxAttempts: 3, retryable: true }), {
    status: 'dead_lettered',
    retryAfterSeconds: null,
  })
  assert.equal(calculateEmailRetryDisposition({ attempt: 1, maxAttempts: 3, retryable: false }).status, 'dead_lettered')
  assert.equal(calculateEmailRetryDisposition({ attempt: 20, maxAttempts: 30, retryable: true }).retryAfterSeconds, 3600)
})

test('communications source audit catches false queues, unsafe retries, and missing webhook replay protection', () => {
  const good = auditCommunicationsSourceFiles(new Map([
    ['lib/email/send.ts', 'buildEmailIdempotencyKey calculateEmailRetryDisposition send(payload, { idempotencyKey }) status: disposition.status delivery_ledger_failed'],
    ['app/api/cron/academy-sequence/route.ts', ".in('status', DELIVERED_EMAIL_STATUSES) if (delivery.ok) count++"],
    ['app/api/email/webhook/route.ts', 'claim_email_webhook_event webhook_duplicate MAX_WEBHOOK_BYTES payload_too_large'],
    ['supabase/migrations/0122_email_delivery_integrity.sql', 'idempotency_key dead_lettered next_retry_at attempt_count unique index'],
    ['app/api/example/route.ts', 'resend.emails.send(payload, { idempotencyKey })'],
  ]))
  assert.deepEqual(good.findings, [])

  const bad = auditCommunicationsSourceFiles(new Map([
    ['lib/email/send.ts', "if (!apiKey) return { ok: false, status: 'queued', reason: 'missing_api_key' }"],
    ['app/api/cron/academy-sequence/route.ts', ".eq('template_key', step.key); count++"],
    ['app/api/email/webhook/route.ts', 'open_count = open_count + 1'],
    ['supabase/migrations/0122_email_delivery_integrity.sql', 'create table email_log(status text)'],
    ['app/api/example/route.ts', 'resend.emails.send(payload)'],
  ]))
  for (const code of [
    'email_false_queue',
    'email_idempotency_missing',
    'email_retry_policy_missing',
    'email_ledger_failure_missing',
    'sequence_success_filter_missing',
    'webhook_replay_protection_missing',
    'webhook_body_bound_missing',
    'email_delivery_schema_incomplete',
    'direct_email_idempotency_missing',
  ]) assert(bad.findings.some((finding) => finding.code === code), `missing finding: ${code}`)
})

test('checked-in email delivery path passes the communications source contract', () => {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'app', 'lib'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file) && readFileSync(file, 'utf8').includes('.emails.send('))
  files.push(
    'lib/email/send.ts',
    'app/api/cron/academy-sequence/route.ts',
    'app/api/email/webhook/route.ts',
    'supabase/migrations/0122_email_delivery_integrity.sql',
  )
  const source = new Map([...new Set(files)].map((file) => [file, readFileSync(file, 'utf8')]))
  assert.deepEqual(auditCommunicationsSourceFiles(source).findings, [])
})
