import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-product_execution_market_feedback'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Product Execution lesson and reference coverage drift')
}

const targetFunctions = {
  'problem-framing': 'abandonment_by_segment',
  'customer-discovery': 'score_interviews',
  'competitive-landscape': 'best_coverage',
  'value-proposition': 'value_multiple',
  'user-journey': 'step_conversions',
  'experiment-design': 'evaluate_experiment',
  'mvp-scope': 'rank_scopes',
  'prd-rfc': 'lint_packet',
  'metric-design': 'leverage',
  'instrumentation': 'validate_events',
  'feedback-intake': 'weighted_tally',
  'prioritization': 'rice_score',
  'roadmap-strategy': 'pack_roadmap',
  'go-to-market': 'channel_economics',
  'pricing-packaging': 'revenue_at',
  'launch-readiness': 'readiness_gate',
  'post-launch-analysis': 'cohort_read',
  'iteration-loop': 'trend_read',
  'stakeholder-communication': 'bluf_numbers',
  'product-capstone': 'run_chain',
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
    '    # TODO: implement the evidence calculation from the supplied product fixtures.',
    '    # Return data, not a persuasive verdict; the caller owns the explicit decision threshold.',
    '    raise NotImplementedError("complete the product evidence decision")',
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
    '# 1. Predict the decision before running the code.',
    '# 2. Trace the supplied fixtures and name the weakest assumption.',
    `# 3. Implement only ${targetFunctions[lessonSlug]} at the TODO.`,
    '# 4. Match every output line, add one boundary case, and retain it as a regression.',
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
    summary: `Use the supplied product fixtures to implement, run, and explain the decision at the center of this lesson. ${contract.outcome} Match the exact observable contract, retain a boundary-case regression, and state the threshold that would reverse the product decision. Local results remain practice evidence until reviewed in a controlled evaluator.`,
    language: 'python',
    starter,
    check: exactOutput(solution, lessonSlug),
  }
  const workedExample = {
    type: 'worked-example',
    title: `${walkthrough.title}: evidence before advocacy`,
    intro: `Trace a passing case and a decision-reversing case through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: [
      'Write the expected metric or classification before executing the reference.',
      ...walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
      'Change one input across the registered threshold and explain why the decision reverses.',
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
    guidance: `${comparison.caption} Defend the decision with observed evidence, explicit uncertainty, cost of delay, and a reversible next step.`,
  }

  for (const type of ['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', workedExample)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration',
    artifact: contract.proof,
    weak: 'A persuasive recommendation has no reproduced customer evidence, exact metric, invalidation threshold, rejected option, or retained regression.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a decision-reversing fixture, retained regression, rejected option, reviewer objection, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; controlled evaluation and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match exact output.`,
      'Debug evidence — retain a minimized threshold or data-quality failure as a regression.',
      `Decision evidence — defend ${comparison.title} with a reversal threshold.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })

  if (lessonSlug === 'experiment-design') contract.intensity = 'deep'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}

const graph = readJson(graphPath)
const mapping = graph.competencies.find((competency) => competency.id === 'production-integration')?.courseMappings.find((course) => course.courseSlug === courseSlug)
if (!mapping) throw new Error('production-integration mapping missing')
mapping.lessonSlugs = Object.keys(lessons)

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log('Upgraded 20 Product Execution lessons with exact Python labs, calibrated decisions, and production-integration evidence.')
