'use server'

import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/admin-guard'
import { getAdminUser } from '@/lib/academy/admin'
import {
  parseAcademyCourseInput,
  parseAcademyLessonIdentifier,
  parseAcademyLessonInput,
  parseCertificateRevocationInput,
} from '@/lib/admin/academy-content-contract'
import { supabaseAdmin } from '@/lib/supabase/server'

export type CourseInput = {
  slug: string
  title: string
  subtitle?: string
  topic: string
  level: string
  hours?: number
  sort?: number
  status?: string
}

export async function saveCourse(input: CourseInput): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const adminUser = await getAdminUser()
  if (!adminUser) return { ok: false, error: 'not_authorized' }
  const parsed = parseAcademyCourseInput(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  const course = parsed.data
  const admin = supabaseAdmin()
  const { data: before } = await admin.from('academy_courses').select('*').eq('slug', course.slug).maybeSingle()
  const { error } = await admin.from('academy_courses').upsert(
    {
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle ?? null,
      topic: course.topic,
      level: course.level,
      hours: course.hours ?? 0,
      sort: course.sort ?? 0,
      status: course.status ?? 'published',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  )
  if (error) {
    console.error('[academy-admin] saveCourse failed', error)
    return { ok: false, error: 'persistence_failed' }
  }
  await logAudit({
    actorId: adminUser.id,
    actorEmail: adminUser.email ?? '',
    action: before ? 'academy.course.update' : 'academy.course.create',
    entityType: 'academy_course',
    entityId: course.slug,
    before,
    after: course,
  })
  revalidatePath('/academy-admin')
  revalidatePath('/academy/catalog')
  return { ok: true, slug: course.slug }
}

export type LessonInput = {
  courseSlug: string
  slug: string
  title: string
  eyebrow?: string
  moduleTitle?: string
  moduleSort?: number
  sort?: number
  estMinutes?: number
  isFreePreview?: boolean
  status?: string
  intensity?: string
  blocks: unknown[]
}

export async function saveLesson(input: LessonInput): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await getAdminUser()
  if (!adminUser) return { ok: false, error: 'not_authorized' }
  const parsed = parseAcademyLessonInput(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  const lesson = parsed.data
  const admin = supabaseAdmin()
  const { data: before } = await admin
    .from('academy_lessons')
    .select('*')
    .eq('course_slug', lesson.courseSlug)
    .eq('slug', lesson.slug)
    .maybeSingle()
  const { error } = await admin.from('academy_lessons').upsert(
    {
      course_slug: lesson.courseSlug,
      slug: lesson.slug,
      title: lesson.title,
      eyebrow: lesson.eyebrow ?? null,
      module_title: lesson.moduleTitle ?? 'Module 1',
      module_sort: lesson.moduleSort ?? 0,
      sort: lesson.sort ?? 0,
      est_minutes: lesson.estMinutes ?? 5,
      is_free_preview: lesson.isFreePreview ?? false,
      status: lesson.status ?? 'published',
      intensity: lesson.intensity ?? 'standard',
      blocks: lesson.blocks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'course_slug,slug' },
  )
  if (error) {
    console.error('[academy-admin] saveLesson failed', error)
    return { ok: false, error: 'persistence_failed' }
  }

  await logAudit({
    actorId: adminUser.id,
    actorEmail: adminUser.email ?? '',
    action: before ? 'academy.lesson.update' : 'academy.lesson.create',
    entityType: 'academy_lesson',
    entityId: `${lesson.courseSlug}/${lesson.slug}`,
    before,
    after: lesson,
  })

  const { count, error: countError } = await admin
    .from('academy_lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_slug', lesson.courseSlug)
    .eq('status', 'published')
  const { error: countUpdateError } = await admin
    .from('academy_courses')
    .update({ lessons: count ?? 0 })
    .eq('slug', lesson.courseSlug)
  if (countError || countUpdateError) {
    console.error('[academy-admin] saveLesson count reconciliation failed', countError ?? countUpdateError)
  }

  revalidatePath(`/academy-admin/${lesson.courseSlug}`)
  revalidatePath(`/academy/course/${lesson.courseSlug}`)
  revalidatePath(`/academy/learn/${lesson.courseSlug}/${lesson.slug}`)
  return { ok: true }
}

export async function deleteLesson(courseSlug: string, lessonSlug: string): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await getAdminUser()
  if (!adminUser) return { ok: false, error: 'not_authorized' }
  const parsed = parseAcademyLessonIdentifier(courseSlug, lessonSlug)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  const identifier = parsed.data
  const admin = supabaseAdmin()
  const { data: before } = await admin
    .from('academy_lessons')
    .select('*')
    .eq('course_slug', identifier.courseSlug)
    .eq('slug', identifier.lessonSlug)
    .maybeSingle()
  const { error } = await admin
    .from('academy_lessons')
    .delete()
    .eq('course_slug', identifier.courseSlug)
    .eq('slug', identifier.lessonSlug)
  if (error) {
    console.error('[academy-admin] deleteLesson failed', error)
    return { ok: false, error: 'persistence_failed' }
  }
  await logAudit({
    actorId: adminUser.id,
    actorEmail: adminUser.email ?? '',
    action: 'academy.lesson.delete',
    entityType: 'academy_lesson',
    entityId: `${identifier.courseSlug}/${identifier.lessonSlug}`,
    before,
    after: null,
  })
  // Keep the denormalized course lesson-count accurate — otherwise it drifts high on
  // every deletion and the dashboard totals diverge from the certificate engine.
  const { count, error: countError } = await admin
    .from('academy_lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_slug', identifier.courseSlug)
    .eq('status', 'published')
  const { error: countUpdateError } = await admin
    .from('academy_courses')
    .update({ lessons: count ?? 0, updated_at: new Date().toISOString() })
    .eq('slug', identifier.courseSlug)
  if (countError || countUpdateError) {
    console.error('[academy-admin] deleteLesson count reconciliation failed', countError ?? countUpdateError)
  }
  revalidatePath(`/academy-admin/${identifier.courseSlug}`)
  revalidatePath(`/academy/course/${identifier.courseSlug}`)
  return { ok: true }
}

/**
 * Certificate revocation — the credential's trust guarantee made operational.
 * Revoke ONLY when the proofs behind a cert fail; the public /verify/[code] endpoint
 * immediately reports REVOKED. Reinstate reverses it (e.g. proofs re-verified).
 */
export async function setCertificateRevocation(
  certCode: string,
  revoked: boolean,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await getAdminUser()
  if (!adminUser) return { ok: false, error: 'not_authorized' }
  const parsed = parseCertificateRevocationInput(certCode, revoked, reason)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  const certificate = parsed.data
  const admin = supabaseAdmin()
  const { data: before } = await admin
    .from('academy_certificates')
    .select('cert_code, revoked, revoked_at, revoked_reason')
    .eq('cert_code', certificate.certCode)
    .maybeSingle()
  const { error } = await admin
    .from('academy_certificates')
    .update({
      revoked: certificate.revoked,
      revoked_at: certificate.revoked ? new Date().toISOString() : null,
      revoked_reason: certificate.revoked ? (certificate.reason || 'Proofs failed verification') : null,
    })
    .eq('cert_code', certificate.certCode)
  if (error) {
    console.error('[academy-admin] setCertificateRevocation failed', error)
    return { ok: false, error: 'persistence_failed' }
  }
  await logAudit({
    actorId: adminUser.id,
    actorEmail: adminUser.email ?? '',
    action: certificate.revoked ? 'academy.certificate.revoke' : 'academy.certificate.reinstate',
    entityType: 'academy_certificate',
    entityId: certificate.certCode,
    before,
    after: { revoked: certificate.revoked, reason: certificate.reason ?? null },
  })
  revalidatePath(`/academy/certificate/${certificate.certCode}`)
  return { ok: true }
}
