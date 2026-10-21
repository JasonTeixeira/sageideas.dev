import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-platform_engineering_internal_developer_platforms'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const unorderedSolutions = readJson(solutionPath)
const solutions = Object.fromEntries(Object.keys(lessons).map((slug) => [slug, unorderedSolutions[slug]]))
if (Object.keys(lessons).length !== 20 || Object.values(solutions).some((solution) => !solution)) throw new Error('Platform Engineering lesson/reference coverage drift')

const targets = {
  'platform-vs-devops-boundary': 'audit',
  'developer-journey-mapping': 'map_journey',
  'golden-path-definition': 'assess',
  'adoption-metrics': 'scorecard',
  'service-scaffold': 'validate',
  'ci-cd-contract': 'classify',
  'artifact-promotion': 'gate',
  'rollback-workflow': 'decide',
  'iac-module-design': 'lint',
  'environment-lifecycle': 'sweep',
  'secrets-management': 'scan',
  'policy-as-code': 'evaluate',
  'kubernetes-abstractions': 'render',
  'logging-metrics-traces': 'analyze',
  'slo-defaults': 'classify',
  'incident-ready-services': 'evaluate',
  'self-service-controls': 'assess',
  'cost-and-quota-guardrails': 'admit',
  'support-model': 'route',
  'platform-roadmap-review': 'review',
}

function maskFunction(code, name, slug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`def ${name}(`))
  if (start < 0) throw new Error(`${slug}: target function ${name} missing`)
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && !/^\s/.test(lines[index])) { end = index; break }
  }
  lines.splice(start + 1, end - start - 1,
    '    # TODO: implement the platform decision from the supplied delivery fixtures.',
    '    # Preserve failure discrimination and the exact observable contract.',
    '    raise NotImplementedError("complete the platform evidence decision")',
    '',
  )
  return lines.join('\n')
}

function exactOutput(solution, slug) {
  const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
  if (result.status !== 0 || result.stderr) throw new Error(`${slug}: reference failed: ${result.stderr}`)
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
  const missionIndexes = blocks.flatMap((block, index) => block.type === 'mission' ? [index] : [])
  for (const index of missionIndexes.slice(1).reverse()) blocks.splice(index, 1)
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
    '#',
    '# Evidence checklist:',
    ...verification.items.map((item, index) => `# ${index + 1}. ${item}`),
    '#',
    '# Work only in the TODO function. Run every fixture and compare every output line.',
    '# Local execution is practice feedback; it does not create controlled mastery evidence.',
    '',
    maskFunction(solution.code, targets[lessonSlug], lessonSlug),
  ].join('\n')
  const lab = {
    type: 'lab',
    title: `Prove the ${concept.title.toLowerCase()} evidence loop`,
    summary: `Use the supplied platform, delivery, and service fixtures to implement, execute, and explain the decision at the center of this lesson. ${contract.outcome} The exact output must distinguish a genuinely paved, supportable path from at least one portal facade, policy bypass, unsafe promotion, orphaned environment, or unowned failure.`,
    language: 'python', starter, check: exactOutput(solution, lessonSlug),
  }
  const worked = {
    type: 'worked-example',
    intro: `${walkthrough.title}. Trace the complete platform artifact before implementing its deterministic evidence model.`,
    code: walkthrough.code, language: walkthrough.language,
    steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
    commonMistake: comparison.left.verdict,
  }
  const debug = {
    type: 'debug', symptom: comparison.left.verdict, brokenCode: starter, language: 'python',
    task: `Add a fixture that reproduces ${comparison.left.label}, make its developer or operator impact observable, repair the platform boundary, and retain the case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  }
  const existingTradeoff = remove(blocks, 'tradeoff')
  const tradeoff = existingTradeoff ?? {
    type: 'tradeoff', question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: comparison.caption,
  }
  for (const type of ['worked-example', 'lab', 'debug', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', worked)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: `A portal, template, or script runs, but the ${comparison.left.label} failure, developer impact, exact evidence, or retained regression is missing.`,
    passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a new failure fixture, retained regression, explicit rejected option, and this transfer: ${transfer.text}`,
    note: 'This rubric calibrates local practice only; controlled evaluation and expert review remain required for mastery and certification.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targets[lessonSlug]} and match the exact output contract.`,
      `Debug evidence — retain the ${comparison.left.label} case as a regression.`,
      `Decision evidence — defend ${comparison.right.label} and name its reversal condition.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or production certification.',
  })
  if (lessonSlug === 'platform-roadmap-review') contract.intensity = 'capstone'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'reliability-platform')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing reliability-platform mapping')
mapping.lessonSlugs = Object.keys(lessons)
writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Platform Engineering lessons with exact practice labs and calibrated platform evidence.`)
