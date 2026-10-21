import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-frontend_fullstack'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Frontend lesson and reference coverage drift')
}

const targetFunctions = {
  'product-workflow-states': 'renderStatus',
  'semantic-html-structure': 'auditOutline',
  'responsive-layout-grid': 'resolveGrid',
  'types-and-ui-contracts': 'renderCard',
  'component-composition': 'renderCart',
  'client-state-machine': 'uploadMachine',
  'forms-validation': 'validateEmailField',
  'loading-empty-error-success': 'renderState',
  'api-client-contracts': 'parseOrders',
  'tables-filters-pagination': 'getView',
  'dashboard-metrics-charts': 'render',
  'detail-routes-drawers': 'resolveDetailState',
  'action-safety-optimistic-ui': 'runMutation',
  'auth-protected-routes': 'handleRoute',
  'accessibility-keyboard': 'reduceKey',
  'responsive-visual-proof': 'auditViewport',
  'frontend-testing-strategy': 'runInSearchPanelTests',
  'fullstack-integration-workflow': 'toStatus',
  'deployment-env-observability': 'healthCheck',
  'fullstack-capstone': 'reducer',
}

function maskFunction(code, functionName, lessonSlug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`function ${functionName}(`))
  if (start < 0) throw new Error(`${lessonSlug}: target function ${functionName} not found`)
  let depth = 0
  let end = -1
  for (let index = start; index < lines.length; index += 1) {
    depth += (lines[index].match(/{/g) ?? []).length
    depth -= (lines[index].match(/}/g) ?? []).length
    if (index > start && depth === 0) { end = index; break }
  }
  if (end < 0) throw new Error(`${lessonSlug}: closing brace for ${functionName} not found`)
  lines.splice(start + 1, end - start - 1,
    '  // TODO: implement the accessible UI decision against every supplied state and boundary.',
    '  // Keep loading, empty, error, success, denied, rollback, and keyboard behavior observable.',
    '  throw new Error("complete the frontend evidence decision");',
  )
  return lines.join('\n')
}

function exactOutput(solution, lessonSlug) {
  if (solution.language !== 'js') throw new Error(`${lessonSlug}: expected JavaScript reference`)
  const result = spawnSync('node', ['-e', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
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
  required(blocks, 'concept', lessonSlug)
  const walkthrough = required(blocks, 'code-walkthrough', lessonSlug)
  const comparison = required(blocks, 'compare', lessonSlug)
  const verification = required(blocks, 'verification', lessonSlug)
  const transfer = required(blocks, 'transfer', lessonSlug)
  const solution = solutions[lessonSlug]
  solution.language = 'js'
  const starter = [
    `// ${walkthrough.title}`,
    `// Mission: ${contract.outcome}`,
    '// Novice workflow:',
    '// 1. Enumerate loading, empty, error, success, denied, and rollback states before coding.',
    '// 2. Identify the semantic HTML, keyboard, data, auth, and responsive boundary under test.',
    `// 3. Implement only ${targetFunctions[lessonSlug]} at the TODO.`,
    '// 4. Run every fixture, add one failure or accessibility case, and retain it as a regression.',
    '// 5. Explain what must still be proven in a real browser and production-like environment.',
    '// Evidence checklist:',
    ...verification.items.map((item, index) => `// ${index + 1}. ${item}`),
    '// Local execution is practice feedback only; it cannot create mastery evidence.',
    '',
    maskFunction(solution.code, targetFunctions[lessonSlug], lessonSlug),
  ].join('\n')
  const lab = required(blocks, 'lab', lessonSlug)
  lab.language = 'js'
  lab.starter = starter
  lab.check = exactOutput(solution, lessonSlug)
  lab.summary = `Implement the deterministic UI or full-stack boundary for this lesson and prove every supplied state. ${contract.outcome} Match the exact observable contract, retain an accessibility or failure regression, and name the browser or production evidence still required. Local output remains practice-only evidence.`

  for (const type of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) remove(blocks, type)
  before(blocks, 'concept', {
    type: 'worked-example', title: `${walkthrough.title}: state-to-proof walk-through`,
    intro: `Trace one successful and one inaccessible, denied, stale, or failed path through ${lessonSlug.replaceAll('-', ' ')} before editing the TODO.`,
    setup: contract.outcome, code: walkthrough.code, language: walkthrough.language,
    steps: ['Predict the semantic and visible result before executing.', ...walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`), 'Change one state or boundary and identify the exact regression evidence.'],
    result: contract.proof, commonMistake: `${comparison.left.label}: ${comparison.left.verdict}`,
  })
  after(blocks, 'lab', {
    type: 'debug', language: 'js', brokenCode: starter, symptom: comparison.left.verdict,
    task: `Reproduce the weak UI behavior in ${comparison.left.label}, repair ${targetFunctions[lessonSlug]}, and retain the minimized accessibility or failure case as a regression check.`,
    fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
  })
  after(blocks, 'debug', {
    type: 'tradeoff', question: comparison.title,
    optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
    optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
    guidance: `${comparison.caption} Defend the selected state, component, client/server, and testing boundary with accessibility, failure cost, performance, and reversibility evidence.`,
  })
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'One happy-path render passes, but semantic, keyboard, responsive, denied, error, rollback, or production evidence is absent.',
    passing: `The exact JavaScript reference passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus an accessibility or failure fixture, retained regression, browser-proof plan, reviewer objection, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; real-browser, controlled evaluation, and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targetFunctions[lessonSlug]} and match exact output.`,
      'Debug evidence — retain a minimized inaccessible, denied, stale, or failed state as a regression.',
      `Decision evidence — defend ${comparison.title}.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '90–120 min' : '60–90 min'
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
console.log('Upgraded 20 Frontend and Full-Stack lessons with exact JavaScript contracts, accessible state loops, and proof gates.')
