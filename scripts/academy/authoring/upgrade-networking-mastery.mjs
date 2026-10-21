import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const courseSlug = 'career-networking_fundamentals_advanced_networking'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const specs = {
  'tcp-ip-model-without-trivia': {
    title: 'Build a first-divergence layer tracer',
    target: 'first_divergent_layer',
    signature: 'first_divergent_layer(working, failing)',
    summary: 'Compare a known-good request path with three failing paths, stop at the first divergent layer, and name the inspection hook that could disprove your diagnosis.',
    todos: ['Walk LAYERS in causal order and compare the two observations.', 'Return the first different layer and its hook; return NONE only when the path is clean.'],
  },
  'packet-path-reasoning': {
    title: 'Separate observed hops from inferred hops',
    target: 'trace_verdict',
    signature: 'trace_verdict(trace)',
    summary: 'Score three packet traces by observed versus inferred evidence and reject a root-cause claim when the alleged failing hop was never directly inspected.',
    todos: ['Count observed and inferred hops while preserving path order.', 'Name the first failure and mark the trace sound only when that cause was observed.'],
  },
  'latency-and-throughput': {
    title: 'Classify latency and throughput bottlenecks',
    target: 'classify',
    signature: 'classify(service_ms, workers, offered_rps, slo_ms)',
    summary: 'Calculate service capacity and utilization for three workloads, then choose a fix class that targets queuing pressure, per-request delay, or no network defect.',
    todos: ['Convert service time to seconds and calculate worker-limited capacity.', 'Use utilization and the latency SLO to return capacity, utilization, and the correct verdict.'],
  },
  'failure-domain-mapping': {
    title: 'Compute a failing client partition',
    target: 'map_failure_domain',
    signature: 'map_failure_domain(clients)',
    summary: 'Find the DNS, TLS, or subnet value that perfectly partitions failing clients from healthy clients, then report the blast radius and a falsifiable repair test.',
    todos: ['Test each candidate dimension against failing and healthy clients.', 'Return the isolating dimension, value, and affected count without guessing from one client.'],
  },
  'dns-resolution': {
    title: 'Simulate resolver cache staleness',
    target: 'resolve',
    signature: 'resolve(resolver, t)',
    summary: 'Model an authoritative DNS change, resolver-specific TTL caches, and the exact time each stale population heals so a partial outage becomes predictable.',
    todos: ['Return a cached answer only while its fetched-at time plus TTL is still valid.', 'Otherwise query authoritative(), refresh that resolver cache, and label the answer source.'],
  },
  'http-semantics': {
    title: 'Build a semantics-aware retry gate',
    target: 'may_retry',
    signature: 'may_retry(method, has_key)',
    summary: 'Decide whether a timed-out request may be retried from HTTP method semantics and idempotency-key evidence, preventing duplicate orders and payments.',
    todos: ['Look up whether the method is idempotent instead of treating every timeout alike.', 'Allow replay only for idempotent methods or requests carrying an idempotency key.'],
  },
  'tls-handshake-and-certificates': {
    title: 'Verify a presented certificate chain',
    target: 'verify_chain',
    signature: 'verify_chain(hostname, presented, trust_store)',
    summary: 'Evaluate hostname matching, expiry, intermediate linkage, and trust anchoring for four server configurations and localize the first TLS failure.',
    todos: ['Reject a hostname mismatch or expired certificate before claiming trust.', 'Walk issuer-to-subject links until the chain reaches a trusted root or a missing link.'],
  },
  'quic-tradeoffs': {
    title: 'Evaluate an HTTP/3 rollout by population',
    target: 'evaluate_rollout',
    signature: 'evaluate_rollout(rollout)',
    summary: 'Weight QUIC handshake gains against enterprise clients that block UDP/443 and compare h3-only reachability with a dual-stack fallback.',
    todos: ['Accumulate reachable population and weighted handshake time for UDP-capable segments.', 'For dual-stack, include blocked-UDP clients using the TCP plus TLS fallback before computing the mean.'],
  },
  'cidr-and-subnets': {
    title: 'Detect unsafe CIDR overlap',
    target: 'overlaps',
    signature: 'overlaps(a, b)',
    summary: 'Calculate subnet boundaries and prove whether a proposed VPC plan overlaps any peer or another planned subnet before routing is enabled.',
    todos: ['Use network and broadcast boundaries for both CIDRs rather than comparing strings.', 'Return true exactly when the closed address ranges intersect.'],
  },
  'nat-and-routes': {
    title: 'Implement longest-prefix route selection',
    target: 'lpm',
    signature: 'lpm(table, ip)',
    summary: 'Select forward and return next hops with longest-prefix matching, expose asymmetric flows, and propose the narrow route that restores symmetry.',
    todos: ['Test whether the destination falls inside each route CIDR.', 'Keep the matching route with the greatest prefix length and return its next hop.'],
  },
  'load-balancer-modes': {
    title: 'Contrast L4 and L7 health pools',
    target: 'build_pool',
    signature: 'build_pool(backends, mode)',
    summary: 'Construct L4 and L7 backend pools from transport and application health, then quantify why TCP-only checks can retain dead applications.',
    todos: ['For L4, admit only backends whose TCP listener is open.', 'For L7, require both an open listener and a successful HTTP health response.'],
  },
  'proxy-and-cdn-path': {
    title: 'Audit a multi-edge CDN population',
    target: 'audit_edges',
    signature: 'audit_edges()',
    summary: 'Inspect certificate identity, cache version, object age, and traffic share at three edges to compute the exact user populations seeing trust or freshness failures.',
    todos: ['Classify certificate and cache health independently for every edge.', 'Weight each failure and the fully healthy population by traffic share, then print the audit.'],
  },
  'vpc-vnet-design': {
    title: 'Evaluate route and security-group reachability',
    target: 'can_reach',
    signature: 'can_reach(src, dst, port)',
    summary: 'Trace three cloud flows through subnet route tables and destination security-group rules, returning the first boundary that allows or denies each request.',
    todos: ['Prove the source subnet has a route covering the destination IP.', 'For protected destinations, match the port and source security group or CIDR before allowing.'],
  },
  'service-discovery': {
    title: 'Trace Kubernetes DNS search expansion',
    target: 'resolve_name',
    signature: 'resolve_name(name, ns, ndots=5)',
    summary: 'Expand short service names through a namespace search list, record every NXDOMAIN, and show why a qualified cross-namespace name succeeds.',
    todos: ['Build candidates in the same order a pod resolver searches them.', 'Return the first zone hit plus the complete attempted-name trace; return no IP only after exhausting it.'],
  },
  'ingress-and-services': {
    title: 'Compute ready Service endpoints',
    target: 'compute_endpoints',
    signature: 'compute_endpoints(service, pods)',
    summary: 'Match Service selectors against ready pods and use the resulting endpoint set to distinguish an Ingress 404 from a Service 503.',
    todos: ['Ignore unready pods before applying the Service selector.', 'Require every selector label to match and return the names of all surviving endpoints.'],
  },
  'networkpolicy-boundaries': {
    title: 'Evaluate default-deny policy doors',
    target: 'evaluate_flow',
    signature: 'evaluate_flow(src, dst, port, policies)',
    summary: 'Model Kubernetes NetworkPolicy selection and explicit allow doors, then repair payments access without reopening the API to unrelated namespaces.',
    todos: ['Identify policies selecting the destination; no selector means the pod remains open by default.', 'When selected, allow only a source namespace, label set, and port matching one declared door.'],
  },
  'packet-capture-plan': {
    title: 'Diff captures across a suspect edge',
    target: 'diff_taps',
    signature: 'diff_taps(lb, pod)',
    summary: 'Compare load-balancer-side and pod-side flow observations to prove which sources crossed the edge and fingerprint the population silently dropped there.',
    todos: ['Normalize each tap to source-address sets so port translation does not hide the flow.', 'Return sorted sources present on both taps and sources visible only before the suspect edge.'],
  },
  'firewall-denial-repair': {
    title: 'Apply ordered firewall rules',
    target: 'match_flow',
    signature: 'match_flow(rules, src_ip, port)',
    summary: 'Evaluate first-match firewall behavior, expose a specific allow shadowed by a broad deny, and verify a reordered repair preserves every unrelated denial.',
    todos: ['Walk rules in order and test source CIDR plus optional port.', 'Return the first matching rule identifier and action; never let a later rule override it.'],
  },
  'zero-trust-access': {
    title: 'Localize identity and authorization denials',
    target: 'check_access',
    signature: 'check_access(caller)',
    summary: 'Evaluate issuer trust, certificate validity, and workload authorization as separate zero-trust gates so each denied caller receives a precise reason.',
    todos: ['Reject an untrusted CA or expired certificate at the identity gate.', 'Only after identity passes, compare the SPIFFE principal with the authorization policy.'],
  },
  'network-incident-runbook': {
    title: 'Run the complete network incident protocol',
    target: 'run_runbook',
    signature: 'run_runbook(layers, working, failing, populations)',
    summary: 'Apply the complete layer-first runbook to split DNS, expired certificate, and application-error incidents, stopping at the first observed divergence and calculating blast radius.',
    todos: ['Walk layers in order, print clean evidence until the first working-versus-failing divergence, and stop there.', 'Calculate only the population attached to that layer; when every network layer is clean, hand off to the application.'],
  },
}

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

const execute = (solution, key) => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-networking-authoring-'))
  try {
    const result = spawnSync('python3', ['-I', '-c', solution.code], {
      cwd: runtimeDir,
      input: solution.stdin ?? '',
      encoding: 'utf8',
      timeout: 10_000,
    })
    if (result.status !== 0) throw new Error(`${key}: reference execution failed: ${result.stderr}`)
    if (result.stderr) throw new Error(`${key}: reference emitted stderr: ${result.stderr}`)
    return result.stdout.replace(/\r\n/g, '\n').trimEnd()
  } finally {
    rmSync(runtimeDir, { recursive: true, force: true })
  }
}

const starterFor = (solution, spec) => {
  const marker = `def ${spec.target}(`
  const markerIndex = solution.code.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Reference solution is missing ${marker}`)
  const prelude = solution.code.slice(0, markerIndex).trimEnd()
  return `"""Practice lab: ${spec.title}.

The scenario data and safe helper functions are provided. Complete the one decision function,
then add a small reporting loop that exercises every supplied scenario. Work from evidence in
the data; do not hard-code the expected report.
"""

${prelude}

# TODO 1: ${spec.todos[0]}
# TODO 2: ${spec.todos[1]}
def ${spec.signature}:
    raise NotImplementedError("complete ${spec.target} from the two TODOs above")

# TODO 3: Call ${spec.target} for every supplied scenario and print an evidence report.
# Compare the complete stdout with the observable check only after your own reasoning is done.
`
}

const workedExample = (walkthrough, comparison) => ({
  type: 'worked-example',
  intro: `${walkthrough.title}. Follow one complete evidence path before attempting the simulation lab.`,
  code: walkthrough.code,
  language: walkthrough.language,
  steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
  commonMistake: comparison.left.verdict,
})

const debugBlock = (spec, comparison, starter) => ({
  type: 'debug',
  symptom: comparison.left.verdict,
  brokenCode: starter.replace('raise NotImplementedError', '# Broken shortcut: return the first convenient guess\n    raise NotImplementedError'),
  language: 'python',
  task: `Inject a case that defeats the weak ${comparison.left.label} approach, reproduce the wrong verdict, repair ${spec.target}, and keep that case as a regression check. Explain which observation changed the causal conclusion.`,
  fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
})

const tradeoffBlock = (comparison) => ({
  type: 'tradeoff',
  question: comparison.title,
  optionA: {
    label: comparison.left.label,
    text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}`,
  },
  optionB: {
    label: comparison.right.label,
    text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}`,
  },
  guidance: comparison.caption,
})

const calibrationBlock = (contract, verification, transfer) => ({
  type: 'calibration',
  artifact: contract.proof,
  weak: 'The report names a familiar network cause but cannot show which observation rules alternatives in or out.',
  passing: `The simulation output is exact and the practical packet satisfies every verification item: ${verification.items.join(' · ')}`,
  excellent: `Passing evidence plus one unfamiliar topology, an injected failure and regression check, and this transfer: ${transfer.text}`,
  note: 'Score only replayable evidence. Confidence, vocabulary, and a lucky fix cannot substitute for a causal trace and a falsifiable check.',
})

const unlockGate = (contract, spec, lab, debug, verification, transfer) => ({
  type: 'unlock-gate',
  criteria: [
    `Build evidence — complete ${spec.target} and match the exact output contract without copying the reference implementation.`,
    `Debug evidence — reproduce and repair the weak case, then keep the regression: ${debug.symptom}`,
    `Field evidence — produce the inspectable artifact promised by the sprint: ${contract.proof}`,
    `Verification evidence — satisfy every check: ${verification.items.join(' · ')}`,
    `Transfer evidence — apply the reasoning to a materially different topology: ${transfer.text}`,
  ],
  practiceOnlyNotice: `The local lab check (${lab.check.split('\n').at(-1)}) is practice feedback, not controlled mastery evidence.`,
})

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(specs))) {
  throw new Error('Networking lesson/spec coverage drift')
}
if (JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Networking lesson/solution coverage drift')
}

const insertedTypes = new Set(['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate'])
for (const [lessonSlug, original] of Object.entries(lessons)) {
  const key = `${courseSlug}/${lessonSlug}`
  const spec = specs[lessonSlug]
  const solution = solutions[lessonSlug]
  const blocks = original.filter((block) => !insertedTypes.has(block.type))
  const contract = requiredBlock(blocks, 'sprint-contract', key)
  const walkthrough = requiredBlock(blocks, 'code-walkthrough', key)
  const comparison = requiredBlock(blocks, 'compare', key)
  const verification = requiredBlock(blocks, 'verification', key)
  const transfer = requiredBlock(blocks, 'transfer', key)
  const starter = starterFor(solution, spec)
  const lab = {
    type: 'lab',
    title: spec.title,
    summary: `${spec.summary} The exercise uses deterministic simulation data so a novice can practice the causal model without cloud credentials, packet-capture privileges, or a live cluster.`,
    language: 'python',
    starter,
    check: execute(solution, key),
  }
  const debug = debugBlock(spec, comparison, starter)

  insertBefore(blocks, 'concept', workedExample(walkthrough, comparison))
  insertAfter(blocks, 'code-walkthrough', lab)
  insertAfter(blocks, 'lab', debug)
  insertAfter(blocks, 'debug', tradeoffBlock(comparison))
  insertBefore(blocks, 'transfer', calibrationBlock(contract, verification, transfer))
  insertAfter(blocks, 'spaced-review', unlockGate(contract, spec, lab, debug, verification, transfer))

  if (lessonSlug === 'network-incident-runbook') {
    contract.intensity = 'capstone'
    contract.time = 'Multi-day'
    contract.outcome = `Integrate the entire course into a production-style network incident defense: triage an unseen partial outage, build and debug the layer tracer, collect a replayable evidence packet, choose the least-risk repair, and defend the residual risk without mistaking practice output for controlled mastery evidence.`
    contract.unlock = 'Advance only when the runbook localizes all three supplied incidents, survives an injected fourth topology, and the written incident packet lets a reviewer reproduce the causal diagnosis independently.'
  }
  lessons[lessonSlug] = blocks
}

const graph = readJson(graphPath)
const networkCompetency = graph.competencies.find((candidate) => candidate.id === 'network-systems')
const courseMapping = networkCompetency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!courseMapping) throw new Error('Missing network-systems course mapping')
courseMapping.lessonSlugs = Object.keys(lessons)

writeJson(lessonPath, lessons)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Networking lessons with practical mastery loops.`)
