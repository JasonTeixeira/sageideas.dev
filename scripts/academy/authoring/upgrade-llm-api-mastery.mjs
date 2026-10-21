import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'the-llm-api'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = readJson(lessonPath)
const existingSolutions = readJson(solutionPath)

const addedSolutions = {
  'llm-request-response-contract': { language: 'js', code: `const request = { model: "claude-haiku-4-5", messages: [] };
function validate(req) {
  const problems = [];
  if (!req.model || typeof req.model !== "string") problems.push("model must be a non-empty string");
  if (!Array.isArray(req.messages) || req.messages.length === 0) problems.push("messages must be a non-empty array");
  if (!(typeof req.max_tokens === "number" && req.max_tokens > 0)) problems.push("max_tokens must be a positive number");
  return { valid: problems.length === 0, problems };
}
const result = validate(request);
console.log("valid:", result.valid);
console.log("problems:", result.problems.join("; ") || "none");` },
  'messages-array-roles': { language: 'js', code: `const conversation = [
  { role: "system", content: "Be concise." },
  { role: "user", content: "a" },
  { role: "user", content: "b" },
  { role: "assistant", content: "c" },
];
function firstProblem(messages) {
  let previous = null;
  for (let index = 0; index < messages.length; index += 1) {
    const role = messages[index].role;
    if (role === "system") { if (index !== 0) return index; continue; }
    if (previous === null && role !== "user") return index;
    if (previous === role) return index;
    if (previous && !((previous === "user" && role === "assistant") || (previous === "assistant" && role === "user"))) return index;
    previous = role;
  }
  return -1;
}
console.log("first problem at index:", firstProblem(conversation));` },
  'generation-parameters': { language: 'js', code: `const config = { provider: "anthropic-modern", temperature: 0, top_p: 0.9, max_tokens: 512 };
function violations(candidate) {
  const problems = [];
  if (candidate.temperature !== undefined && candidate.top_p !== undefined) problems.push("tuning two randomness axes (temperature + top_p)");
  if (candidate.provider === "anthropic-modern" && candidate.temperature !== undefined && candidate.temperature !== 1.0) problems.push("temperature deprecated on modern Anthropic (only 1.0 accepted)");
  if (candidate.temperature !== undefined && (candidate.temperature < 0 || candidate.temperature > 2)) problems.push("temperature out of range");
  return problems;
}
console.log("violations:", violations(config).join(" | ") || "none");` },
  'streaming-responses': { language: 'js', code: `const raw = [
  'data: {"delta":"Hel"}', 'data: {"delta":"lo, "}', 'data: {"delta":"world"}',
  'data: {"stop_reason":"end_turn"}', 'data: [DONE]',
].join("\\n");
function parseSSE(stream) {
  let text = "", events = 0, stop = null;
  for (const line of stream.split("\\n")) {
    const payload = line.replace(/^data:\\s*/, "");
    if (payload === "[DONE]") break;
    const event = JSON.parse(payload);
    if (typeof event.delta === "string") { text += event.delta; events += 1; }
    if (event.stop_reason) stop = event.stop_reason;
  }
  return { text, events, stop };
}
const result = parseSSE(raw);
console.log("text:", result.text);
console.log("events:", result.events, "stop:", result.stop);` },
  'structured-outputs-json': { language: 'js', code: `const schema = { type: "object", additionalProperties: false, required: ["name", "age"], properties: { name: { type: "string" }, age: { type: "number" } } };
const candidate = { name: "Jane", age: "54", city: "NYC" };
function validate(object, contract) {
  const errors = [];
  for (const key of contract.required) if (!(key in object)) errors.push("missing " + key);
  for (const [key, rule] of Object.entries(contract.properties)) if (key in object && typeof object[key] !== rule.type) errors.push(key + " should be " + rule.type);
  if (contract.additionalProperties === false) for (const key of Object.keys(object)) if (!(key in contract.properties)) errors.push("unexpected key " + key);
  return errors;
}
const errors = validate(candidate, schema);
console.log("valid:", errors.length === 0);
console.log("errors:", errors.join("; ") || "none");` },
  'retries-backoff-idempotency': { language: 'js', code: `function makeRng(seed) { let state = seed >>> 0; return () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
function delays(attempts, baseMs, capMs, retryAfter, seed) {
  const random = makeRng(seed);
  const result = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (typeof retryAfter[attempt] === "number") result.push(retryAfter[attempt]);
    else result.push(Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt)));
  }
  return result;
}
console.log("delays:", delays(5, 100, 2000, [null, null, 1500, null, null], 42).join(","));` },
  'secrets-provider-boundary': { language: 'js', code: `const files = [
  { name: "a.js", code: 'const key = "' + 'sk-ant-' + 'example-not-a-real-key";' },
  { name: "b.js", code: 'const key = process.env.LLM_API_KEY;' },
  { name: "c.js", code: 'const token = "example-literal";' },
];
function scan(file) {
  const issues = [];
  if (/sk-ant-[A-Za-z0-9-]+/.test(file.code)) issues.push("hardcoded secret literal");
  if (/\\b(key|token|secret)\\b\\s*=/.test(file.code) && !/process\\.env\\./.test(file.code)) issues.push("credential not from env");
  return issues;
}
for (const file of files) console.log(file.name + ": " + (scan(file).join("; ") || "ok"));` },
}

const targets = {
  'llm-request-response-contract': 'validate', 'messages-array-roles': 'firstProblem',
  'tokens-context-window': 'headroom', 'generation-parameters': 'violations',
  'streaming-responses': 'parseSSE', 'structured-outputs-json': 'validate',
  'function-tool-calling': 'runBatch', 'conversation-state': 'normalize',
  'errors-status-codes': 'walk', 'retries-backoff-idempotency': 'delays',
  'rate-limits-concurrency': 'makeBucket', 'timeouts-partials': 'resume',
  'token-cost-model': 'capacity', 'caching-prompt-reuse': 'blended',
  'model-selection-fallbacks': 'chain', 'latency-budgets': 'safeOutput',
  'safety-moderation': 'review', 'llm-observability': 'slo',
  'secrets-provider-boundary': 'scan', 'capstone-resilient-streaming-client': 'drive',
}

const solutions = Object.fromEntries(Object.keys(lessons).map((slug) => [slug, addedSolutions[slug] ?? existingSolutions[slug]]))
if (Object.keys(lessons).length !== 20 || Object.values(solutions).some((solution) => !solution)) throw new Error('LLM API lesson/reference coverage drift')

function maskFunction(code, name, slug) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`function ${name}(`))
  if (start < 0) throw new Error(`${slug}: target function ${name} missing`)
  let end = -1
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('}')) { end = index; break }
  }
  if (end < 0) throw new Error(`${slug}: target function ${name} closing brace missing`)
  lines.splice(start + 1, end - start - 1,
    '  // TODO: implement the provider-boundary decision from the supplied fixtures.',
    '  // Preserve failure discrimination and the exact observable contract.',
    '  throw new Error("complete the LLM API evidence decision");',
  )
  return lines.join('\n')
}

function exactOutput(solution, slug) {
  const result = spawnSync('node', ['-e', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
  if (result.status !== 0 || result.stderr) throw new Error(`${slug}: reference failed: ${result.stderr}`)
  return result.stdout.trimEnd()
}

function removeAudio(value) {
  if (Array.isArray(value)) return value.forEach(removeAudio)
  if (!value || typeof value !== 'object') return
  delete value.audio
  Object.values(value).forEach(removeAudio)
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
  const comparison = required(blocks, 'tradeoff', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const lab = required(blocks, 'lab', key)
  const debug = required(blocks, 'debug', key)
  const solution = solutions[lessonSlug]
  solution.language = 'js'
  const starter = [
    `// ${lab.title}`,
    '//',
    `// Mission: ${contract.outcome}`,
    '//',
    '// Evidence checklist:',
    ...verification.items.map((item, index) => `// ${index + 1}. ${item}`),
    '//',
    '// Novice workflow:',
    '// 1. Read every fixture and predict the output before running it.',
    '// 2. Implement only the TODO function; keep provider I/O outside the decision core.',
    '// 3. Run the program, compare every output line, then add one failing boundary case.',
    '// 4. Retain that case as a regression and explain when your decision would reverse.',
    '// Local execution is practice feedback; it does not create controlled mastery evidence.',
    '',
    maskFunction(solution.code, targets[lessonSlug], lessonSlug),
  ].join('\n')
  lab.language = 'js'
  lab.starter = starter
  lab.check = exactOutput(solution, lessonSlug)
  lab.summary = `Implement and test the deterministic decision core for this LLM API boundary before connecting a live provider. ${contract.outcome} Use the supplied fixtures to distinguish success from malformed input, truncation, unsafe output, overload, excess cost, or provider failure, and preserve the failing case as evidence.`
  debug.language = 'js'
  debug.brokenCode = starter
  debug.task = `Reproduce the failure described in this lesson with the smallest fixture, repair ${targets[lessonSlug]}, and retain the case as a regression check that fails before the repair and passes afterward.`
  remove(blocks, 'calibration')
  remove(blocks, 'unlock-gate')
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'The happy path prints output, but malformed, truncated, unsafe, overloaded, or unaffordable behavior is not distinguished and no regression is retained.',
    passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a new provider-neutral failure fixture, retained regression, explicit rejected option, and this transfer: ${transfer.text}`,
    note: 'This rubric calibrates local practice only; controlled evaluation and expert review remain required for mastery and certification.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targets[lessonSlug]} and match the exact output contract.`,
      'Debug evidence — retain a minimized provider-boundary failure as a regression.',
      `Decision evidence — defend the selected tradeoff: ${comparison.question ?? comparison.title}.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or production certification.',
  })
  if (lessonSlug === 'capstone-resilient-streaming-client') contract.intensity = 'capstone'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : contract.intensity === 'deep' ? '2–4 hrs' : '60–90 min'
}

removeAudio(lessons)
const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'llm-systems')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing llm-systems mapping')
mapping.lessonSlugs = Object.keys(lessons)
writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} LLM API lessons, repaired every reference contract, and removed unresolved audio promises.`)
