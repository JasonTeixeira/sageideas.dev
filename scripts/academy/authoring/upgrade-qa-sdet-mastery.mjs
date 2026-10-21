import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const slug = 'career-qa_sdet_test_automation_engineering'
const lessonPath = `data/academy/authoring/${slug}.lessons.json`
const solutionPath = `data/academy/authoring/${slug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
const deep = new Set(['user-visible-behavior-tests', 'auto-waiting-and-flake-reduction', 'visual-regression', 'accessibility-checks', 'performance-smoke-tests', 'security-smoke-checks', 'ci-quality-gates', 'flaky-test-triage'])
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) throw new Error('QA/SDET lesson/reference drift')

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
  if (!String(lab.starter).includes('practice feedback')) lab.starter = `${lab.starter.trimEnd()}\n\n# Local execution is practice feedback only; it cannot create mastery evidence.\n# Retain one minimized failing case as a regression and name the production evidence still required.\n`
  lab.summary = `${lab.summary} Match the exact observable contract, retain the minimized failure as a regression, and identify the browser, API, CI, accessibility, performance, security, or production evidence still required. Local output remains practice-only evidence.`
  for (const type of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', { type: 'worked-example', title: `${walkthrough.title}: risk-to-evidence walk-through`, intro: `Trace one trustworthy and one misleading ${key.replaceAll('-', ' ')} signal before editing the TODO.`, setup: contract.outcome, code: walkthrough.code, language: walkthrough.language, steps: ['Predict the release decision before executing.', ...(walkthrough.steps ?? []).map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`), 'Change one risk, boundary, timing, environment, or assertion and identify the evidence needed to prevent a false pass.'], result: contract.proof, commonMistake: `${comparison.left.label}: ${comparison.left.verdict}` })
  after(blocks, 'lab', { type: 'debug', language: 'python', brokenCode: lab.starter, symptom: comparison.left.verdict, task: `Reproduce ${comparison.left.label}, repair the test or quality decision, and retain the minimized false-pass, false-fail, flake, isolation, accessibility, performance, or security case as a regression check.`, fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}` })
  after(blocks, 'debug', { type: 'tradeoff', question: comparison.title, optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` }, optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` }, guidance: `${comparison.caption} Defend risk coverage, fidelity, speed, determinism, maintainability, observability, and release cost with evidence.` })
  before(blocks, 'transfer', { type: 'calibration', artifact: contract.proof, weak: 'A test passes once, but risk coverage, isolation, failure reproduction, deterministic evidence, and release meaning are absent.', passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`, excellent: `Passing evidence plus a minimized counterexample, retained regression, production-like proof plan, reviewer objection, and transfer: ${transfer.text}`, note: 'Local-practice calibration only; controlled execution, production-like environments, and expert review remain required.' })
  after(blocks, 'spaced-review', { type: 'unlock-gate', criteria: ['Build evidence — match the exact observable test or quality contract.', 'Debug evidence — retain a minimized false-pass, false-fail, or flake regression.', `Decision evidence — defend ${comparison.title}.`, `Verification evidence — ${verification.items.join(' · ')}`, `Transfer evidence — ${transfer.text}`], practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.' })
  contract.intensity = key === 'quality-review-board' ? 'capstone' : deep.has(key) ? 'deep' : 'standard'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 QA/SDET lessons while preserving their practical Python labs and adding release-proof mastery gates.')
