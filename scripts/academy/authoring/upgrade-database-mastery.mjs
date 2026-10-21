import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-databases_data_modeling'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const requiredBlock = (blocks, type, key) => {
  const block = blocks.find((candidate) => candidate.type === type)
  if (!block) throw new Error(`${key}: missing ${type}`)
  return block
}

const insertBefore = (blocks, type, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  if (index < 0) throw new Error(`Cannot insert ${block.type}: missing ${type}`)
  blocks.splice(index, 0, block)
}

const insertAfter = (blocks, type, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  if (index < 0) throw new Error(`Cannot insert ${block.type}: missing ${type}`)
  blocks.splice(index + 1, 0, block)
}

const workedExample = (walkthrough, comparison) => ({
  type: 'worked-example',
  intro: `${walkthrough.title}. Trace the schema, query grain, invariant, and observable result before editing the SQL lab.`,
  code: walkthrough.code,
  language: walkthrough.language,
  steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
  commonMistake: comparison.left.verdict,
})

const debugBlock = (lab, comparison, verification) => ({
  type: 'debug',
  symptom: comparison.left.verdict,
  brokenCode: `${lab.starter}\n\n-- Deliberately implement the weak ${comparison.left.label} approach first.`,
  language: 'sql',
  task: `Add one row or concurrent-state fixture that defeats the weak ${comparison.left.label} approach. Reproduce the wrong result, repair the SQL or schema, and keep the failing case as a regression check. Prove the repair with: ${verification.items.join(' · ')}`,
  fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
})

const tradeoffBlock = (comparison) => ({
  type: 'tradeoff',
  question: comparison.title,
  optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
  optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
  guidance: comparison.caption,
})

const calibrationBlock = (contract, verification, transfer) => ({
  type: 'calibration',
  artifact: contract.proof,
  weak: 'The query happens to return the sample rows but the schema invariant, query grain, failure case, or replayable proof is missing.',
  passing: `The SQL output is exact and the evidence packet satisfies every verification item: ${verification.items.join(' · ')}`,
  excellent: `Passing evidence plus one unseen fixture, a retained regression, an EXPLAIN-or-invariant justification, and this transfer: ${transfer.text}`,
  note: 'Score the schema, query, failure evidence, and reproducibility separately. Exact local output is practice feedback, not controlled mastery evidence.',
})

const unlockGate = (contract, lab, debug, verification, transfer) => ({
  type: 'unlock-gate',
  criteria: [
    `Build evidence — complete the SQL lab and match its exact result contract: ${lab.check.split('\n')[0]}.`,
    `Debug evidence — reproduce the weak design and retain the repaired fixture as a regression: ${debug.symptom}`,
    `Data evidence — produce the inspectable artifact promised by the sprint: ${contract.proof}`,
    `Verification evidence — satisfy every check: ${verification.items.join(' · ')}`,
    `Transfer evidence — apply the database reasoning to a materially different schema or workload: ${transfer.text}`,
  ],
  practiceOnlyNotice: 'The in-browser SQLite result is deterministic practice feedback only; it is not controlled mastery evidence or a production database certification.',
})

const transactionSolution = `-- Atomicity is all-or-nothing: both balance updates commit, or neither survives.
CREATE TABLE accounts (
  id      TEXT PRIMARY KEY,
  owner   TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (id, owner, balance) VALUES
  ('A', 'Ada', 300),
  ('B', 'Boaz', 120),
  ('C', 'Cyra', 900);

-- Successful transfer: both writes persist together.
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 250 WHERE id = 'C';
UPDATE accounts SET balance = balance + 250 WHERE id = 'A';
COMMIT;

-- Cancelled transfer: both staged writes disappear together.
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 90 WHERE id = 'B';
UPDATE accounts SET balance = balance + 90 WHERE id = 'C';
ROLLBACK;

SELECT id, owner, balance FROM accounts ORDER BY id;
`

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20) throw new Error('Database course must contain 20 lessons')
if (JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Database lesson/solution coverage drift')
}

solutions['transactions-atomicity'] = { language: 'sql', code: transactionSolution }

for (const [lessonSlug, blocks] of Object.entries(lessons)) {
  const key = `${courseSlug}/${lessonSlug}`
  const contract = requiredBlock(blocks, 'sprint-contract', key)
  const walkthrough = requiredBlock(blocks, 'code-walkthrough', key)
  const comparison = requiredBlock(blocks, 'compare', key)
  const lab = requiredBlock(blocks, 'lab', key)
  const verification = requiredBlock(blocks, 'verification', key)
  const transfer = requiredBlock(blocks, 'transfer', key)

  if (!blocks.some((block) => block.type === 'worked-example')) {
    insertBefore(blocks, 'concept', workedExample(walkthrough, comparison))
  }

  let debug = blocks.find((block) => block.type === 'debug')
  if (!debug) {
    debug = debugBlock(lab, comparison, verification)
    insertAfter(blocks, 'lab', debug)
  } else if (!/regression/i.test(debug.task ?? '')) {
    debug.task = `${debug.task} Keep the repaired failure case as a regression check so the defect cannot silently return.`
  }

  if (!blocks.some((block) => block.type === 'tradeoff')) {
    const debugIndex = blocks.indexOf(debug)
    const labIndex = blocks.indexOf(lab)
    insertAfter(blocks, debugIndex > labIndex ? 'debug' : 'lab', tradeoffBlock(comparison))
  }
  if (!blocks.some((block) => block.type === 'calibration')) {
    insertBefore(blocks, 'transfer', calibrationBlock(contract, verification, transfer))
  }
  if (!blocks.some((block) => block.type === 'unlock-gate')) {
    insertAfter(blocks, 'spaced-review', unlockGate(contract, lab, debug, verification, transfer))
  }
}

const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'data-modeling')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing data-modeling course mapping')
mapping.lessonSlugs = Object.keys(lessons)

writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Database lessons while preserving their SQL labs.`)
