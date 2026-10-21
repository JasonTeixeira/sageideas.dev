import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'system-design'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 24) throw new Error('System Design lesson coverage drift')

const replaceOnce = (source, needle, replacement, key) => {
  if (!source.includes(needle)) throw new Error(`${key}: solution marker not found`)
  return source.replace(needle, replacement)
}
const starter = (slug) => lessons[slug].find((block) => block.type === 'lab').starter

solutions['what-system-design-is'] = {
  language: 'js',
  code: replaceOnce(
    starter('what-system-design-is'),
    'function analyze(s) { /* return { functional:[ids], nonFunctional:[ids], tradeoff } */ }',
    `function analyze(s) {
  const functional = [];
  const nonFunctional = [];
  let fastReads = false;
  let durableWrites = false;
  for (const requirement of s.requirements) {
    if (requirement.kind) functional.push(requirement.id);
    else nonFunctional.push(requirement.id);
    if (requirement.quality === "latency" && typeof requirement.value === "number" && requirement.value <= 100) fastReads = true;
    if (requirement.quality === "durability") durableWrites = true;
  }
  return {
    functional,
    nonFunctional,
    tradeoff: fastReads && durableWrites ? "low-latency reads vs durable writes" : "none",
  };
}`,
    'what-system-design-is',
  ),
}

solutions['building-blocks'] = {
  language: 'js',
  code: replaceOnce(
    starter('building-blocks'),
    'function analyze(path, stateless) { /* return { roles:[...], valid, problems:[...] } */ }',
    `function analyze(path, stateless) {
  const roles = path.map((component) => \`\${component}: \${ROLES[component] ?? "unknown role"}\`);
  const problems = [];
  const cacheIndex = path.indexOf("cache");
  const databaseIndex = path.indexOf("database");
  if (cacheIndex < 0 || databaseIndex < 0 || cacheIndex >= databaseIndex) problems.push("cache must precede database");
  if (!stateless["app-server"]) problems.push("app-server must be stateless");
  return { roles, valid: problems.length === 0, problems };
}`,
    'building-blocks',
  ),
}

const required = (blocks, type, key) => {
  const block = blocks.find((candidate) => candidate.type === type)
  if (!block) throw new Error(`${key}: missing ${type}`)
  return block
}
const before = (blocks, type, block) => {
  const index = blocks.findIndex((candidate) => candidate.type === type)
  if (index < 0) throw new Error(`Cannot insert before missing ${type}`)
  blocks.splice(index, 0, block)
}

for (const [lessonSlug, blocks] of Object.entries(lessons)) {
  const key = `${courseSlug}/${lessonSlug}`
  const contract = required(blocks, 'sprint-contract', key)
  const lab = required(blocks, 'lab', key)
  const debug = required(blocks, 'debug', key)
  const tradeoff = required(blocks, 'tradeoff', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const gate = required(blocks, 'unlock-gate', key)
  lab.language = 'js'
  if (solutions[lessonSlug]) solutions[lessonSlug].language = 'js'

  if (!/regression/i.test(debug.task ?? '')) {
    debug.task = `${debug.task} Retain the repaired case as a regression check.`
  }
  if (!blocks.some((block) => block.type === 'calibration')) {
    before(blocks, 'transfer', {
      type: 'calibration',
      artifact: contract.proof,
      weak: 'The diagram or code names familiar components, but its capacity, consistency, failure, or data-flow claims are asserted rather than computed.',
      passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
      excellent: `Passing evidence plus a retained adversarial regression, an explicit decision under constraints, and this transfer: ${transfer.text}`,
      note: 'Local output and hosted narration are practice evidence only; controlled evaluation and expert review are still required for mastery.',
    })
  }
  gate.criteria = [
    `Build evidence — complete the model and match the exact observable output: ${lab.check}`,
    `Debug evidence — repair and retain this case as a regression: ${debug.task}`,
    `Decision evidence — defend the chosen constraint in "${tradeoff.question}" and name the rejected alternative.`,
    `Verification evidence — ${verification.items.join(' · ')}`,
    `Transfer evidence — ${transfer.text}`,
  ]
  gate.practiceOnlyNotice = 'This deterministic local lab is practice feedback only, not controlled mastery evidence or production certification.'
}

Object.assign(required(lessons['designing-a-real-system'], 'sprint-contract', 'designing-a-real-system'), {
  intensity: 'deep',
  time: '2–4 hrs',
  proof: 'A composed shortener with a requirements ledger, capacity budget, request/data-flow diagram, unique codes, coherent shard routing, cache behavior, rate limits, failure probes, and exact invariant checks.',
})
Object.assign(required(lessons['capstone-design-and-defend'], 'sprint-contract', 'capstone-design-and-defend'), {
  intensity: 'capstone',
  time: 'Multi-day',
  proof: 'A versioned design packet and executable validator proving capacity, consistency, cache, observability, overload, and blast-radius gates against explicit requirements, including failed and repaired designs.',
  unlock: 'You can derive, challenge, revise, and defend a production system design with computed evidence rather than component-name fluency.',
})

const orderedSolutions = Object.fromEntries(Object.keys(lessons).map((slug) => {
  const solution = solutions[slug]
  if (!solution) throw new Error(`${slug}: missing reference solution after upgrade`)
  return [slug, solution]
}))

const graph = readJson(graphPath)
for (const competencyId of ['backend-distributed-systems', 'production-integration']) {
  const competency = graph.competencies.find((candidate) => candidate.id === competencyId)
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
  if (!mapping) throw new Error(`${competencyId}: missing System Design mapping`)
  mapping.lessonSlugs = Object.keys(lessons)
}

writeJson(lessonPath, lessons)
writeJson(solutionPath, orderedSolutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} System Design lessons and completed all exact reference contracts.`)
