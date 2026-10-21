import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const slug = 'rag-retrieval'
const lessonPath = `data/academy/authoring/${slug}.lessons.json`
const solutionPath = `data/academy/authoring/${slug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const write = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const lessons = read(lessonPath)
const existing = read(solutionPath)

const added = {
  'loaders-cleaning': { language: 'js', code: `const raw = [
  "  Refunds   are processed within 30 days.  ",
  "Home", "", "Contact support for help.", "Cookie settings",
  "   ", "We reply within one business day.", "© 2026 SageIdeas"
];
const boilerplate = [/^home$/i, /^cookie settings$/i, /^©/];
function clean(lines, rejectedPatterns) {
  const kept = [], removed = [];
  for (const original of lines) {
    const normalized = original.trim().replace(/\\s+/g, " ");
    if (!normalized || rejectedPatterns.some((pattern) => pattern.test(normalized))) removed.push(original);
    else kept.push(normalized);
  }
  return { kept, removed };
}
const result = clean(raw, boilerplate);
for (const line of result.kept) console.log(line);
console.log("removed:", result.removed.length);` },
  'metadata-provenance': { language: 'js', code: `const inputs = [
  { source: "policy", start: 0, end: 23, text: "Refunds within 30 days" },
  { source: "faq", start: 0, end: 20, text: "Password reset help" },
  { source: "policy", start: 24, end: 46, text: "A $50 fee may apply" },
];
function records(chunks, allowedSource) {
  return chunks
    .map((chunk) => ({ ...chunk, id: chunk.source + "#" + chunk.start, updated: 95 }))
    .filter((chunk) => chunk.source === allowedSource);
}
const kept = records(inputs, "policy");
for (const chunk of kept) console.log(chunk.id + " [" + chunk.start + "," + chunk.end + "]");
console.log("kept:", kept.length);` },
  'grounding-contract': { language: 'js', code: `const context = ["Refunds are processed within 30 days.", "A $50 restocking fee applies."];
const claims = ["refunds within 30 days", "shipping is refunded too"];
function auditClaims(passages, candidateClaims) {
  const evidence = passages.join(" ").toLowerCase();
  return candidateClaims.map((claim) => {
    const terms = claim.toLowerCase().split(/\\s+/).filter((word) => word.length > 3 || /\\d/.test(word));
    return { claim, supported: terms.every((term) => evidence.includes(term)) };
  });
}
const audited = auditClaims(context, claims);
for (const item of audited) console.log(item.claim + ": " + (item.supported ? "grounded" : "UNGROUNDED"));
console.log("answer grounded:", audited.every((item) => item.supported));` },
  'citations-source-spans': { language: 'js', code: `const chunks = [
  { source: "policy", start: 0, end: 36, text: "Refunds are processed within 30 days." },
  { source: "policy", start: 37, end: 71, text: "A $50 restocking fee may apply." },
];
const claims = ["refunds in 30 days", "a $50 fee applies", "free returns forever"];
function citeClaims(passages, candidateClaims) {
  return candidateClaims.map((claim) => {
    const terms = claim.toLowerCase().split(/\\s+/).filter((word) => word.length > 3 || /[$\\d]/.test(word));
    const chunk = passages.find((passage) => terms.every((term) => passage.text.toLowerCase().includes(term)));
    return { claim, chunk };
  });
}
const cited = citeClaims(chunks, claims);
for (const item of cited) console.log(item.claim + " -> " + (item.chunk ? item.chunk.source + "[" + item.chunk.start + "," + item.chunk.end + "]" : "UNCITABLE"));
console.log("citable:", cited.filter((item) => item.chunk).length);` },
  'refusal-when-unsupported': { language: 'js', code: `const cases = [
  { name: "refund window and fee", required: ["window", "fee"], context: "The refund window is 30 days and a $50 fee applies." },
  { name: "refund window and shipping", required: ["window", "shipping"], context: "The refund window is 30 days and a $50 fee applies." },
];
function decide(entry) {
  const haystack = entry.context.toLowerCase();
  const hits = entry.required.filter((aspect) => haystack.includes(aspect)).length;
  return { hits, total: entry.required.length, verdict: hits === entry.required.length ? "answer" : "refuse" };
}
for (const entry of cases) {
  const result = decide(entry);
  console.log(entry.name + ": " + result.hits + "/" + result.total + " -> " + result.verdict);
}` },
  'stale-chunk-handling': { language: 'js', code: `const chunks = [
  { key: "fee", value: "$40", updated: 20 }, { key: "fee", value: "$50", updated: 80 },
  { key: "refund_window", value: "14 days", updated: 30 }, { key: "refund_window", value: "30 days", updated: 95 },
  { key: "shipping", value: "free", updated: 10 },
];
function freshest(items, now, ttl) {
  const live = items.filter((item) => now - item.updated <= ttl[item.key]);
  const newest = new Map();
  for (const item of live) if (!newest.has(item.key) || newest.get(item.key).updated < item.updated) newest.set(item.key, item);
  return [...newest.values()].sort((a, b) => a.key.localeCompare(b.key));
}
const kept = freshest(chunks, 100, { fee: 30, refund_window: 20, shipping: 30 });
for (const item of kept) console.log(item.key + "=" + item.value + " (updated " + item.updated + ")");
console.log("kept:", kept.length);` },
  'recall-at-k': { language: 'js', code: `const labeled = [
  { id: "q1", relevant: ["a", "b"], ranked: ["a", "x", "b"] },
  { id: "q2", relevant: ["c"], ranked: ["c", "z"] },
  { id: "q3", relevant: ["d"], ranked: ["x", "y"] },
];
function recallAtK(entry, k) {
  const top = new Set(entry.ranked.slice(0, k));
  return entry.relevant.filter((id) => top.has(id)).length / entry.relevant.length;
}
const scores = labeled.map((entry) => ({ id: entry.id, score: recallAtK(entry, 2) }));
for (const result of scores) console.log(result.id + ": " + result.score.toFixed(2));
console.log("mean:", (scores.reduce((sum, result) => sum + result.score, 0) / scores.length).toFixed(2));` },
  'answer-faithfulness': { language: 'js', code: `const context = ["Refunds are processed within 30 days.", "There is a 50 dollar restocking fee."];
const claims = ["refunds in 30 days", "there is a 50 dollar fee", "shipping is also refunded", "returns are free forever"];
function faithfulness(passages, candidateClaims) {
  const evidence = passages.join(" ").toLowerCase();
  const audited = candidateClaims.map((claim) => {
    const terms = claim.toLowerCase().split(/\\s+/).filter((word) => word.length > 3 || /\\d/.test(word));
    return { claim, supported: terms.every((term) => evidence.includes(term)) };
  });
  return { audited, score: audited.filter((item) => item.supported).length / audited.length };
}
const result = faithfulness(context, claims);
for (const item of result.audited) console.log(item.claim + ": " + (item.supported ? "supported" : "unsupported"));
console.log("faithfulness:", result.score.toFixed(2));` },
  'capstone-grounded-cited-rag': { language: 'js', code: `const scenarios = [
  { id: "s1", threshold: 0.7, retrieved: [{ id: "p1", score: 0.91, text: "Refunds take 30 days." }], relevant: ["p1"], claims: [{ text: "Refunds take 30 days.", source: "p1" }] },
  { id: "s2", threshold: 0.7, retrieved: [{ id: "p2", score: 0.42, text: "Shipping details." }], relevant: ["missing"], claims: [] },
];
function runScenario(scenario) {
  const accepted = scenario.retrieved.filter((item) => item.score >= scenario.threshold);
  if (!accepted.length) return { verdict: "refuse" };
  const acceptedIds = new Set(accepted.map((item) => item.id));
  const recall = scenario.relevant.filter((id) => acceptedIds.has(id)).length / scenario.relevant.length;
  const supported = scenario.claims.filter((claim) => acceptedIds.has(claim.source)).length;
  const faith = scenario.claims.length ? supported / scenario.claims.length : 0;
  return { verdict: faith === 1 ? "answer" : "refuse", recall, faith };
}
for (const scenario of scenarios) {
  const result = runScenario(scenario);
  console.log(scenario.id + ": " + (result.verdict === "answer" ? "answer recall=" + result.recall.toFixed(2) + " faith=" + result.faith.toFixed(2) : "refuse"));
}` },
}

const targets = {
  'why-rag-grounding': 'audit', 'loaders-cleaning': 'clean', 'chunking-strategies': 'windows',
  'metadata-provenance': 'records', 'embeddings-intuition': 'rankByDistance', 'cosine-similarity': 'mostSimilarPair',
  'vector-stores-upsert': 'purge', 'indexing-versioning': 'promote', 'top-k-thresholds': 'decide',
  'hybrid-search': 'fuse', 'reranking': 'rerank', 'query-rewriting': 'expand', 'grounding-contract': 'auditClaims',
  'citations-source-spans': 'citeClaims', 'refusal-when-unsupported': 'decide', 'stale-chunk-handling': 'freshest',
  'recall-at-k': 'recallAtK', 'answer-faithfulness': 'faithfulness', 'rag-cost-latency': 'monthlyCost',
  'capstone-grounded-cited-rag': 'runScenario',
}
const solutions = Object.fromEntries(Object.keys(lessons).map((key) => [key, added[key] ?? existing[key]]))
if (Object.values(solutions).some((solution) => !solution)) throw new Error('reference coverage drift')

function mask(code, name, key) {
  const lines = code.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`function ${name}(`))
  if (start < 0) throw new Error(`${key}: ${name} missing`)
  let end = -1
  for (let index = start + 1; index < lines.length; index++) if (lines[index].startsWith('}')) { end = index; break }
  if (end < 0) throw new Error(`${key}: closing brace missing`)
  lines.splice(start + 1, end - start - 1,
    '  // TODO: implement the retrieval decision against every supplied fixture.',
    '  throw new Error("complete the retrieval evidence decision");')
  return lines.join('\n')
}
function output(solution, key) {
  const result = spawnSync('node', ['-e', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10000 })
  if (result.status !== 0 || result.stderr) throw new Error(`${key}: ${result.stderr}`)
  return result.stdout.trimEnd()
}
function stripAudio(value) {
  if (Array.isArray(value)) return value.forEach(stripAudio)
  if (!value || typeof value !== 'object') return
  delete value.audio
  Object.values(value).forEach(stripAudio)
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
  const debug = required(blocks, 'debug', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  const tradeoff = required(blocks, 'tradeoff', key)
  const solution = solutions[key]
  solution.language = 'js'
  const starter = [
    `// ${lab.title}`,
    `// Mission: ${contract.outcome}`,
    '// Evidence checklist:',
    ...verification.items.map((item, index) => `// ${index + 1}. ${item}`),
    '// Novice workflow: predict the output, implement the TODO, run every fixture, add a boundary failure, and retain it as a regression.',
    '// Local execution is practice feedback only; it cannot create mastery evidence.',
    '', mask(solution.code, targets[key], key),
  ].join('\n')
  lab.language = 'js'
  lab.starter = starter
  lab.check = output(solution, key)
  lab.summary = `Implement the deterministic retrieval-system decision for this lesson and prove it against the supplied happy-path, missing-evidence, stale-data, boundary, and regression fixtures. ${contract.outcome} Retain the smallest failure as evidence and explain when the chosen retrieval strategy should be reversed.`
  debug.language = 'js'
  debug.brokenCode = starter
  debug.task = `Reproduce the lesson failure, repair ${targets[key]}, and retain the minimized case as a regression check.`
  remove(blocks, 'calibration')
  remove(blocks, 'unlock-gate')
  before(blocks, 'transfer', {
    type: 'calibration', artifact: contract.proof,
    weak: 'A retrieval demo returns a plausible answer but has no labeled failure fixture, citation trace, or retained regression.',
    passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`,
    excellent: `Passing evidence plus a boundary fixture, retained regression, rejected option, and transfer: ${transfer.text}`,
    note: 'Local-practice calibration only; controlled evaluation and expert review remain required.',
  })
  after(blocks, 'spaced-review', {
    type: 'unlock-gate',
    criteria: [
      `Build evidence — complete ${targets[key]} and match exact output.`,
      'Debug evidence — retain a minimized retrieval failure as a regression.',
      `Decision evidence — defend ${tradeoff.question ?? tradeoff.title}.`,
      `Verification evidence — ${verification.items.join(' · ')}`,
      `Transfer evidence — ${transfer.text}`,
    ],
    practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or certification.',
  })
  if (key === 'capstone-grounded-cited-rag') contract.intensity = 'capstone'
  contract.time = contract.intensity === 'capstone' ? 'Multi-day' : '60–90 min'
}

stripAudio(lessons)
const graph = read(graphPath)
const mapping = graph.competencies.find((competency) => competency.id === 'retrieval-systems')?.courseMappings.find((course) => course.courseSlug === slug)
if (!mapping) throw new Error('retrieval-systems mapping missing')
mapping.lessonSlugs = Object.keys(lessons)
write(lessonPath, lessons)
write(solutionPath, solutions)
write(graphPath, graph)
console.log('Upgraded 20 RAG Retrieval lessons with exact references and honest narration metadata.')
