/**
 * Runtime validator for authored academy lesson blocks.
 *
 * The `LessonBlock` discriminated union in `data/academy/sample-course.ts` is the
 * compile-time contract the lesson player renders against. Authored content,
 * however, arrives as untrusted JSON — so before any block reaches the player (or
 * the DB) it must be proven, at runtime, to match one of the union shapes with all
 * REQUIRED fields present and of the right primitive kind.
 *
 * `validateBlocks` is the gate. It is dependency-free (no zod), fail-closed, and
 * returns precise, human-readable error strings so a malformed block is pinpointed
 * ("lesson block 7: diagram edge 2 missing 'to'") rather than silently shipped.
 *
 * Source of truth: keep the per-type checks below in sync with the union in
 * data/academy/sample-course.ts.
 */

import type { LessonBlock } from '@/data/academy/sample-course'

/** Every valid `type` discriminant in the LessonBlock union. */
export const BLOCK_TYPES = [
  'prose',
  'code',
  'video',
  'lab',
  'callout',
  'quiz',
  'sprint-contract',
  'mission',
  'context',
  'pretest',
  'worked-example',
  'concept',
  'debug',
  'tradeoff',
  'verification',
  'teachback',
  'calibration',
  'transfer',
  'spaced-review',
  'unlock-gate',
  'diagram',
  'viz',
  'code-walkthrough',
  'compare',
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

/**
 * The "visual engine" block types — the declarative specs that render through the
 * branded SageDiagram / SageViz / stepper / compare components. The authoring floor
 * ("visual-first") is expressed in terms of these.
 */
export const VISUAL_TYPES = ['diagram', 'viz', 'code-walkthrough', 'compare'] as const
export type VisualType = (typeof VISUAL_TYPES)[number]

const BLOCK_TYPE_SET: ReadonlySet<string> = new Set(BLOCK_TYPES)
const VISUAL_TYPE_SET: ReadonlySet<string> = new Set(VISUAL_TYPES)

/** True when a block's `type` is one of the visual engine types. */
export function isVisualType(type: unknown): type is VisualType {
  return typeof type === 'string' && VISUAL_TYPE_SET.has(type)
}

export type ValidateResult =
  | { ok: true; blocks: LessonBlock[] }
  | { ok: false; errors: string[] }

// ── primitive guards ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString)
}

function isOneOf(v: unknown, allowed: readonly string[]): boolean {
  return typeof v === 'string' && allowed.includes(v)
}

// ── per-block validation ─────────────────────────────────────────────────────

/**
 * Validate a single block. `where` is the caller-supplied prefix used to build
 * precise messages (e.g. "lesson block 7"). Pushes into `errors` and returns
 * nothing; an empty push means the block passed.
 */
function validateBlock(block: unknown, where: string, errors: string[]): void {
  if (!isRecord(block)) {
    errors.push(`${where}: block is not an object`)
    return
  }

  const type = block.type
  if (!isString(type)) {
    errors.push(`${where}: missing 'type' (string)`)
    return
  }
  if (!BLOCK_TYPE_SET.has(type)) {
    errors.push(`${where}: unknown block type '${type}'`)
    return
  }

  const reqStr = (field: string): void => {
    if (!isString(block[field])) errors.push(`${where}: ${type} missing '${field}' (string)`)
  }
  const reqEnum = (field: string, allowed: readonly string[]): void => {
    if (!isOneOf(block[field], allowed))
      errors.push(`${where}: ${type} field '${field}' must be one of ${allowed.join(' | ')}`)
  }
  const reqStrArr = (field: string): void => {
    if (!isStringArray(block[field]))
      errors.push(`${where}: ${type} field '${field}' must be a string[]`)
  }

  switch (type as BlockType) {
    case 'prose':
      reqStr('text')
      break

    case 'code':
      reqStr('filename')
      reqEnum('language', ['python', 'ts', 'bash'])
      reqStr('code')
      break

    case 'video':
      reqStr('title')
      reqStr('duration')
      break

    case 'lab':
      reqStr('title')
      reqStr('summary')
      break

    case 'callout':
      reqEnum('tone', ['tip', 'note'])
      reqStr('text')
      break

    case 'quiz': {
      reqStr('question')
      if (!isStringArray(block.options) || (block.options as string[]).length < 2) {
        errors.push(`${where}: quiz 'options' must be a string[] with at least 2 entries`)
      }
      if (!isNumber(block.answer) || !Number.isInteger(block.answer)) {
        errors.push(`${where}: quiz 'answer' must be an integer index`)
      } else if (isStringArray(block.options)) {
        const answer = block.answer as number
        const len = (block.options as string[]).length
        if (answer < 0 || answer >= len) {
          errors.push(`${where}: quiz 'answer' (${answer}) is out of range for ${len} options`)
        }
      }
      break
    }

    case 'sprint-contract':
      reqStr('outcome')
      reqEnum('intensity', ['micro', 'standard', 'deep', 'capstone'])
      reqStr('time')
      reqStr('proof')
      reqStr('unlock')
      break

    case 'mission':
      reqStr('text')
      break

    case 'context':
      reqStr('text')
      break

    case 'pretest':
      reqStr('prompt')
      reqStr('reveal')
      break

    case 'worked-example':
      reqStr('intro')
      reqStrArr('steps')
      reqStr('commonMistake')
      break

    case 'concept':
      reqStr('text')
      break

    case 'debug':
      reqStr('symptom')
      reqStr('brokenCode')
      reqStr('task')
      reqStr('fix')
      break

    case 'tradeoff': {
      reqStr('question')
      reqStr('guidance')
      for (const side of ['optionA', 'optionB'] as const) {
        const opt = block[side]
        if (!isRecord(opt)) {
          errors.push(`${where}: tradeoff '${side}' must be an object { label, text }`)
        } else {
          if (!isString(opt.label)) errors.push(`${where}: tradeoff ${side} missing 'label' (string)`)
          if (!isString(opt.text)) errors.push(`${where}: tradeoff ${side} missing 'text' (string)`)
        }
      }
      break
    }

    case 'verification':
      reqStrArr('items')
      break

    case 'teachback':
      reqStrArr('prompts')
      break

    case 'calibration':
      reqStr('artifact')
      reqStr('weak')
      reqStr('passing')
      reqStr('excellent')
      reqStr('note')
      break

    case 'transfer':
      reqStr('text')
      break

    case 'spaced-review':
      // every field optional; if schedule present it must be a string[]
      if (block.schedule !== undefined && !isStringArray(block.schedule)) {
        errors.push(`${where}: spaced-review 'schedule' must be a string[] when present`)
      }
      break

    case 'unlock-gate':
      reqStrArr('criteria')
      break

    case 'diagram':
      validateDiagram(block, where, errors)
      break

    case 'viz':
      validateViz(block, where, errors)
      break

    case 'code-walkthrough':
      validateCodeWalkthrough(block, where, errors)
      break

    case 'compare':
      validateCompare(block, where, errors)
      break

    default: {
      // exhaustiveness guard — unreachable if BLOCK_TYPES matches the union
      const _never: never = type as never
      errors.push(`${where}: unhandled block type '${String(_never)}'`)
    }
  }
}

// ── visual block validators ──────────────────────────────────────────────────

function validateDiagram(block: Record<string, unknown>, where: string, errors: string[]): void {
  if (!isString(block.title)) errors.push(`${where}: diagram missing 'title' (string)`)

  const nodes = block.nodes
  const nodeIds = new Set<string>()
  if (!Array.isArray(nodes)) {
    errors.push(`${where}: diagram missing 'nodes' (array)`)
  } else {
    nodes.forEach((node, i) => {
      if (!isRecord(node)) {
        errors.push(`${where}: diagram node ${i} is not an object`)
        return
      }
      if (!isNonEmptyString(node.id)) errors.push(`${where}: diagram node ${i} missing 'id'`)
      else nodeIds.add(node.id)
      if (!isString(node.label)) errors.push(`${where}: diagram node ${i} missing 'label'`)
    })
  }

  const edges = block.edges
  if (!Array.isArray(edges)) {
    errors.push(`${where}: diagram missing 'edges' (array)`)
  } else {
    edges.forEach((edge, i) => {
      if (!isRecord(edge)) {
        errors.push(`${where}: diagram edge ${i} is not an object`)
        return
      }
      if (!isNonEmptyString(edge.from)) errors.push(`${where}: diagram edge ${i} missing 'from'`)
      else if (nodeIds.size > 0 && !nodeIds.has(edge.from))
        errors.push(`${where}: diagram edge ${i} 'from' references unknown node '${edge.from}'`)
      if (!isNonEmptyString(edge.to)) errors.push(`${where}: diagram edge ${i} missing 'to'`)
      else if (nodeIds.size > 0 && !nodeIds.has(edge.to))
        errors.push(`${where}: diagram edge ${i} 'to' references unknown node '${edge.to}'`)
    })
  }

  // Optional NARRATION storyboard (the diagram explains itself, beat by beat).
  // Fail-closed: every beat must have a 'say' line, and any node/edge it
  // spotlights MUST exist in this diagram — a bad ref can never reach the player.
  if (block.storyboard !== undefined) {
    if (!Array.isArray(block.storyboard)) {
      errors.push(`${where}: diagram 'storyboard' must be an array of beats`)
    } else {
      const edgeKeys = Array.isArray(edges)
        ? new Set(edges.filter(isRecord).map((e) => `${String(e.from)}->${String(e.to)}`))
        : new Set<string>()
      block.storyboard.forEach((beat, i) => {
        if (!isRecord(beat)) {
          errors.push(`${where}: storyboard beat ${i} is not an object`)
          return
        }
        if (!isNonEmptyString(beat.say)) errors.push(`${where}: storyboard beat ${i} missing 'say'`)
        if (beat.nodes !== undefined) {
          if (!Array.isArray(beat.nodes)) errors.push(`${where}: storyboard beat ${i} 'nodes' must be an array`)
          else
            beat.nodes.forEach((n) => {
              if (nodeIds.size > 0 && !nodeIds.has(String(n)))
                errors.push(`${where}: storyboard beat ${i} references unknown node '${String(n)}'`)
            })
        }
        if (beat.edges !== undefined) {
          if (!Array.isArray(beat.edges)) errors.push(`${where}: storyboard beat ${i} 'edges' must be an array`)
          else
            beat.edges.forEach((pair) => {
              if (!Array.isArray(pair) || pair.length !== 2) {
                errors.push(`${where}: storyboard beat ${i} edge must be [from, to]`)
                return
              }
              if (edgeKeys.size > 0 && !edgeKeys.has(`${String(pair[0])}->${String(pair[1])}`))
                errors.push(`${where}: storyboard beat ${i} references unknown edge '${String(pair[0])}->${String(pair[1])}'`)
            })
        }
      })
    }
  }
}

function validateViz(block: Record<string, unknown>, where: string, errors: string[]): void {
  if (!isString(block.title)) errors.push(`${where}: viz missing 'title' (string)`)
  if (!isOneOf(block.chart, ['bars', 'line', 'area']))
    errors.push(`${where}: viz field 'chart' must be one of bars | line | area`)

  const data = block.data
  if (!Array.isArray(data)) {
    errors.push(`${where}: viz missing 'data' (array)`)
  } else {
    data.forEach((point, i) => {
      if (!isRecord(point)) {
        errors.push(`${where}: viz data ${i} is not an object`)
        return
      }
      if (!isString(point.label)) errors.push(`${where}: viz data ${i} missing 'label' (string)`)
      if (!isNumber(point.value)) errors.push(`${where}: viz data ${i} missing 'value' (number)`)
    })
  }
}

function validateCodeWalkthrough(
  block: Record<string, unknown>,
  where: string,
  errors: string[],
): void {
  if (!isString(block.title)) errors.push(`${where}: code-walkthrough missing 'title' (string)`)
  if (!isString(block.filename)) errors.push(`${where}: code-walkthrough missing 'filename' (string)`)
  if (!isOneOf(block.language, ['python', 'ts', 'bash']))
    errors.push(`${where}: code-walkthrough field 'language' must be one of python | ts | bash`)
  if (!isString(block.code)) errors.push(`${where}: code-walkthrough missing 'code' (string)`)

  const steps = block.steps
  if (!Array.isArray(steps)) {
    errors.push(`${where}: code-walkthrough missing 'steps' (array)`)
  } else {
    steps.forEach((step, i) => {
      if (!isRecord(step)) {
        errors.push(`${where}: code-walkthrough step ${i} is not an object`)
        return
      }
      if (!Array.isArray(step.lines) || !(step.lines as unknown[]).every(isNumber))
        errors.push(`${where}: code-walkthrough step ${i} 'lines' must be a number[]`)
      if (!isString(step.label)) errors.push(`${where}: code-walkthrough step ${i} missing 'label' (string)`)
    })
  }
}

function validateCompare(block: Record<string, unknown>, where: string, errors: string[]): void {
  if (!isString(block.title)) errors.push(`${where}: compare missing 'title' (string)`)
  for (const side of ['left', 'right'] as const) {
    const panel = block[side]
    if (!isRecord(panel)) {
      errors.push(`${where}: compare '${side}' must be an object { label, lines }`)
      continue
    }
    if (!isString(panel.label)) errors.push(`${where}: compare ${side} missing 'label' (string)`)
    if (!isStringArray(panel.lines)) errors.push(`${where}: compare ${side} 'lines' must be a string[]`)
  }
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Validate an authored array of lesson blocks against the LessonBlock union.
 *
 * @param blocks untrusted input — typically parsed JSON
 * @returns `{ ok: true, blocks }` (typed) on success, or `{ ok: false, errors }`
 *          with one precise message per problem found. Fail-closed: any single
 *          bad block makes the whole array invalid.
 */
export function validateBlocks(blocks: unknown): ValidateResult {
  if (!Array.isArray(blocks)) {
    return { ok: false, errors: ['blocks payload must be an array of lesson blocks'] }
  }

  const errors: string[] = []
  blocks.forEach((block, i) => {
    validateBlock(block, `lesson block ${i}`, errors)
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, blocks: blocks as LessonBlock[] }
}

/** Count how many blocks in a (validated) array are visual-engine blocks. */
export function countVisualBlocks(blocks: readonly LessonBlock[]): number {
  return blocks.reduce((n, b) => (VISUAL_TYPE_SET.has(b.type) ? n + 1 : n), 0)
}
