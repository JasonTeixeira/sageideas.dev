import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

import { auditAdminSourceFiles } from '../../lib/admin/integrity'

const root = process.cwd()
const evidencePath = resolve(root, 'docs/evidence/project-loop/admin-integrity-audit.json')
const apiRoutes = execFileSync('git', ['ls-files', 'app/api/admin'], {
  cwd: root,
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter((file) => file.endsWith('/route.ts'))

const checkedFiles = [
  ...apiRoutes,
  'app/academy-admin/_actions.ts',
  'lib/academy/admin.ts',
  'lib/supabase/middleware.ts',
  'app/academy-admin/LessonEditor.tsx',
].sort()
const sourceFiles = new Map(checkedFiles.map((file) => [file, readFileSync(resolve(root, file), 'utf8')]))
const result = auditAdminSourceFiles(sourceFiles)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: 'admin-portal',
  status: result.ok ? 'pass' : 'fail',
  checkedFileCount: checkedFiles.length,
  checkedFiles,
  findings: result.findings,
  controls: {
    canonicalRoleSource: 'profiles.app_role',
    mfaBoundary: 'production_or_MFA_REQUIRED_FOR_ADMIN',
    contentInputValidation: 'bounded_zod_and_runtime_block_schema',
    mutationAudit: 'audit_log',
    labTrust: 'untrusted_current_runtime',
  },
}

mkdirSync(dirname(evidencePath), { recursive: true })
writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  status: report.status,
  checkedFileCount: report.checkedFileCount,
  findingCount: report.findings.length,
  evidence: relative(root, evidencePath),
}))
if (!result.ok) process.exitCode = 1
