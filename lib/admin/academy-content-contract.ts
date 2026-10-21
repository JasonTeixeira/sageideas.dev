import { z } from 'zod'

import { validateBlocks } from '@/lib/academy/validate-blocks'

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'invalid slug')
const StatusSchema = z.enum(['draft', 'published'])
const IntensitySchema = z.enum(['micro', 'standard', 'deep', 'capstone'])

const OptionalText = (max: number) => z.string().trim().max(max).optional()

export const AcademyCourseInputSchema = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(200),
  subtitle: OptionalText(500),
  topic: z.string().trim().min(1).max(120),
  level: z.string().trim().min(1).max(80),
  hours: z.number().int().min(0).max(10_000).optional(),
  sort: z.number().int().min(0).max(100_000).optional(),
  status: StatusSchema.optional(),
}).strict()

const LessonBlocksSchema = z.array(z.unknown()).min(1).max(100).superRefine((blocks, context) => {
  const result = validateBlocks(blocks)
  if (result.ok) return
  for (const message of result.errors) {
    context.addIssue({ code: z.ZodIssueCode.custom, message })
  }
})

export const AcademyLessonInputSchema = z.object({
  courseSlug: SlugSchema,
  slug: SlugSchema,
  title: z.string().trim().min(1).max(200),
  eyebrow: OptionalText(160),
  moduleTitle: OptionalText(200),
  moduleSort: z.number().int().min(0).max(100_000).optional(),
  sort: z.number().int().min(0).max(100_000).optional(),
  estMinutes: z.number().int().min(1).max(1_440).optional(),
  isFreePreview: z.boolean().optional(),
  status: StatusSchema.optional(),
  intensity: IntensitySchema.optional(),
  blocks: LessonBlocksSchema,
}).strict()

const CertificateRevocationSchema = z.object({
  certCode: z.string().trim().min(1).max(80).regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/),
  revoked: z.boolean(),
  reason: OptionalText(1_000),
}).strict()

const StatusReportSchema = z.object({
  engagementId: z.string().uuid(),
  visibleToClient: z.boolean(),
  customNote: z.string().trim().max(4_000),
}).strict()

const LessonIdentifierSchema = z.object({
  courseSlug: SlugSchema,
  lessonSlug: SlugSchema,
}).strict()

export function parseAcademyCourseInput(input: unknown) {
  return AcademyCourseInputSchema.safeParse(input)
}

export function parseAcademyLessonInput(input: unknown) {
  return AcademyLessonInputSchema.safeParse(input)
}

export function parseCertificateRevocationInput(certCode: unknown, revoked: unknown, reason?: unknown) {
  return CertificateRevocationSchema.safeParse({ certCode, revoked, reason })
}

export function parseAcademyLessonIdentifier(courseSlug: unknown, lessonSlug: unknown) {
  return LessonIdentifierSchema.safeParse({ courseSlug, lessonSlug })
}

export function parseStatusReportInput(engagementId: unknown, body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return StatusReportSchema.safeParse(body)
  }
  const candidate = body as Record<string, unknown>
  return StatusReportSchema.safeParse({
    engagementId,
    visibleToClient: candidate.visible_to_client ?? false,
    customNote: candidate.custom_note ?? '',
  })
}
