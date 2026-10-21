export type AdminIntegrityFinding = {
  code: string
  severity: 'critical' | 'high'
  file: string
  message: string
}

const MUTATING_ROUTE = /export\s+(?:async\s+function|const)\s+(?:POST|PUT|PATCH|DELETE)\b/

export function auditAdminSourceFiles(files: ReadonlyMap<string, string>) {
  const findings: AdminIntegrityFinding[] = []
  for (const [file, source] of [...files.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (file.startsWith('app/api/admin/') && file.endsWith('/route.ts')) {
      if (!/requireAdminApi\s*\(/.test(source)) {
        findings.push({ code: 'admin_guard_missing', severity: 'critical', file, message: 'Admin API route does not invoke requireAdminApi().' })
      }
      if (MUTATING_ROUTE.test(source) && !/logAudit\s*\(/.test(source)) {
        findings.push({ code: 'admin_audit_missing', severity: 'high', file, message: 'Mutating admin API route does not write an audit event.' })
      }
    }
  }

  const actions = files.get('app/academy-admin/_actions.ts')
  if (actions) {
    const required = [
      'parseAcademyCourseInput(',
      'parseAcademyLessonInput(',
      'parseAcademyLessonIdentifier(',
      'parseCertificateRevocationInput(',
      'logAudit(',
      'persistence_failed',
    ]
    if (required.some((token) => !actions.includes(token))) {
      findings.push({ code: 'academy_input_validation_missing', severity: 'critical', file: 'app/academy-admin/_actions.ts', message: 'Academy content operations lack bounded validation, generic failure handling, or audit evidence.' })
    }
  }

  const academyAdmin = files.get('lib/academy/admin.ts')
  if (academyAdmin && (
    /\.from\(['"]app_users['"]\)/.test(academyAdmin)
    || !/\.from\(['"]profiles['"]\)/.test(academyAdmin)
    || !/app_role/.test(academyAdmin)
    || !/getAuthenticatorAssuranceLevel\s*\(/.test(academyAdmin)
  )) {
    findings.push({ code: 'academy_role_source_split', severity: 'critical', file: 'lib/academy/admin.ts', message: 'Academy authoring must use the canonical admin profile role and production MFA boundary.' })
  }

  const middleware = files.get('lib/supabase/middleware.ts')
  if (middleware && !/const needsAdmin = isAdminPagePath\(pathname\)/.test(middleware)) {
    findings.push({ code: 'academy_admin_middleware_split', severity: 'critical', file: 'lib/supabase/middleware.ts', message: 'Academy authoring is outside the canonical privileged page boundary.' })
  }

  const lessonEditor = files.get('app/academy-admin/LessonEditor.tsx')
  if (lessonEditor && /text the output must contain/i.test(lessonEditor)) {
    findings.push({ code: 'substring_lab_copy', severity: 'high', file: 'app/academy-admin/LessonEditor.tsx', message: 'The authoring UI describes substring output as a lab checkpoint.' })
  }

  return { ok: findings.length === 0, findings }
}
