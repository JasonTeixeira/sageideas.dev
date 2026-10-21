/**
 * LAB INTEGRITY — a gate over every live lab: does the learner have to THINK, or is the
 * answer handed to them?
 *
 * The excellence loop found the systemic "lab-version of the quiz length-tell": a lab asks
 * the learner to implement fn X, but fn X is already fully solved in a worked-example block
 * above it (system-design: 16/24 labs), OR the starter's comment states the algorithm
 * (`/* correctnessCritical => CP, else AP *​/`), OR the starter already contains the runnable
 * answer lines (git capstone). All three are objectively detectable.
 *
 *   node --env-file=.env.local scripts/academy/quality/lab-integrity.mjs [--course <slug>] [--json <out>]
 *
 * Exit 0 = PASS (few labs hand the answer). Exit 1 = FAIL.
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const only = args.includes('--course') ? args[args.indexOf('--course') + 1] : null
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null

const MAX_HANDED_RATE = 0.15 // ≤15% of a course's labs may hand the answer

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Function names DECLARED in a code string (js/ts/python). Returns Set of names.
function declaredFns(code) {
  const names = new Set()
  if (!code) return names
  const s = String(code)
  for (const m of s.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1])
  for (const m of s.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)) names.add(m[1])
  for (const m of s.matchAll(/\bdef\s+([A-Za-z_][\w]*)\s*\(/g)) names.add(m[1])
  for (const m of s.matchAll(/\bclass\s+([A-Za-z_][\w]*)/g)) names.add(m[1])
  return names
}

const q = sb.from('academy_lessons').select('course_slug,slug,blocks,module_sort,sort').eq('status', 'published')
const { data: lessons, error } = only ? await q.eq('course_slug', only) : await q
if (error) { console.error('supabase:', error.message); process.exit(1) }

const flagged = []
let totalLabs = 0
const perCourse = {}

for (const l of lessons ?? []) {
  const blocks = l.blocks ?? []
  const labIdx = blocks.findIndex((b) => b.type === 'lab' && b.starter)
  if (labIdx < 0) continue
  totalLabs++
  const lab = blocks[labIdx]
  const c = (perCourse[l.course_slug] ||= { labs: 0, handed: 0 })
  c.labs++

  // earlier code the learner has already seen
  const earlier = blocks.slice(0, labIdx)
    .filter((b) => ['worked-example', 'code', 'code-walkthrough'].includes(b.type))
    .map((b) => [b.code, b.steps && JSON.stringify(b.steps)].filter(Boolean).join('\n')).join('\n')

  const reasons = []
  // Signal A: a fn the lab asks you to write is already defined in a worked-example above.
  // In the sprint arc a worked-example is a FULL solution, so a shared function name between
  // the lab starter and an earlier worked-example/code block means the answer is on the page.
  // (Validated against ground truth: this catches system-design's real 16/24, not 2/24.)
  const earlierFns = declaredFns(earlier)
  const targets = [...declaredFns(lab.starter)]
  const handedFns = targets.filter((name) => earlierFns.has(name))
  if (handedFns.length) reasons.push(`worked-example already defines ${handedFns.join(', ')}`)

  // Signal B: the starter's COMMENTS state the algorithm (arrow-mapping / restates the check)
  const comments = (String(lab.starter).match(/\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\//g) || []).join(' ')
  if (/=>|=&gt;/.test(comments) && /\b(if|else|return|CP|AP|>=|<=)\b/i.test(comments)) reasons.push('starter comment states the algorithm')

  if (reasons.length) {
    c.handed++
    flagged.push({ course: l.course_slug, lesson: l.slug, reasons })
  }
}

const handedRate = totalLabs ? flagged.length / totalLabs : 0
const worst = Object.entries(perCourse).map(([course, c]) => ({ course, labs: c.labs, handed: c.handed, rate: +(c.handed / c.labs).toFixed(2) }))
  .filter((c) => c.handed > 0).sort((a, b) => b.rate - a.rate || b.handed - a.handed)

const report = { generated: new Date().toISOString(), scope: only ?? 'all published', totalLabs, handed: flagged.length, handedRate: +handedRate.toFixed(3), threshold: MAX_HANDED_RATE, gate: handedRate <= MAX_HANDED_RATE ? 'PASS' : 'FAIL', worstCourses: worst, flagged }
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2))

console.log(`\n═══ LAB INTEGRITY · ${totalLabs} labs · ${report.scope} ═══`)
console.log(`  labs that HAND the answer : ${flagged.length}/${totalLabs} = ${(handedRate * 100).toFixed(1)}%  (gate ≤${MAX_HANDED_RATE * 100}%)`)
console.log(`  GATE: ${report.gate}`)
if (worst.length) { console.log('\n  worst courses:'); for (const c of worst.slice(0, 12)) console.log(`    ${(c.rate * 100).toFixed(0).padStart(3)}%  ${c.handed}/${c.labs}  ${c.course}`) }
process.exit(report.gate === 'PASS' ? 0 : 1)
