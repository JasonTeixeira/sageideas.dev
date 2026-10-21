import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const slug = 'career-data_engineering_analytics'
const lessonPath = `data/academy/authoring/${slug}.lessons.json`
const solutionPath = `data/academy/authoring/${slug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
const deep = new Set(['orchestration-dags', 'incremental-processing', 'data-quality-tests', 'backfills-reprocessing', 'streaming-event-data', 'warehouse-performance', 'privacy-governance', 'observability-alerting', 'incident-response'])
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) throw new Error('Data Engineering lesson/reference drift')

const required = (blocks, type, key) => {
  const block = blocks.find((candidate) => candidate.type === type)
  if (!block) throw new Error(`${key}: missing ${type}`)
  return block
}
const remove = (blocks, type) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  return index < 0 ? null : blocks.splice(index, 1)[0]
}
const before = (blocks, type, block) => blocks.splice(blocks.findIndex((candidate) => candidate.type === type), 0, block)
const after = (blocks, type, block) => blocks.splice(blocks.findIndex((candidate) => candidate.type === type) + 1, 0, block)
const exactOutput = (solution, key) => {
  if (solution.language !== 'python') throw new Error(`${key}: expected Python reference`)
  const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
  if (result.status !== 0 || result.stderr) throw new Error(`${key}: ${result.stderr}`)
  return result.stdout.trimEnd()
}

for (const [key, blocks] of Object.entries(lessons)) {
  const contract = required(blocks, 'sprint-contract', key)
  const walkthrough = required(blocks, 'code-walkthrough', key)
  const comparison = required(blocks, 'compare', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const lab = required(blocks, 'lab', key)
  const solution = solutions[key]
  lab.language = 'python'
  lab.check = exactOutput(solution, key)
  if (!String(lab.starter).includes('practice feedback')) lab.starter = `${lab.starter.trimEnd()}\n\n# Local execution is practice feedback only; it cannot create mastery evidence.\n# Keep one minimized bad-data or recovery case as a regression and name the production evidence still required.\n`
  const summarySuffix = ' Match the exact observable data-product contract, retain a minimized failure as a regression, and identify the orchestration, warehouse, lineage, quality, privacy, cost, or production evidence still required. Local output remains practice-only evidence.'
  lab.summary = `${String(lab.summary).split(summarySuffix)[0].trimEnd()}${summarySuffix}`
  for (const type of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', { type: 'worked-example', title: `${walkthrough.title}: source-to-decision trace`, intro: `Trace one trustworthy and one silently corrupt ${key.replaceAll('-', ' ')} outcome before editing the TODO.`, setup: contract.outcome, code: walkthrough.code, language: walkthrough.language, steps: ['Predict the downstream data-product decision before executing.', ...(walkthrough.steps ?? []).map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`), 'Change one schema, freshness, ordering, retry, privacy, or cost assumption and name the evidence needed to catch the resulting false trust.'], result: contract.proof, commonMistake: `${comparison.left.label}: ${comparison.left.verdict}` })
  after(blocks, 'lab', { type: 'debug', language: 'python', brokenCode: lab.starter, symptom: comparison.left.verdict, task: `Reproduce ${comparison.left.label}, repair the pipeline or data-product decision, and retain the minimized stale, duplicate, late, malformed, non-idempotent, privacy, cost, or recovery case as a regression check.`, fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}` })
  after(blocks, 'debug', { type: 'tradeoff', question: comparison.title, optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` }, optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` }, guidance: `${comparison.caption} Defend correctness, freshness, idempotency, recoverability, observability, governance, latency, and cost with evidence.` })
  before(blocks, 'transfer', { type: 'calibration', artifact: contract.proof, weak: 'Rows move once, but contracts, freshness, reconciliation, lineage, recovery, and decision safety are absent.', passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`, excellent: `Passing evidence plus a minimized counterexample, retained regression, backfill or incident rehearsal, reviewer objection, and transfer: ${transfer.text}`, note: 'Local-practice calibration only; controlled execution, production-like data, privacy review, and expert review remain required.' })
  after(blocks, 'spaced-review', { type: 'unlock-gate', criteria: ['Build evidence — match the exact observable data-product contract.', 'Debug evidence — retain a minimized corruption, late-data, or recovery regression.', `Decision evidence — defend ${comparison.title}.`, `Verification evidence — ${verification.items.join(' · ')}`, `Transfer evidence — ${transfer.text}`], practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.' })
  contract.intensity = key === 'data-capstone' ? 'capstone' : deep.has(key) ? 'deep' : 'standard'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Data Engineering lessons while preserving their practical Python labs and adding data-product mastery gates.')
