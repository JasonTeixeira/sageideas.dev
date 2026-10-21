import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type MasteryEvidenceType = 'build' | 'debug' | 'explain' | 'transfer' | 'retrieve'

export interface FlagshipCompetencyGraph {
  schemaVersion: 1
  pathId: string
  title: string
  status: 'draft' | 'released'
  levels: Array<{ id: string; label: string; outcome: string }>
  masteryPolicy: {
    requiredEvidence: Array<{ type: MasteryEvidenceType; contract: string }>
    retrievalScheduleDays: number[]
    minimumKnowledgeScore: number
    minimumIndependentAttempts: number
    labEvidenceBeforeTrustedRuntime: 'practice_only'
    outcomeDisclaimer: string
  }
  phases: Array<{
    id: string
    label: string
    prerequisitePhaseIds: string[]
    competencyIds: string[]
    courseSlugs: string[]
    releaseGap?: string
  }>
  competencies: Array<{
    id: string
    label: string
    level: string
    prerequisiteIds: string[]
    courseMappings: Array<{ courseSlug: string; lessonSlugs?: string[] }>
    evidence: Array<{ type: MasteryEvidenceType; artifact: string }>
  }>
}

interface CanonicalRegistry {
  courses: Array<{ slug: string; lessons: Array<{ slug: string }> }>
}

export interface FlagshipGraphValidation {
  errors: string[]
  missingCourseSlugs: string[]
  missingLessonKeys: string[]
  referencedCourseSlugs: string[]
}

const duplicates = (values: string[]): string[] =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))].sort()

const findCycles = (nodes: Map<string, string[]>): string[] => {
  const cycles = new Set<string>()
  const visited = new Set<string>()
  const active = new Set<string>()

  const visit = (id: string) => {
    if (active.has(id)) {
      cycles.add(id)
      return
    }
    if (visited.has(id)) return
    visited.add(id)
    active.add(id)
    for (const dependency of nodes.get(id) ?? []) {
      if (nodes.has(dependency)) visit(dependency)
    }
    active.delete(id)
  }

  for (const id of nodes.keys()) visit(id)
  return [...cycles].sort()
}

export function loadFlagshipCompetencyGraph(repoRoot: string): FlagshipCompetencyGraph {
  return JSON.parse(
    readFileSync(join(repoRoot, 'data/academy/flagship-competency-graph.json'), 'utf8'),
  ) as FlagshipCompetencyGraph
}

export function validateFlagshipCompetencyGraph(
  graph: FlagshipCompetencyGraph,
  registry: CanonicalRegistry,
): FlagshipGraphValidation {
  const errors: string[] = []
  const registryCourses = new Map(
    registry.courses.map((course) => [course.slug, new Set(course.lessons.map((lesson) => lesson.slug))]),
  )
  const phaseIds = graph.phases.map((phase) => phase.id)
  const competencyIds = graph.competencies.map((competency) => competency.id)
  const phaseIdSet = new Set(phaseIds)
  const competencyIdSet = new Set(competencyIds)
  const competencyPhaseAssignments = new Map<string, number>()
  const referencedCourseSlugs = new Set<string>()
  const missingCourseSlugs = new Set<string>()
  const missingLessonKeys = new Set<string>()

  for (const id of duplicates(graph.levels.map((level) => level.id))) errors.push(`Duplicate level: ${id}`)
  for (const id of duplicates(phaseIds)) errors.push(`Duplicate phase: ${id}`)
  for (const id of duplicates(competencyIds)) errors.push(`Duplicate competency: ${id}`)

  for (const phase of graph.phases) {
    if (phase.competencyIds.length === 0) errors.push(`Phase ${phase.id} has no competencies`)
    for (const prerequisite of phase.prerequisitePhaseIds) {
      if (!phaseIdSet.has(prerequisite)) errors.push(`Phase ${phase.id} has unknown prerequisite ${prerequisite}`)
    }
    for (const competencyId of phase.competencyIds) {
      if (!competencyIdSet.has(competencyId)) errors.push(`Phase ${phase.id} has unknown competency ${competencyId}`)
      competencyPhaseAssignments.set(
        competencyId,
        (competencyPhaseAssignments.get(competencyId) ?? 0) + 1,
      )
    }
    for (const courseSlug of phase.courseSlugs) {
      referencedCourseSlugs.add(courseSlug)
      if (!registryCourses.has(courseSlug)) missingCourseSlugs.add(courseSlug)
    }
  }

  for (const competencyId of competencyIds) {
    const assignments = competencyPhaseAssignments.get(competencyId) ?? 0
    if (assignments === 0) errors.push(`Competency ${competencyId} is not assigned to a phase`)
    if (assignments > 1) errors.push(`Competency ${competencyId} is assigned to multiple phases`)
  }

  for (const competency of graph.competencies) {
    if (!graph.levels.some((level) => level.id === competency.level)) {
      errors.push(`Competency ${competency.id} has unknown level ${competency.level}`)
    }
    if (competency.evidence.length < 3) errors.push(`Competency ${competency.id} has fewer than three evidence artifacts`)
    if (competency.courseMappings.length === 0) errors.push(`Competency ${competency.id} has no course mapping`)
    for (const prerequisite of competency.prerequisiteIds) {
      if (!competencyIdSet.has(prerequisite)) errors.push(`Competency ${competency.id} has unknown prerequisite ${prerequisite}`)
    }
    for (const mapping of competency.courseMappings) {
      referencedCourseSlugs.add(mapping.courseSlug)
      const lessons = registryCourses.get(mapping.courseSlug)
      if (!lessons) {
        missingCourseSlugs.add(mapping.courseSlug)
        continue
      }
      for (const lessonSlug of mapping.lessonSlugs ?? []) {
        if (!lessons.has(lessonSlug)) missingLessonKeys.add(`${mapping.courseSlug}/${lessonSlug}`)
      }
    }
  }

  for (const id of findCycles(new Map(graph.phases.map((phase) => [phase.id, phase.prerequisitePhaseIds])))) {
    errors.push(`Phase dependency cycle includes ${id}`)
  }
  for (const id of findCycles(new Map(graph.competencies.map((competency) => [competency.id, competency.prerequisiteIds])))) {
    errors.push(`Competency dependency cycle includes ${id}`)
  }
  for (const slug of missingCourseSlugs) errors.push(`Unknown canonical course: ${slug}`)
  for (const key of missingLessonKeys) errors.push(`Unknown canonical lesson: ${key}`)

  return {
    errors: errors.sort(),
    missingCourseSlugs: [...missingCourseSlugs].sort(),
    missingLessonKeys: [...missingLessonKeys].sort(),
    referencedCourseSlugs: [...referencedCourseSlugs].sort(),
  }
}
