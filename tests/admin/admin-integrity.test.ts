import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  parseAcademyCourseInput,
  parseAcademyLessonInput,
  parseAcademyLessonIdentifier,
  parseCertificateRevocationInput,
  parseStatusReportInput,
} from '../../lib/admin/academy-content-contract'
import { auditAdminSourceFiles } from '../../lib/admin/integrity'
import { isAdminPagePath } from '../../lib/admin/route-policy'

test('Academy content inputs are bounded and runtime-valid before service-role writes', () => {
  assert.equal(parseAcademyCourseInput({
    slug: 'python-basics',
    title: ' Python Basics ',
    subtitle: '',
    topic: 'foundations',
    level: 'Beginner',
    hours: 12,
    sort: 3,
    status: 'draft',
  }).success, true)

  assert.equal(parseAcademyCourseInput({
    slug: '../escape',
    title: 'x',
    topic: 'x',
    level: 'x',
    status: 'published',
  }).success, false)
  assert.equal(parseAcademyCourseInput({
    slug: 'safe',
    title: 'x'.repeat(201),
    topic: 'x',
    level: 'x',
    status: 'published',
  }).success, false)

  assert.equal(parseAcademyLessonInput({
    courseSlug: 'python-basics',
    slug: 'variables',
    title: 'Variables',
    status: 'draft',
    intensity: 'standard',
    blocks: [{ type: 'prose', text: 'A bounded, valid authored block.' }],
  }).success, true)
  assert.equal(parseAcademyLessonInput({
    courseSlug: 'python-basics',
    slug: 'variables',
    title: 'Variables',
    status: 'published',
    blocks: [{ type: 'invented', payload: '<script>alert(1)</script>' }],
  }).success, false)
  assert.equal(parseAcademyLessonIdentifier('python-basics', 'variables').success, true)
  assert.equal(parseAcademyLessonIdentifier('../escape', 'variables').success, false)
})

test('certificate and status-report mutations reject malformed or oversized input', () => {
  assert.equal(parseCertificateRevocationInput('SAGE-PYTH-ABC12345', true, 'Evidence invalidated').success, true)
  assert.equal(parseCertificateRevocationInput('../cert', true, 'x').success, false)
  assert.equal(parseCertificateRevocationInput('SAGE-PYTH-ABC12345', true, 'x'.repeat(1001)).success, false)

  assert.equal(parseStatusReportInput('6f8f5771-842c-4c24-9b85-daf9f14b27ef', {
    visible_to_client: true,
    custom_note: 'Release evidence attached.',
  }).success, true)
  assert.equal(parseStatusReportInput('not-a-uuid', {}).success, false)
  assert.equal(parseStatusReportInput('6f8f5771-842c-4c24-9b85-daf9f14b27ef', null).success, false)
  assert.equal(parseStatusReportInput('6f8f5771-842c-4c24-9b85-daf9f14b27ef', {
    visible_to_client: 'yes',
  }).success, false)
  assert.equal(parseStatusReportInput('6f8f5771-842c-4c24-9b85-daf9f14b27ef', {
    custom_note: 'x'.repeat(4001),
  }).success, false)
})

test('Academy authoring is part of the same privileged MFA-gated page boundary', () => {
  assert.equal(isAdminPagePath('/admin'), true)
  assert.equal(isAdminPagePath('/admin/users'), true)
  assert.equal(isAdminPagePath('/academy-admin'), true)
  assert.equal(isAdminPagePath('/academy-admin/python-basics'), true)
  assert.equal(isAdminPagePath('/academy/catalog'), false)
  assert.equal(isAdminPagePath('/api/admin/users'), false)
})

test('admin source audit catches missing guards, audit events, and unsafe content operations', () => {
  const good = auditAdminSourceFiles(new Map([
    ['app/api/admin/items/route.ts', "import { requireAdminApi, logAudit } from '@/lib/admin-guard'; export async function POST() { await requireAdminApi(); await logAudit({}); }"],
    ['app/academy-admin/_actions.ts', 'parseAcademyCourseInput(); parseAcademyLessonInput(); parseAcademyLessonIdentifier(); parseCertificateRevocationInput(); logAudit(); persistence_failed'],
    ['lib/academy/admin.ts', ".from('profiles').select('app_role'); getAuthenticatorAssuranceLevel()"],
    ['lib/supabase/middleware.ts', 'const needsAdmin = isAdminPagePath(pathname)'],
    ['app/academy-admin/LessonEditor.tsx', 'Exact expected output (practice only)'],
  ]))
  assert.deepEqual(good.findings, [])

  const bad = auditAdminSourceFiles(new Map([
    ['app/api/admin/items/route.ts', 'export async function DELETE() { return removeEverything(); }'],
    ['app/academy-admin/_actions.ts', 'supabaseAdmin().from("academy_courses").upsert(input)'],
    ['lib/academy/admin.ts', ".from('app_users').select('role')"],
    ['lib/supabase/middleware.ts', "const needsAdmin = pathname.startsWith('/admin')"],
    ['app/academy-admin/LessonEditor.tsx', 'text the output must contain'],
  ]))
  assert(bad.findings.some((finding) => finding.code === 'admin_guard_missing'))
  assert(bad.findings.some((finding) => finding.code === 'admin_audit_missing'))
  assert(bad.findings.some((finding) => finding.code === 'academy_input_validation_missing'))
  assert(bad.findings.some((finding) => finding.code === 'academy_role_source_split'))
  assert(bad.findings.some((finding) => finding.code === 'academy_admin_middleware_split'))
  assert(bad.findings.some((finding) => finding.code === 'substring_lab_copy'))
})

test('every checked-in admin API and Academy content mutation passes the source contract', () => {
  const files = execFileSync('git', ['ls-files', 'app/api/admin/**/route.ts'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
  const sourceFiles = new Map(files.map((file) => [file, readFileSync(file, 'utf8')]))
  for (const file of [
    'app/academy-admin/_actions.ts',
    'lib/academy/admin.ts',
    'lib/supabase/middleware.ts',
    'app/academy-admin/LessonEditor.tsx',
  ]) sourceFiles.set(file, readFileSync(file, 'utf8'))

  assert.deepEqual(auditAdminSourceFiles(sourceFiles).findings, [])
})
