import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-architecture_system_design'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)

if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Architecture lesson and reference coverage drift')
}

const targetFunctions = {
  'problem-framing-requirements': 'lint_frame',
  'capacity-estimation': 'derive',
  'domain-boundaries': 'audit',
  'api-contracts': 'decide_version',
  'data-architecture': 'audit_paths',
  'consistency-transactions': 'run_outbox',
  'caching-strategy': 'simulate',
  'queue-event-architecture': 'backlog_curve',
  'service-decomposition': 'score_seam',
  'resilience-timeouts-retries': 'load_model',
  'security-privacy-threat-model': 'audit_model',
  'observability-operability': 'burn_alert',
  'scaling-partitioning': 'shard_skew',
  'migration-evolution': 'parity_gate',
  'cost-reliability-tradeoffs': 'evaluate',
  'architecture-decision-records': 'lint_adr',
  'design-review-critique': 'trace_packet',
  'interview-system-design': 'rates_and_storage',
  'architecture-proof-packet': 'validate_packet',
  'architecture-capstone': 'select_option',
}

function maskFunction(code, functionName, lessonSlug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`def ${functionName}(`))
  if (start < 0) throw new Error(`${lessonSlug}: target function ${functionName} not found`)
  let end = start + 1
  while (end < lines.length && (lines[end].trim() === '' || /^\s/.test(lines[end]))) end += 1
  lines.splice(start + 1, end - start - 1,
    '    # TODO: implement the architecture decision against every supplied constraint.',
    '    # Keep capacity, failure, tradeoff, reversibility, and proof observable.',
    '    raise NotImplementedError("complete the architecture evidence decision")',
    '',
  )
  return lines.join('\n')
}

function exactOutput(solution, lessonSlug) {
  if (solution.language !== 'python') throw new Error(`${lessonSlug}: expected Python reference`)
  const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
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
const before = (blocks, type, block) => blocks.splice(blocks.findIndex((candidate) => candidate.type === type), 0, block)
const after = (blocks, type, block) => blocks.splice(blocks.findIndex((candidate) => candidate.type === type) + 1, 0, block)

for (const [lessonSlug, blocks] of Object.entries(lessons)) {
  const contract = required(blocks, 'sprint-contract', lessonSlug)
  const concept = required(blocks, 'concept', lessonSlug)
  const walkthrough = required(blocks, 'code-walkthrough', lessonSlug)
  const comparison = required(blocks, 'compare', lessonSlug)
  const verification = required(blocks, 'verification', lessonSlug)
  const transfer = required(blocks, 'transfer', lessonSlug)
  const solution = solutions[lessonSlug]
  const target = targetFunctions[lessonSlug]
  const starter = [
    `# ${walkthrough.title}`,
    `# Mission: ${contract.outcome}`,
    '# Novice workflow:',
    '# 1. Restate the requirement without naming a technology.',
    '# 2. Quantify load, latency, consistency, security, cost, and failure constraints.',
    `# 3. Implement only ${target} at the TODO; preserve the supplied evidence fixtures.`,
    '# 4. Predict the output, run every fixture, then add one counterexample.',
    '# 5. Retain the minimized failure as a regression and defend a reversal condition.',
    '# Evidence checklist:',
    ...verification.items.map((item, index) => `# ${index + 1}. ${item}`),
    '# Local execution is practice feedback only; it cannot create mastery evidence.',
    '',
    maskFunction(solution.code, target, lessonSlug),
  ].join('\n')

  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', {
    type: 'worked-example',
    title: `${walkthrough.title}: constraint-to-decision walk-through`,
    intro: `Trace one viable design and one failure path through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: [
      'Predict which constraint rules an option in or out before executing.',
      ...(walkthrough.steps ?? []).map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`),
      'Change one capacity, failure, consistency, security, or cost assumption and identify the reversal condition.',
    ],
    result: contract.proof,
    commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  })
  after(blocks, 'concept', {
    type: 'lab', title: `${walkthrough.title}: architecture evidence lab`, language: 'python', starter, check: exactOutput(solution, lessonSlug),
    summary: `Implement the deterministic architecture evaluator for this lesson and prove every supplied constraint. ${contract.outcome} Match the exact observable contract, retain a failure regression, and state what still needs production telemetry or expert review. Local output remains practice-only evidence.`,
  })
  after(blocks, 'lab', {
    type: 'debug', language: 'python', brokenCode: starter, symptom: comparison.left.verdict,
    task: `Reproduce the weak design in ${comparison.left.label}, repair ${target}, and retain the minimized capacity, failure, consistency, security, or cost case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  })
  after(blocks, 'debug', {
    type: 'tradeoff', question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: `${comparison.caption} Defend the boundary, consistency, availability, security, cost, operability, and reversal tradeoff with evidence.`,
  })
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'A diagram names components, but assumptions, failure modes, rejected options, verification, and reversal conditions are absent.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a counterexample, retained regression, production-proof plan, reviewer objection, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; production telemetry, controlled evaluation, and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${target} and match exact output.`,
      'Debug evidence — retain a minimized capacity, failure, consistency, security, or cost regression.',
      `Decision evidence — defend ${comparison.title}.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
  concept.text = String(concept.text)
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Architecture and System Design lessons with exact Python contracts, decision loops, and proof gates.')
