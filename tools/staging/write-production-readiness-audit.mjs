import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { buildStagingProductionReadinessAudit } from '../../lib/staging/production-readiness-audit.mjs'

const root = process.cwd()
const evidenceDir = path.join(root, 'docs/evidence/project-loop')
const read = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const readOptional = (file) => existsSync(path.join(root, file)) ? read(file) : undefined

const audit = buildStagingProductionReadinessAudit({
  release: read('docs/evidence/project-loop/release-manifest.json'),
  http: readOptional('docs/evidence/project-loop/staging-http-latest.json'),
  browser: readOptional('docs/evidence/project-loop/staging-browser-latest.json'),
  rollback: readOptional('docs/evidence/project-loop/staging-rollback-latest.json'),
  labs: readOptional('docs/evidence/academy/step-4b/latest.json'),
})

mkdirSync(evidenceDir, { recursive: true })
writeFileSync(path.join(evidenceDir, 'staging-production-readiness-latest.json'), `${JSON.stringify(audit, null, 2)}\n`, { mode: 0o640 })
console.log(`Staging production-readiness classification: ${audit.classification}`)
console.log(`Gates: ${audit.summary.pass} pass, ${audit.summary.fail} fail, ${audit.summary.blocked} blocked, ${audit.summary.approvalRequired} approval required`)
if (audit.findings.length > 0) process.exitCode = 1
