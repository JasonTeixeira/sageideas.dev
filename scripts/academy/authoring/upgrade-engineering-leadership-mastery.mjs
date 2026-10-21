import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-engineering_leadership_staff_execution'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Engineering Leadership lesson and reference coverage drift')
}

const targetFunctions = {
  'scope-expansion': 'audit_scope',
  'judgment-under-ambiguity': 'decide',
  'influence-without-authority': 'score_record',
  'evidence-backed-leadership': 'score_ledger',
  'strategy-memo': 'lint_memo',
  'architecture-review': 'review',
  'tradeoff-framing': 'decide_and_probe',
  'decision-record': 'audit_adr',
  'planning-cadence': 'score_cadence',
  'dependency-management': 'analyze',
  'risk-register': 'audit_register',
  'delivery-review': 'evaluate_gates',
  mentoring: 'analyze_packet',
  feedback: 'diff_round',
  'conflict-repair': 'repair',
  'executive-updates': 'compress',
  'incident-command': 'audit_incident',
  'postmortem-quality': 'audit_postmortem',
  'systemic-repair': 'detect',
  'operating-cadence': 'coverage',
}
const deep = new Set([
  'judgment-under-ambiguity', 'influence-without-authority', 'evidence-backed-leadership',
  'architecture-review', 'decision-record', 'dependency-management', 'risk-register', 'delivery-review',
  'conflict-repair', 'incident-command', 'postmortem-quality', 'systemic-repair',
])

function maskFunction(code, functionName, lessonSlug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`def ${functionName}(`))
  if (start < 0) throw new Error(`${lessonSlug}: target function ${functionName} not found`)
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && !/^\s/.test(lines[index])) { end = index; break }
  }
  lines.splice(start + 1, end - start - 1,
    '    # TODO: implement the staff-level evidence decision from the supplied fixtures.',
    '    # Return explicit evidence, owners, thresholds, and failure reasons; never manufacture alignment.',
    '    raise NotImplementedError("complete the staff execution decision")',
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
const need = (blocks, type, key) => {
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
  const contract = need(blocks, 'sprint-contract', key)
  const concept = need(blocks, 'concept', key)
  const walkthrough = need(blocks, 'code-walkthrough', key)
  const comparison = need(blocks, 'compare', key)
  const verification = need(blocks, 'verification', key)
  const transfer = need(blocks, 'transfer', key)
  const solution = solutions[lessonSlug]
  solution.language = 'python'
  const starter = [
    `# ${walkthrough.title}`,
    '#',
    `# Mission: ${contract.outcome}`,
    '# Novice workflow:',
    '# 1. Predict the operational verdict before running the reference.',
    '# 2. Trace each fixture and name the assumption with the largest blast radius.',
    `# 3. Implement only ${targetFunctions[lessonSlug]} at the TODO.`,
    '# 4. Match exact output, add one ambiguity or failure case, and retain it as a regression.',
    '# 5. Name an owner, due date, reversal trigger, and escalation path wherever the decision requires them.',
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
    title: `Build the ${concept.title.toLowerCase()} execution loop`,
    summary: `Use the supplied staff-execution fixtures to implement, run, and defend the decision at the center of this lesson. ${contract.outcome} Match the exact observable contract, retain an ambiguity or failure regression, and state the owner, due date, reversal trigger, and escalation path. Local results remain practice evidence until independently reviewed against real organizational outcomes.`,
    language: 'python', starter, check: exactOutput(solution, lessonSlug),
  }
  const workedExample = {
    type: 'worked-example',
    title: `${walkthrough.title}: ambiguity to accountable action`,
    intro: `Trace a weak coordination artifact and a signable staff-level decision through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: ['Predict the verdict before executing the practice reference.', ...walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`), 'Cross one decision threshold and explain why ownership, escalation, or the chosen option changes.'],
    result: contract.proof,
    commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  }
  const debug = {
    type: 'debug', symptom: comparison.left.verdict, brokenCode: starter, language: 'python',
    task: `Add a fixture that reproduces the weak decision in ${comparison.left.label}, repair ${targetFunctions[lessonSlug]}, and retain the minimized case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  }
  const tradeoff = {
    type: 'tradeoff', question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: `${comparison.caption} Defend the decision with observed evidence, explicit uncertainty, accountable ownership, a reversal trigger, and a repair path.`,
  }
  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', workedExample)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'A polished artifact has no reproduced evidence, accountable owner, due date, dependency handshake, reversal trigger, escalation path, or retained failure regression.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a decision-reversing fixture, retained regression, stakeholder objection, explicit repair, operating measure, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; organizational context, stakeholder review, observed delivery outcomes, and expert leadership review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match exact output.`,
      'Debug evidence — retain a minimized ambiguity, ownership, dependency, risk, or incident failure as a regression.',
      `Decision evidence — defend ${comparison.title} with an owner and reversal trigger.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })
  contract.intensity = lessonSlug === 'operating-cadence' ? 'capstone' : deep.has(lessonSlug) ? 'deep' : 'standard'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}
writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Engineering Leadership lessons with exact Python labs and accountable staff-execution gates.')
