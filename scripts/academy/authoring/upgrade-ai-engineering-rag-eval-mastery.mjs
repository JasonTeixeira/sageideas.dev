import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const slug = 'career-ai_engineering_rag_eval'
const lessonPath = `data/academy/authoring/${slug}.lessons.json`
const solutionPath = `data/academy/authoring/${slug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const write = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = read(lessonPath)
const solutions = read(solutionPath)

if (Object.keys(solutions).length !== Object.keys(lessons).length) throw new Error('reference coverage drift')

function output(solution, key) {
  if (solution.language !== 'python') throw new Error(`${key}: expected python reference`)
  const result = spawnSync('python3', ['-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10000 })
  if (result.status !== 0 || result.stderr) throw new Error(`${key}: ${result.stderr}`)
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

for (const [key, blocks] of Object.entries(lessons)) {
  const contract = required(blocks, 'sprint-contract', key)
  const lab = required(blocks, 'lab', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const compare = required(blocks, 'compare', key)
  const solution = solutions[key]
  lab.language = 'python'
  lab.check = output(solution, key)
  if (!/practice feedback/i.test(lab.starter)) {
    lab.starter = `# Local execution is practice feedback only; it cannot create mastery evidence.\n${lab.starter}`
  }
  if (lab.summary.length <= 150) {
    lab.summary += ' Retain the smallest failed eval or unsafe boundary case as a regression and explain the release decision it changes.'
  }
  for (const type of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', {
    type: 'worked-example',
    title: `${lab.title}: evidence walk-through`,
    intro: `Walk one passing and one failing case through ${key.replaceAll('-', ' ')} before implementing the lab.`,
    setup: contract.outcome,
    steps: [
      'Predict the observable result before running the reference.',
      'Trace one passing case through the packet, retrieval, policy, or evaluation boundary.',
      'Trace one failing or unsafe case and identify the exact gate that catches it.',
      'Record the result and the decision it changes in the release packet.',
    ],
    result: contract.proof,
    commonMistake: 'Treating one convincing output as proof while skipping the failed case, exact metric, or release gate.',
  })
  after(blocks, 'lab', {
    type: 'debug', language: 'python', brokenCode: lab.starter,
    symptom: 'The packet, metric, or guardrail produces an incorrect result on a boundary, abuse, or drift case.',
    fix: 'Minimize the failed case, repair the responsible boundary, rerun the exact contract, and retain the case as a regression.',
    task: 'Reproduce the smallest incorrect, unsafe, or drifting result; repair the boundary and retain that case as a regression check.',
  })
  after(blocks, 'debug', {
    type: 'tradeoff',
    question: `When should this ${key.replaceAll('-', ' ')} pattern be replaced by a simpler deterministic workflow?`,
    optionA: { label: 'Measured AI path', text: `Use the evaluated AI path when the evidence proves the behavior and ${contract.outcome}` },
    optionB: { label: 'Deterministic path', text: 'Use a fixed workflow when rules are complete, failure cost is high, or adaptive judgment adds no measured value.' },
    guidance: `${compare.title}: defend the selected path with the packet's measured failure, cost, latency, safety, and reversibility evidence.`,
  })
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'A polished demo or packet has no reproduced failure, rerunnable metric, release threshold, or retained regression.',
    passing: `The exact Python reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus an abuse or drift fixture, retained regression, rejected option, reviewer objection, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; controlled evaluation and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      'Build evidence — complete the Python lab and match exact output.',
      'Debug evidence — retain a minimized failure, safety, or drift case as a regression.',
      'Decision evidence — defend the measured AI path against a simpler deterministic workflow.',
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}

const graph = read(graphPath)
for (const competencyId of ['retrieval-systems', 'agent-automation', 'ai-evaluation-safety']) {
  const mapping = graph.competencies.find((competency) => competency.id === competencyId)?.courseMappings.find((course) => course.courseSlug === slug)
  if (!mapping) throw new Error(`${competencyId}: mapping missing`)
  mapping.lessonSlugs = Object.keys(lessons)
}
write(lessonPath, lessons)
write(solutionPath, solutions)
write(graphPath, graph)
console.log('Upgraded 20 AI Engineering, RAG & Evals lessons with exact Python references and calibrated proof gates.')
