import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const courseSlug = 'career-security_identity'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const specs = {
  'security-mindset-risk': {
    title: 'Triage assets and prove a denied boundary crossing', target: 'triage', signature: 'triage(assets)',
    summary: 'Rank concrete assets by likelihood and impact, expose uncontrolled trust boundaries, and reject happy-path screenshots that cannot prove an unauthorized request was denied.',
    todos: ['Sort assets by descending risk while surfacing uncontrolled assets first at equal risk.', 'Return a stable ranked list that lets the reporting loop identify the highest uncontrolled boundary.'],
  },
  'identity-authentication': {
    title: 'Verify identity tokens fail closed', target: 'verify', signature: 'verify(token, now, revoked)',
    summary: 'Classify valid, tampered, expired, revoked, and malformed identity tokens with one deterministic verifier that never confuses authentication with authorization.',
    todos: ['Parse the token defensively and verify its signature before trusting any identity claim.', 'Reject expired and revoked tokens with precise reasons; return a user only for a fully valid token.'],
  },
  'session-token-security': {
    title: 'Enforce the complete session lifecycle', target: 'validate', signature: 'validate(token, now)',
    summary: 'Validate signed session state across normal use, tampering, logout revocation, and expiry while preserving observable denial reasons and secure cookie behavior.',
    todos: ['Verify structure and signature before evaluating session state.', 'Reject revoked or expired sessions and return the authenticated user only when every gate passes.'],
  },
  'authorization-rbac-abac': {
    title: 'Compose RBAC and tenant-scoped ABAC', target: 'authorize', signature: 'authorize(subject, action, invoice_id)',
    summary: 'Evaluate role grants and object attributes as separate authorization gates across a decision matrix, producing an auditable reason for every allow and deny.',
    todos: ['Check the subject role grants the requested action before looking at object attributes.', 'For granted actions, enforce same-tenant access and return a precise decision reason.'],
  },
  'object-level-authorization': {
    title: 'Stop cross-owner object access', target: 'get_invoice', signature: 'get_invoice(caller_id, invoice_id)',
    summary: 'Scope an invoice lookup to the authenticated owner, hide object existence on cross-owner requests, and append an allow-or-deny event for every attempt.',
    todos: ['Fetch only when both object id and owner id match instead of trusting the URL identifier.', 'Return a non-enumerating not-found denial and record the decision when no authorized row exists.'],
  },
  'input-validation-injection': {
    title: 'Build an allow-listed query boundary', target: 'safe_lookup', signature: 'safe_lookup(raw)',
    summary: 'Reject malformed identifiers before they reach a query sink and compare the resulting behavior with unsafe string-built lookup across adversarial inputs.',
    todos: ['Validate the raw identifier with the supplied strict allow-list and reject invalid values.', 'Send only the validated value through the parameterized lookup path.'],
  },
  'secrets-management': {
    title: 'Enforce least-privilege secret reads', target: 'can_read', signature: 'can_read(policy, identity, secret_arn)',
    summary: 'Evaluate identity and resource scope for secret retrieval, then use repository scan evidence to distinguish a managed secret from plaintext credential exposure.',
    todos: ['Match the caller identity against the policy principal without widening it.', 'Allow only the exact secret resource granted by policy and deny every other combination.'],
  },
  'secure-api-design': {
    title: 'Generate an API authorization matrix', target: 'authorize', signature: 'authorize(caller, action, order)',
    summary: 'Evaluate owner, stranger, and administrator access across read, write, and delete actions so every API cell has an explicit, non-enumerating policy decision.',
    todos: ['Determine the caller-to-object relationship before applying action rules.', 'Return the correct status and decision for every relationship-action pair without an implicit allow.'],
  },
  'threat-modeling': {
    title: 'Compute residual threat-model risk', target: 'model_report', signature: 'model_report(abuses, controls)',
    summary: 'Map named abuse cases to concrete preventative controls, report uncovered paths, and preserve residual risk instead of declaring a system secure from a checklist.',
    todos: ['Evaluate whether each abuse case has at least one control that actually denies its path.', 'Return a report that identifies the denier and counts every uncovered abuse case.'],
  },
  'attack-trees': {
    title: 'Find and sever the cheapest attack path', target: 'path_cost', signature: 'path_cost(node)',
    summary: 'Evaluate AND and OR branches in a credential-takeover attack tree, identify the lowest-cost attacker route, and place a control where it severs that route.',
    todos: ['For leaf and OR nodes, preserve the correct cost semantics instead of summing alternatives.', 'For AND nodes, include every required child so the computed root cost reflects the complete path.'],
  },
  'secure-coding-review': {
    title: 'Review handlers for authorization evidence', target: 'review_handler', signature: 'review_handler(name, src)',
    summary: 'Classify API handlers as approve, warn, or block by examining caller scoping and denial logging, then retain adversarial examples as review regressions.',
    todos: ['Detect object fetches that are unscoped or use client-controlled authorization attributes.', 'Distinguish blocking authorization defects from missing denial telemetry and safe non-object handlers.'],
  },
  'dependency-supply-chain': {
    title: 'Verify dependencies before installation', target: 'verify_package', signature: 'verify_package(name, content, lockfile)',
    summary: 'Compare package content with an integrity-pinned lockfile and deny the entire installation before any postinstall script can run when one package is altered.',
    todos: ['Require an exact lockfile entry and calculate the supplied package content integrity.', 'Return a precise missing-or-mismatch reason and allow only an exact integrity match.'],
  },
  'cloud-iam-least-privilege': {
    title: 'Measure an IAM policy blast radius', target: 'evaluate', signature: 'evaluate(policy, action, resource)',
    summary: 'Evaluate action and resource patterns against build-service attempts, then quantify which unrelated privileges a proposed cloud IAM policy would expose.',
    todos: ['Require both the requested action and resource to match an allow statement.', 'Default to deny when no complete statement match exists; never combine halves of different grants.'],
  },
  'network-edge-security': {
    title: 'Apply ordered edge security gates', target: 'edge_filter', signature: 'edge_filter(req)',
    summary: 'Filter requests through TLS, exposed-route, rate-limit, and authentication gates and prove that only a fully valid request reaches the protected origin.',
    todos: ['Evaluate every boundary gate in causal order and stop at the first denial.', 'Return a precise reason for denial or pass the request to origin only after all gates succeed.'],
  },
  'data-protection-privacy': {
    title: 'Minimize records by viewer role', target: 'project_record', signature: 'project_record(record, role)',
    summary: 'Project a customer record to the minimum fields required by an owner, support agent, or unauthorized viewer and verify that secret fields never leak.',
    todos: ['Choose the explicit allow-list for the viewer role instead of subtracting known secrets.', 'Return a new minimized record and default unknown roles to no disclosed fields.'],
  },
  'logging-detection-response': {
    title: 'Detect denial bursts without alert noise', target: 'detect', signature: 'detect(events, window, threshold)',
    summary: 'Group authorization denials by actor inside a time window, alert only above the threshold, and prove a normal baseline remains silent.',
    todos: ['Count only denial events inside the supplied observation window and group them by actor.', 'Emit alerts only when an actor exceeds the threshold and preserve deterministic ordering.'],
  },
  'incident-response': {
    title: 'Authorize incident actions under pressure', target: 'authorize_action', signature: 'authorize_action(actor_role, actor_name, action, account_id)',
    summary: 'Evaluate emergency account actions against an incident-role matrix and append complete allow-or-deny evidence without granting power from urgency alone.',
    todos: ['Resolve the responder role to an explicit action grant and deny unknown roles.', 'Record actor, action, object, and denial reason for every decision before returning it.'],
  },
  'compliance-evidence': {
    title: 'Validate an auditor-replayable evidence packet', target: 'is_complete', signature: 'is_complete(packet)',
    summary: 'Check security evidence packets for a replayable request, observed denial, appended audit event, and passing repair retest rather than accepting policy prose.',
    todos: ['Evaluate every required evidence field and collect all missing elements.', 'Return a complete decision only when the packet contains independently replayable proof.'],
  },
  'security-interview-practice': {
    title: 'Score evidence-backed security reasoning', target: 'score_answer', signature: 'score_answer(answer)',
    summary: 'Score interview answers for assets, boundaries, abuse cases, controls, denial proof, and residual risk so vocabulary cannot substitute for engineering judgment.',
    todos: ['Award evidence only for each explicit reasoning component present in the answer.', 'Return a stable score that differentiates a complete packet from buzzwords and partial reasoning.'],
  },
  'security-capstone': {
    title: 'Defend a multi-tenant export boundary', target: 'authorize', signature: 'authorize(session, action, target_tenant)',
    summary: 'Integrate authentication, RBAC, tenant ABAC, and append-only audit evidence for a multi-tenant export service, then survive cross-tenant and invalid-session attacks.',
    todos: ['Reject invalid sessions before evaluating grants, then require the role to permit the action.', 'Enforce target-tenant equality and append a precise audit event for every allow and denial.'],
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
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-security-authoring-'))
  try {
    const result = spawnSync('python3', ['-I', '-c', solution.code], {
      cwd: runtimeDir, input: solution.stdin ?? '', encoding: 'utf8', timeout: 10_000,
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
  return `\"\"\"Practice lab: ${spec.title}.

The scenario data and safe helper functions are provided. Complete the security decision
function, then write a reporting loop that exercises every supplied case. Treat all scenario
inputs as untrusted and default to deny; do not hard-code the expected report.
\"\"\"

${prelude}

# TODO 1: ${spec.todos[0]}
# TODO 2: ${spec.todos[1]}
def ${spec.signature}:
    raise NotImplementedError("complete ${spec.target} from the two TODOs above")

# TODO 3: Call ${spec.target} for every supplied case and print the complete evidence report.
# Compare exact stdout only after you have tested at least one new adversarial case of your own.
`
}

const workedExample = (walkthrough, comparison) => ({
  type: 'worked-example',
  intro: `${walkthrough.title}. Trace one complete allow-or-deny decision before writing the practice implementation.`,
  code: walkthrough.code,
  language: walkthrough.language,
  steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
  commonMistake: comparison.left.verdict,
})

const debugBlock = (spec, comparison, starter) => ({
  type: 'debug',
  symptom: comparison.left.verdict,
  brokenCode: starter.replace('raise NotImplementedError', '# Broken shortcut: trust the easiest success signal\n    raise NotImplementedError'),
  language: 'python',
  task: `Add an adversarial case that defeats the weak ${comparison.left.label} approach, reproduce the unsafe decision, repair ${spec.target}, and keep the case as a regression check. Explain which boundary or denial invariant the repair restores.`,
  fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
})

const tradeoffBlock = (comparison) => ({
  type: 'tradeoff', question: comparison.title,
  optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` },
  optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` },
  guidance: comparison.caption,
})

const calibrationBlock = (contract, verification, transfer) => ({
  type: 'calibration', artifact: contract.proof,
  weak: 'The submission describes a control or shows an allowed request but has no replayable denial evidence and no adversarial case.',
  passing: `The exact simulation passes and the evidence packet satisfies every verification item: ${verification.items.join(' · ')}`,
  excellent: `Passing evidence plus an unfamiliar abuse case, a retained regression, explicit residual risk, and this transfer: ${transfer.text}`,
  note: 'Score only inspectable, replayable evidence. A local deterministic check is practice feedback and cannot certify secure behavior in a controlled runtime.',
})

const unlockGate = (contract, spec, lab, debug, verification, transfer) => ({
  type: 'unlock-gate',
  criteria: [
    `Build evidence — complete ${spec.target} and match the exact observable contract without copying the reference.`,
    `Attack evidence — reproduce and repair the weak case, then retain it as a regression: ${debug.symptom}`,
    `Boundary evidence — produce the reviewable artifact promised by the sprint: ${contract.proof}`,
    `Verification evidence — satisfy every check: ${verification.items.join(' · ')}`,
    `Transfer evidence — apply the control to a materially different boundary: ${transfer.text}`,
  ],
  practiceOnlyNotice: `The local output check (${lab.check.split('\n').at(-1)}) provides practice feedback only; it is not controlled mastery or a production security certification.`,
})

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(specs))) {
  throw new Error('Security lesson/spec coverage drift')
}
if (JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) {
  throw new Error('Security lesson/solution coverage drift')
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
    type: 'lab', title: spec.title,
    summary: `${spec.summary} The exercise runs entirely on deterministic local data, so a novice can practice fail-closed reasoning without live credentials, targets, or production access.`,
    language: 'python', starter, check: execute(solution, key),
  }
  const debug = debugBlock(spec, comparison, starter)

  insertBefore(blocks, 'concept', workedExample(walkthrough, comparison))
  insertAfter(blocks, 'code-walkthrough', lab)
  insertAfter(blocks, 'lab', debug)
  insertAfter(blocks, 'debug', tradeoffBlock(comparison))
  insertBefore(blocks, 'transfer', calibrationBlock(contract, verification, transfer))
  insertAfter(blocks, 'spaced-review', unlockGate(contract, spec, lab, debug, verification, transfer))

  if (lessonSlug === 'security-capstone') {
    contract.time = 'Multi-day'
    contract.outcome = 'Integrate the entire course into a production-style multi-tenant export defense: implement authentication, RBAC, tenant ABAC, append-only audit evidence, adversarial regression cases, and a residual-risk review without mistaking local practice output for controlled mastery evidence.'
    contract.unlock = 'Advance only when the decision matrix denies all supplied attacks, survives an unseen tenant-boundary case, and an independent reviewer can replay every allow and denial from the evidence packet.'
  }
  lessons[lessonSlug] = blocks
}

const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'security-identity')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing security-identity course mapping')
mapping.lessonSlugs = Object.keys(lessons)

writeJson(lessonPath, lessons)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Security lessons with practical mastery loops.`)
