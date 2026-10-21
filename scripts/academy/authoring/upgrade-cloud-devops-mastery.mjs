import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-cloud_devops_operations'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Cloud/DevOps lesson and reference coverage drift')
}

const targetFunctions = {
  'cloud-operating-model': 'evaluate_deploys',
  'linux-processes-ports': 'build_port_map',
  'environment-config-secrets': 'boot_config',
  'container-image-design': 'simulate_rebuild',
  'docker-compose-local-stack': 'boot_waves',
  'networking-dns-tls': 'check_path',
  'ci-pipeline-quality-gates': 'run_gates',
  'artifact-versioning-releases': 'resolve_release_state',
  'deployment-strategies': 'run_canary',
  'health-readiness-liveness': 'run_probe_loop',
  'kubernetes-manifests': 'lint_manifests',
  'infrastructure-as-code': 'plan',
  'observability-logs-metrics-traces': 'analyze_trace',
  'alerting-slo-error-budgets': 'evaluate_burn',
  'rollbacks-incident-response': 'analyze_incident',
  'security-supply-chain': 'admit',
  'cost-capacity-finops': 'rightsize_fleet',
  'multi-env-promotion': 'run_promotions',
  'production-readiness-review': 'score_prr',
  'cloud-devops-capstone': 'score_operability',
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
    '    # TODO: implement the operating decision above from the supplied fixtures.',
    '    # Preserve the exact output contract so weak, unsafe, and recovery paths stay visible.',
    '    raise NotImplementedError("complete the production decision")',
    '',
  )
  return lines.join('\n')
}

function exactOutput(solution, lessonSlug) {
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
    '#',
    '# Evidence checklist:',
    ...verification.items.map((item, index) => `# ${index + 1}. ${item}`),
    '#',
    '# Work only in the TODO function. Run the complete fixture set and compare every line.',
    '# Local execution is practice feedback; it does not create controlled mastery evidence.',
    '',
    maskFunction(solution.code, targetFunctions[lessonSlug], lessonSlug),
  ].join('\n')
  const lab = {
    type: 'lab',
    title: `Operate the ${concept.title.toLowerCase()} decision loop`,
    summary: `Use the supplied production fixtures to implement, execute, and explain the decision at the center of this lesson. ${contract.outcome} The exact output must expose both the safe path and at least one failure, block, rollback, or repair path.`,
    language: 'python',
    starter,
    check: exactOutput(solution, lessonSlug),
  }
  const workedExample = {
    type: 'worked-example',
    intro: `${walkthrough.title}. Trace the complete operator artifact before implementing its deterministic decision model.`,
    code: walkthrough.code,
    language: walkthrough.language,
    steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
    commonMistake: comparison.left.verdict,
  }
  const debug = {
    type: 'debug',
    symptom: comparison.left.verdict,
    brokenCode: starter,
    language: 'python',
    task: `Add a fixture that reproduces the unsafe behavior in ${comparison.left.label}, make the failure observable, repair the decision boundary, and retain the case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  }
  const existingTradeoff = remove(blocks, 'tradeoff')
  const tradeoff = existingTradeoff ?? {
    type: 'tradeoff',
    question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: comparison.caption,
  }

  for (const type of ['worked-example', 'lab', 'debug', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', workedExample)
  after(blocks, 'concept', lab)
  after(blocks, 'lab', debug)
  after(blocks, 'debug', tradeoff)
  before(blocks, 'transfer', {
    type: 'calibration',
    artifact: contract.proof,
    weak: `The happy path runs, but the ${comparison.left.label} failure, exact evidence, rollback condition, or retained regression is missing.`,
    passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a new failure fixture, retained regression, explicit rejected option, and this transfer: ${transfer.text}`,
    note: 'This rubric calibrates local practice only; controlled evaluation and expert review remain required for mastery and certification.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match the exact output contract.`,
      `Debug evidence — retain the ${comparison.left.label} case as a regression.`,
      `Decision evidence — defend ${comparison.right.label} and name when the rejected approach would become valid.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or production certification.',
  })

  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'cloud-delivery')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing cloud-delivery mapping')
mapping.lessonSlugs = Object.keys(lessons)

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Cloud/DevOps lessons with exact practice labs and calibrated operational evidence.`)
