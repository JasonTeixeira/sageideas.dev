import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-interview_career_portfolio'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Interview/Career/Portfolio lesson and reference coverage drift')
}

const targetFunctions = {
  'role-targeting': 'build_proof_map',
  'market-scan': 'scan',
  'resume-positioning': 'score_bullet',
  'linkedin-github-positioning': 'pick_pins',
  'portfolio-proof-map': 'proof_density',
  'project-case-studies': 'audit_case_study',
  'behavioral-story-bank': 'coverage',
  'technical-explanation': 'analyze',
  'system-design-interview': 'estimate',
  'coding-interview-loop': 'run_budget',
  'debugging-interview': 'first_bad',
  'architecture-tradeoffs': 'decide',
  'ai-tooling-interview': 'ledger',
  'cloud-data-interview': 'compare',
  'take-home-execution': 'pick_scope',
  'outreach-networking': 'best_pure',
  'application-pipeline': 'diagnose',
  'offer-negotiation': 'value_offer',
  'feedback-retro': 'summarize',
  'career-capstone': 'run_gates',
}
const deep = new Set([
  'project-case-studies', 'system-design-interview', 'coding-interview-loop', 'debugging-interview',
  'architecture-tradeoffs', 'ai-tooling-interview', 'cloud-data-interview', 'take-home-execution',
  'offer-negotiation', 'feedback-retro',
])
const capstones = new Set(['application-pipeline', 'career-capstone'])

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
    '    # TODO: implement the evidence calculation from the supplied career fixtures.',
    '    # Return inspectable evidence; do not invent experience, outcomes, or market data.',
    '    raise NotImplementedError("complete the career evidence decision")',
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
    '# 1. Predict the evidence verdict before running the reference.',
    '# 2. Trace every supplied fixture and name the weakest assumption.',
    `# 3. Implement only ${targetFunctions[lessonSlug]} at the TODO.`,
    '# 4. Match every output line, add one hostile or boundary case, and retain it as a regression.',
    '# 5. Replace sample claims only with truthful artifacts and measurements you can defend.',
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
    title: `Build the ${concept.title.toLowerCase()} evidence loop`,
    summary: `Use the supplied career fixtures to implement, run, and explain the decision at the center of this lesson. ${contract.outcome} Match the exact observable contract, retain a hostile-question or boundary-case regression, and state what evidence would reverse your conclusion. Replace sample claims only with truthful, inspectable work. Local results remain practice evidence until independently reviewed.`,
    language: 'python',
    starter,
    check: exactOutput(solution, lessonSlug),
  }
  const workedExample = {
    type: 'worked-example',
    title: `${walkthrough.title}: claim to evidence`,
    intro: `Trace a weak claim and a proof-bonded claim through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: [
      'Write the expected evidence verdict before executing the practice reference.',
      ...walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${(step.lines ?? []).join(', ')}`}`),
      'Change one input across the decision threshold and explain why the recommendation reverses.',
    ],
    result: contract.proof,
    commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  }
  const debug = {
    type: 'debug',
    symptom: comparison.left.verdict,
    brokenCode: starter,
    language: 'python',
    task: `Add a fixture that reproduces the weak decision in ${comparison.left.label}, repair ${targetFunctions[lessonSlug]}, and retain the minimized case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  }
  const tradeoff = {
    type: 'tradeoff',
    question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: `${comparison.caption} Defend the choice with truthful artifacts, explicit uncertainty, a reversal threshold, and a repair plan.`,
  }

  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', workedExample)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration',
    artifact: contract.proof,
    weak: 'A polished claim has no target role, inspectable artifact, baseline, measurement, rejected option, hostile objection, or retained regression.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a decision-reversing fixture, truthful artifact links, a retained regression, reviewer objection, repair note, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; artifact verification, mock-interview review, and real hiring outcomes remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match exact output.`,
      'Debug evidence — retain a minimized weak-claim, boundary, or hostile-objection regression.',
      `Decision evidence — defend ${comparison.title} and name the reversal threshold.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })

  contract.intensity = capstones.has(lessonSlug) ? 'capstone' : deep.has(lessonSlug) ? 'deep' : 'standard'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Interview/Career/Portfolio lessons with exact Python labs and proof-bonded career mastery gates.')
