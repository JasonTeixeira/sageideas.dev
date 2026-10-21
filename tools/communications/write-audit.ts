import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

import { auditCommunicationsSourceFiles } from '../../lib/communications/integrity'

const root = process.cwd()
const outputPath = resolve(root, 'docs/evidence/project-loop/communications-integrity-audit.json')
const directProviderPaths = execFileSync('git', [
  'ls-files', '--cached', '--others', '--exclude-standard', 'app', 'lib',
], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file) && readFileSync(resolve(root, file), 'utf8').includes('.emails.send('))
const sourcePaths = [...new Set([
  ...directProviderPaths,
  'lib/email/send.ts',
  'app/api/cron/academy-sequence/route.ts',
  'app/api/email/webhook/route.ts',
  'supabase/migrations/0122_email_delivery_integrity.sql',
])]
const proofPaths = {
  durableJobs: 'docs/evidence/engineering-loop/durable-jobs-readiness-latest.json',
  securityPrivacy: 'docs/evidence/engineering-loop/security-privacy-readiness-latest.json',
  observabilityQuality: 'docs/evidence/engineering-loop/observability-quality-readiness-latest.json',
}
const source = new Map(sourcePaths.map((file) => [file, readFileSync(resolve(root, file), 'utf8')]))
const sourceAudit = auditCommunicationsSourceFiles(source)
const proofs = Object.fromEntries(Object.entries(proofPaths).map(([key, file]) => {
  const evidence = JSON.parse(readFileSync(resolve(root, file), 'utf8')) as {
    ok?: boolean
    validation?: { ok?: boolean }
    mutationMode?: string
  }
  return [key, {
    path: file,
    ok: evidence.ok === true && evidence.validation?.ok === true,
    mutationMode: evidence.mutationMode ?? null,
  }]
}))
const proofFailures = Object.entries(proofs)
  .filter(([, proof]) => !proof.ok)
  .map(([name]) => name)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: 'communications-jobs',
  status: sourceAudit.ok && proofFailures.length === 0 ? 'pass' : 'fail',
  sourceAudit,
  proofs,
  proofFailures,
  controls: {
    emailInput: 'bounded',
    emailIdempotency: 'application_ledger_and_provider_key',
    emailRetry: 'bounded_exponential_backoff',
    emailDeadLetter: 'three_attempts_or_non_retryable',
    webhookReplay: 'leased_database_claim',
    discordJobs: 'registry_idempotency_retry_dead_letter_admin_review',
  },
  externalEvidencePending: [
    'Apply migration 0122 to isolated staging.',
    'Exercise signed Resend delivery and replay events with staging credentials.',
    'Observe real Discord scheduled jobs, retries, and dead-letter alerts.',
  ],
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  status: report.status,
  sourceFindings: sourceAudit.findings.length,
  proofFailures,
  evidence: relative(root, outputPath),
}))
if (report.status !== 'pass') process.exitCode = 1
