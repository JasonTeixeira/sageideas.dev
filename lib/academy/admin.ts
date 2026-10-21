import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'

/** Returns the admin user after the canonical role and optional MFA checks. */
export async function getAdminUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return null
    const admin = supabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('app_role, email')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.app_role !== 'admin') return null

    const mfaRequired =
      process.env.NODE_ENV === 'production' || process.env.MFA_REQUIRED_FOR_ADMIN === 'true'
    if (mfaRequired) {
      const { data: assurance } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.currentLevel !== 'aal2') return null
    }

    return { id: user.id, email: profile.email ?? user.email ?? null }
  } catch {
    return null
  }
}

export type AdminCourseRow = {
  slug: string
  title: string
  topic: string
  level: string
  lessons: number
  hours: number
  sort: number
  status: string
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('academy_courses')
    .select('slug, title, topic, level, lessons, hours, sort, status')
    .order('sort')
  return (data ?? []) as AdminCourseRow[]
}

export type AdminLessonRow = {
  slug: string
  title: string
  module_title: string
  module_sort: number
  sort: number
  est_minutes: number
  is_free_preview: boolean
  status: string
}

export async function getAdminCourse(slug: string): Promise<{ course: AdminCourseRow & { subtitle: string | null }; lessons: AdminLessonRow[] } | null> {
  const admin = supabaseAdmin()
  const { data: course } = await admin
    .from('academy_courses')
    .select('slug, title, subtitle, topic, level, lessons, hours, sort, status')
    .eq('slug', slug)
    .maybeSingle()
  if (!course) return null
  const { data: lessons } = await admin
    .from('academy_lessons')
    .select('slug, title, module_title, module_sort, sort, est_minutes, is_free_preview, status')
    .eq('course_slug', slug)
    .order('module_sort')
    .order('sort')
  return { course: course as AdminCourseRow & { subtitle: string | null }, lessons: (lessons ?? []) as AdminLessonRow[] }
}

export async function getAdminLesson(courseSlug: string, lessonSlug: string) {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('academy_lessons')
    .select('slug, title, eyebrow, module_title, module_sort, sort, est_minutes, is_free_preview, status, intensity, blocks')
    .eq('course_slug', courseSlug)
    .eq('slug', lessonSlug)
    .maybeSingle()
  return data
}
