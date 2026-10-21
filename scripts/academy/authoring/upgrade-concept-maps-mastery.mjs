import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-concept_maps_real_world_engineering'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)

if (Object.keys(lessons).length !== 30 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Concept Maps lesson and reference coverage drift')
}

const targetFunctions = {
  'the-on-call-problem': 'derive_key',
  'from-notes-to-maps': 'trace',
  'the-senior-engineer-view': 'find_stale',
  'weak-maps-strong-maps': 'deliver',
  'the-first-redraw-gate': 'run',
  'user-action-to-system-behavior': 'report',
  'component-boundary-mapping': 'run_worker',
  'data-state-and-time': 'run',
  'trust-and-ownership-boundaries': 'run_jobs',
  'boundary-review-board': 'review',
  'symptom-to-signal': 'report',
  'hypothesis-tree-mapping': 'confirm',
  'failure-path-maps': 'analyze',
  'bad-fix-autopsy': 'autopsy',
  'repair-map-drill': 'drill',
  'requirement-to-tradeoff': 'gate',
  'decision-map-patterns': 'decide',
  'proof-artifact-mapping': 'audit',
  'rejected-option-maps': 'dry_run',
  'decision-memo-gate': 'lint',
  'retrieval-without-the-map': 'diff',
  'transfer-to-a-new-domain': 'validate',
  'socratic-map-review': 'review',
  'interview-map-translation': 'rotate',
  'oral-defense-gate': 'gate',
  'capstone-brief': 'telemetry',
  'capstone-system-map': 'audit',
  'capstone-failure-autopsy': 'autopsy',
  'capstone-proof-packet': 'audit',
  'final-review-board': 'board',
}

function maskFunction(code, functionName, lessonSlug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`def ${functionName}(`))
  if (start < 0) throw new Error(`${lessonSlug}: target function ${functionName} not found`)
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && !/^\s/.test(lines[index])) {
      end = index
      break
    }
  }
  lines.splice(start + 1, end - start - 1,
    '    # TODO: implement the map-backed engineering decision from the supplied fixtures.',
    '    # Preserve boundaries, state transitions, failure paths, and observable proof in the result.',
    '    raise NotImplementedError("complete the engineering map decision")',
    '',
  )
  return lines.join('\n')
}

function exactOutput(solution, lessonSlug) {
  if (solution.language !== 'python') throw new Error(`${lessonSlug}: expected Python reference`)
  const result = spawnSync('python3', ['-I', '-c', solution.code], {
    encoding: 'utf8',
    input: solution.stdin ?? '',
    timeout: 10_000,
  })
  if (result.status !== 0 || result.stderr) throw new Error(`${lessonSlug}: reference execution failed: ${result.stderr}`)
  return result.stdout.trimEnd()
}

const required = (blocks, type, key) => {
  const block = blocks.find((candidate) => candidate.type === type)
  if (!block) throw new Error(`${key}: missing ${type}`)
  return block
}
const remove = (blocks, type) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  return index < 0 ? null : blocks.splice(index, 1)[0]
}
const before = (blocks, type, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  if (index < 0) throw new Error(`Cannot insert before missing ${type}`)
  blocks.splice(index, 0, block)
}
const after = (blocks, type, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  if (index < 0) throw new Error(`Cannot insert after missing ${type}`)
  blocks.splice(index + 1, 0, block)
}

for (const [lessonSlug, blocks] of Object.entries(lessons)) {
  const key = `${courseSlug}/${lessonSlug}`
  const contract = required(blocks, 'sprint-contract', key)
  const concept = required(blocks, 'concept', key)
  const walkthrough = required(blocks, 'code-walkthrough', key)
  const comparison = required(blocks, 'compare', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const solution = solutions[lessonSlug]
  solution.language = 'python'

  const starter = [
    `# ${walkthrough.title}`,
    '#',
    `# Mission: ${contract.outcome}`,
    '# Novice workflow:',
    '# 1. Draw or list actors, boundaries, state, time, trust, and observable signals.',
    '# 2. Predict the fixture result and mark the first boundary where it could become false.',
    `# 3. Implement only ${targetFunctions[lessonSlug]} at the TODO.`,
    '# 4. Match every output line, add one counterexample, and retain it as a regression.',
    '# 5. Redraw the map after the repair so the artifact matches the executable system.',
    '#',
    '# Evidence checklist:',
    ...verification.items.map((item, index) => `# ${index + 1}. ${item}`),
    '#',
    '# Local execution is practice feedback only; it cannot create mastery evidence.',
    '',
    maskFunction(solution.code, targetFunctions[lessonSlug], lessonSlug),
  ].join('\n')
  const lab = {
    type: 'lab',
    title: `Execute the ${concept.title.toLowerCase()} map`,
    summary: `Convert the lesson map into a deterministic Python model, then use its output to defend the real boundary or failure decision. ${contract.outcome} Match the exact observable contract, retain a counterexample regression, and redraw the artifact after repair. Local results remain practice evidence until controlled evaluation and review.`,
    language: 'python',
    starter,
    check: exactOutput(solution, lessonSlug),
  }
  const workedExample = {
    type: 'worked-example',
    title: `${walkthrough.title}: map, predict, execute, redraw`,
    intro: `Trace one normal path and one boundary-breaking path through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: [
      'Name the actor, trigger, boundary, state mutation, and observable proof.',
      ...walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
      'Change one assumption, predict the failure path, then redraw the map from the executable evidence.',
    ],
    result: contract.proof,
    commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  }
  const debug = {
    type: 'debug',
    symptom: comparison.left.verdict,
    brokenCode: starter,
    language: 'python',
    task: `Reproduce the missing or misleading path in ${comparison.left.label}, repair ${targetFunctions[lessonSlug]}, and retain the minimized boundary case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  }
  const tradeoff = {
    type: 'tradeoff',
    question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: `${comparison.caption} Defend what the map includes and omits using the decision, failure cost, reviewer need, and update burden.`,
  }

  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', workedExample)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration',
    artifact: contract.proof,
    weak: 'The map is attractive but omits executable boundaries, state or time, failure paths, counterevidence, rejected options, or update ownership.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a boundary-breaking counterexample, retained regression, redrawn map, reviewer objection, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; controlled evaluation and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match exact output.`,
      'Debug evidence — retain a minimized missing-boundary or stale-map case as a regression.',
      `Decision evidence — defend ${comparison.title} and name what the map intentionally omits.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })

  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 30 Concept Maps lessons with exact Python labs, boundary redraws, calibration, and defense gates.')
