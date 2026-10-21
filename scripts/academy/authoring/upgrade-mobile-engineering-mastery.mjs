import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const slug = 'career-mobile_engineering_deep_dive'
const lessonPath = `data/academy/authoring/${slug}.lessons.json`
const solutionPath = `data/academy/authoring/${slug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
const deep = new Set(['flaky-network-repair', 'secure-token-storage', 'privacy-safe-telemetry', 'mobile-accessibility', 'mobile-test-plan', 'crash-and-analytics-signals', 'app-store-readiness'])
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) throw new Error('Mobile lesson/reference drift')

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
  const solution = solutions[key]
  if (solution.language !== 'python') throw new Error(`${key}: expected Python reference`)
  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  const starter = [
    `# ${walkthrough.title}`,
    `# Mission: ${contract.outcome}`,
    '# Novice workflow:',
    '# 1. Name the device, OS lifecycle, connectivity, privacy, and accessibility boundaries.',
    '# 2. Predict foreground, background, offline, denied, expired, interrupted, and recovery states.',
    '# 3. Implement the TODO as a deterministic state or policy evaluator.',
    '# 4. Run every supplied case, add one counterexample, and retain it as a regression.',
    '# 5. State which simulator, device, store, telemetry, and human-accessibility evidence is still required.',
    '# Evidence checklist:',
    ...verification.items.map((item, index) => `# ${index + 1}. ${item}`),
    '# Local execution is practice feedback only; it cannot create mastery evidence.',
    '',
    'def evaluate_mobile_boundary(case):',
    '    # TODO: return the safe observable decision for every supplied mobile state.',
    '    raise NotImplementedError("complete the mobile evidence decision")',
    '',
    '# Keep this scaffold deterministic: no network, secrets, clock, device APIs, or hidden global state.',
    '# Your output must expose the decision, failure/recovery path, and evidence still required.',
  ].join('\n')
  before(blocks, 'concept', {
    type: 'worked-example', title: `${walkthrough.title}: device-state walk-through`, intro: `Trace one success and one interrupted or unsafe ${key.replaceAll('-', ' ')} path before editing the TODO.`, setup: contract.outcome,
    code: walkthrough.code, language: walkthrough.language,
    steps: ['Predict the safe result before executing.', ...(walkthrough.steps ?? []).map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`), 'Change one lifecycle, connectivity, permission, privacy, or accessibility constraint and identify the recovery evidence.'],
    result: contract.proof, commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  })
  after(blocks, 'concept', { type: 'lab', title: `${walkthrough.title}: mobile evidence lab`, language: 'python', starter, check: exactOutput(solution, key), summary: `Implement the deterministic mobile boundary for this lesson and prove every supplied state. ${contract.outcome} Match the exact observable contract, retain a recovery regression, and name the real-device, accessibility, telemetry, or store evidence still required. Local output remains practice-only evidence.` })
  after(blocks, 'lab', { type: 'debug', language: 'python', brokenCode: starter, symptom: comparison.left.verdict, task: `Reproduce ${comparison.left.label}, repair the device-state decision, and retain the minimized lifecycle, network, permission, privacy, or accessibility case as a regression check.`, fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}` })
  after(blocks, 'debug', { type: 'tradeoff', question: comparison.title, optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` }, optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` }, guidance: `${comparison.caption} Defend lifecycle safety, offline recovery, security, accessibility, performance, store policy, and reversibility with evidence.` })
  before(blocks, 'transfer', { type: 'calibration', artifact: contract.proof, weak: 'One happy path works, but interruption, offline, denied, expired, privacy, accessibility, and release evidence are absent.', passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`, excellent: `Passing evidence plus a counterexample, retained regression, real-device proof plan, reviewer objection, and transfer: ${transfer.text}`, note: 'Local-practice calibration only; real-device, controlled evaluation, and expert review remain required.' })
  after(blocks, 'spaced-review', { type: 'unlock-gate', criteria: ['Build evidence — match the exact observable mobile contract.', 'Debug evidence — retain a minimized interrupted or unsafe state as a regression.', `Decision evidence — defend ${comparison.title}.`, `Verification evidence — ${verification.items.join(' · ')}`, `Transfer evidence — ${transfer.text}`], practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.' })
  contract.intensity = key === 'post-release-incident-loop' ? 'capstone' : deep.has(key) ? 'deep' : 'standard'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Mobile Engineering lessons with exact Python contracts, device-state loops, and proof gates.')
