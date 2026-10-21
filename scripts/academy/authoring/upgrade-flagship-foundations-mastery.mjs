import { readFileSync, writeFileSync } from 'node:fs'

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

const derivedWorkedExample = (walkthrough, debug) => ({
  type: 'worked-example',
  intro: `${walkthrough.title}. ${walkthrough.subtitle ?? 'Trace the complete model before changing it.'}`,
  code: walkthrough.code,
  language: walkthrough.language,
  steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`),
  commonMistake: debug?.symptom ?? 'Copying the shape without checking whether its assumptions fit the current problem.',
})

const derivedDebug = (comparison) => ({
  type: 'debug',
  symptom: comparison.left.verdict,
  brokenCode: comparison.left.lines.join('\n'),
  language: 'python',
  task: `Find the violated invariant in the weaker ${comparison.left.label} approach and repair it before continuing.`,
  fix: `${comparison.right.lines.join('\n')}\n${comparison.right.verdict}`,
})

const derivedTradeoff = (comparison) => ({
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

const calibration = (contract, verification, transfer) => ({
  type: 'calibration',
  artifact: contract.proof,
  weak: 'The artifact follows the visible shape but cannot survive a failure case, independent check, or reviewer challenge.',
  passing: `The artifact satisfies every verification item: ${verification.items.join(' · ')}`,
  excellent: `Passing evidence plus a novel constraint, a documented repair, and this transfer: ${transfer.text}`,
  note: 'Score only inspectable evidence. Confidence, polish, and completion time cannot substitute for a passing artifact and defensible reasoning.',
})

const unlockGate = (contract, lab, debug, verification, transfer) => ({
  type: 'unlock-gate',
  criteria: [
    `Observable evidence — run the practical artifact and satisfy its check (${lab.check}): ${contract.proof}`,
    `Diagnose and repair the broken case: ${debug.symptom}`,
    `Confirm every verification item: ${verification.items.join(' · ')}`,
    `Complete the transfer without copying the worked example: ${transfer.text}`,
  ],
})

const engineeringLabSpecs = {
  '01-problem-frame': {
    title: 'Lint solution-first problem frames',
    check: 'frames_passing: 2/4',
    starter: `SOLUTION_NOUNS = ["cache", "redis", "kubernetes"]
FRAMES = [
    {"problem": "We need to add a cache", "constraint": "", "feared_failure": "things stay slow"},
    {"problem": "EU checkout p95 is 9s during peak", "constraint": "no new infrastructure", "feared_failure": "paid orders are abandoned"},
]

def lint_frame(frame):
    # TODO: return violations for a solution-first problem, missing constraint,
    # and a vague feared failure.
    return []

# TODO: print PASS/FAIL for every frame and the total frames_passing.`,
  },
  '02-diagnostic-route': {
    title: 'Rank diagnostic hypotheses by elimination per minute',
    check: 'stop_rule:',
    starter: `HYPOTHESES = [
    {"name": "last deploy", "prior": 0.40, "cost_min": 30},
    {"name": "provider degraded", "prior": 0.25, "cost_min": 2},
    {"name": "pool exhausted", "prior": 0.20, "cost_min": 5},
]

def route(hypotheses):
    # TODO: return cheapest big-eliminators first using prior / cost_min.
    return []

# TODO: print the route and a concrete stop_rule.`,
  },
  '03-system-map': {
    title: 'Compute a failure blast radius',
    check: 'blast_radius:',
    starter: `EDGES = [
    ("client", "api"), ("api", "orders"),
    ("orders", "payments_adapter"), ("payments_adapter", "provider"),
    ("orders", "inventory"),
]

def upstream(edges, node):
    # TODO: return every component whose path depends on node.
    return []

suspect = "payments_adapter"
# TODO: print suspect_edge, blast_radius, severity, and out_of_scope.`,
  },
  '04-retrieval-protocol': {
    title: 'Measure confidence against correctness',
    check: 'calibration_error:',
    starter: `STEPS = [
    ("frame", 5, True),
    ("route", 5, False),
    ("map", 3, True),
]

def calibrate(steps):
    # TODO: compute confidence/5 minus observed correctness per step,
    # flag confident-wrong answers, and return mean absolute error.
    return [], 0.0

# TODO: print each row, calibration_error, and repair_targets.`,
  },
  '13-transfer-challenge': {
    title: 'Detect hollow transfer across domains',
    check: 'verdict: real transfer',
    starter: `INVARIANT_FIELDS = ["decision", "assumptions", "failure", "proof", "reversal"]
DOMAIN_FIELDS = ["user", "scale", "risk", "privacy"]

def assess_transfer(source, target):
    # TODO: prove the invariant skeleton survived while the domain load changed.
    return {"skeleton": 0, "domain_rewritten": 0, "hollow": True}

# TODO: compare two genuinely different decision memos and print a verdict.`,
  },
  '14-package-evidence': {
    title: 'Reject evidence a reviewer cannot inspect',
    check: 'ledger_status:',
    starter: `LEDGER = [
    {"claim": "I proved a rollback under a peak-traffic constraint", "artifact": "decisions/rollback.md", "proof": "executable", "predicted": "2026-07-02", "outcome": "2026-07-04"},
    {"claim": "Caching knowledge", "artifact": "my head", "proof": "trust me", "predicted": "2026-07-09", "outcome": "2026-07-08"},
]

def validate(entry):
    # TODO: reject topic-only claims, non-path artifacts, weak proof, and
    # predictions recorded after the outcome.
    return []

# TODO: print each verdict and ledger_status.`,
  },
  '15-unlock-gate': {
    title: 'Implement an honest all-required gate',
    check: 'gate_run_2: OPEN',
    starter: `CRITERIA = {
    "retrieval": "calibration log",
    "artifact": "decision memo",
    "proof": None,
    "transfer": "cold-domain memo",
}

def run_gate(criteria):
    # TODO: return OPEN only when every required criterion has evidence.
    return "OPEN", []

# TODO: print the first closed run, repair proof, re-check, and print OPEN.`,
  },
  '16-capstone-rehearsal': {
    title: 'Gate the complete mastery packet',
    check: 'packet_defensible:',
    starter: `PACKET = [
    {"artifact": "diagnostic", "present": True, "gate": "pass", "stale": False},
    {"artifact": "decision memo", "present": True, "gate": "pass", "stale": False},
    {"artifact": "reviewer objection", "present": True, "gate": "repair", "stale": False},
    {"artifact": "transfer case", "present": True, "gate": "pass", "stale": True},
]

def evaluate_packet(packet):
    # TODO: count presence separately from proof, find stale pointers,
    # and name the weakest item.
    return {}

# TODO: print the evidence summary and honest packet_defensible verdict.`,
  },
}

const engineeringChecks = {
  '01-problem-frame': 'frames_passing: 2/4',
  '02-diagnostic-route': 'stop_rule:',
  '03-system-map': 'blast_radius:',
  '04-retrieval-protocol': 'calibration_error:',
  '05-tiny-artifact': 'verdict: INSPECTABLE',
  '06-failure-injection': 'autopsy_line:',
  '07-tradeoff-decision': 'reversal_condition:',
  '08-testa-proof': 'portfolio_claim:',
  '09-explain-back': 'repair_target: proof',
  '10-review-rubric': 'final_score: 60',
  '11-repair-loop': 'lift: +27',
  '12-spacing-queue': 'interleave_rule:',
  '13-transfer-challenge': 'verdict: real transfer',
  '14-package-evidence': 'ledger_status:',
  '15-unlock-gate': 'gate_run_2: OPEN',
  '16-capstone-rehearsal': 'packet_defensible:',
}

const engineeringEvaluatorStarter = (lessonSlug, check) => `# Build a deterministic evaluator for your ${lessonSlug} artifact.
# Represent each required criterion as data, reject missing or vague evidence,
# and print the acceptance marker only when the artifact earns it.

criteria = {
    "artifact_exists": False,
    "claim_is_specific": False,
    "proof_is_inspectable": False,
    "failure_is_named": False,
}

def evaluate(evidence):
    # TODO: return explicit failures and an honest pass/fail verdict.
    return []

# Required observable marker: ${check}
# TODO: run the evaluator against a weak and a passing fixture.`

function upgradeExistingCourse(courseSlug, { requireLabForEveryLesson = false } = {}) {
  const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
  const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
  const lessons = readJson(lessonPath)
  const solutions = readJson(solutionPath)

  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = requiredBlock(blocks, 'sprint-contract', key)
    const verification = requiredBlock(blocks, 'verification', key)
    const transfer = requiredBlock(blocks, 'transfer', key)
    const comparison = blocks.find((block) => block.type === 'compare')
    const walkthrough = blocks.find((block) => block.type === 'code-walkthrough')
    const originalLabIndex = blocks.findIndex((block) => block.type === 'lab')

    if (requireLabForEveryLesson && originalLabIndex < 0) {
      const spec = engineeringLabSpecs[lessonSlug]
      if (!spec || !solutions[lessonSlug]) throw new Error(`${key}: missing lab specification or solution`)
      insertAfter(blocks, 'concept', {
        type: 'lab',
        title: spec.title,
        summary: `Build the executable counterpart to this lesson's reasoning artifact. The practice evaluator must observe: ${spec.check}`,
        language: solutions[lessonSlug].language,
        starter: spec.starter,
        check: spec.check,
      })
    }

    if (requireLabForEveryLesson) {
      const lab = requiredBlock(blocks, 'lab', key)
      const solution = solutions[lessonSlug]
      const check = engineeringChecks[lessonSlug]
      if (!solution || !check) throw new Error(`${key}: missing executable evidence contract`)
      lab.language ??= solution.language
      lab.starter ??= engineeringEvaluatorStarter(lessonSlug, check)
      lab.check ??= check
      if (!lab.summary.includes('deterministic evaluator')) {
        lab.summary += ` Then encode the acceptance criteria in a deterministic evaluator and prove both a weak fixture and a passing fixture; the passing run must include: ${check}`
      }
    }

    if (!blocks.some((block) => block.type === 'debug')) {
      if (!comparison) throw new Error(`${key}: cannot derive debug case without compare`)
      insertAfter(blocks, 'lab', derivedDebug(comparison))
    }
    const debug = requiredBlock(blocks, 'debug', key)

    if (!blocks.some((block) => block.type === 'worked-example') && contract.intensity !== 'micro') {
      if (!walkthrough) throw new Error(`${key}: cannot derive worked example without code walkthrough`)
      insertBefore(blocks, 'concept', derivedWorkedExample(walkthrough, debug))
    }

    const existingTradeoffIndex = blocks.findIndex((block) => block.type === 'tradeoff')
    const debugIndex = blocks.findIndex((block) => block.type === 'debug')
    if (existingTradeoffIndex >= 0 && existingTradeoffIndex < debugIndex) {
      const [tradeoff] = blocks.splice(existingTradeoffIndex, 1)
      insertAfter(blocks, 'debug', tradeoff)
    } else if (existingTradeoffIndex < 0 && contract.intensity !== 'micro') {
      if (!comparison) throw new Error(`${key}: cannot derive tradeoff without compare`)
      insertAfter(blocks, 'debug', derivedTradeoff(comparison))
    }

    if (['deep', 'capstone'].includes(contract.intensity)) {
      let calibrationIndex = blocks.findIndex((block) => block.type === 'calibration')
      if (calibrationIndex < 0) {
        insertBefore(blocks, 'transfer', calibration(contract, verification, transfer))
      } else if (calibrationIndex > blocks.findIndex((block) => block.type === 'transfer')) {
        const [existingCalibration] = blocks.splice(calibrationIndex, 1)
        insertBefore(blocks, 'transfer', existingCalibration)
      }
    }

    const lab = requiredBlock(blocks, 'lab', key)
    if (!blocks.some((block) => block.type === 'unlock-gate')) {
      blocks.push(unlockGate(contract, lab, debug, verification, transfer))
    }

    if (originalLabIndex >= 0) {
      let currentLabIndex = blocks.findIndex((block) => block.type === 'lab')
      if (currentLabIndex > originalLabIndex) {
        const currentWalkthroughIndex = blocks.findIndex((block) => block.type === 'code-walkthrough')
        if (currentWalkthroughIndex < 0 || currentWalkthroughIndex > currentLabIndex) {
          throw new Error(`${key}: cannot preserve lab index ${originalLabIndex}`)
        }
        const [preservedWalkthrough] = blocks.splice(currentWalkthroughIndex, 1)
        currentLabIndex = blocks.findIndex((block) => block.type === 'lab')
        blocks.splice(currentLabIndex + 1, 0, preservedWalkthrough)
      }
      if (blocks.findIndex((block) => block.type === 'lab') !== originalLabIndex) {
        throw new Error(`${key}: lab identity moved from block ${originalLabIndex}`)
      }
    }
  }

  writeJson(lessonPath, lessons)
}

const pythonSpecs = [
  {
    slug: 'functions-and-scope', title: 'Functions, Parameters, Return Values, and Scope',
    outcome: 'Design a small pure function with explicit inputs and a reusable return value.',
    mission: 'A pricing rule is copied into three files and already disagrees. Replace the copies with one named contract that every caller can test.',
    context: 'Functions are the unit of decomposition in Python: a name, explicit inputs, one responsibility, and a value returned to the caller.',
    pretest: 'What is the difference between print(total) and return total inside a function?',
    reveal: 'print shows a value to a human; return hands it to the caller so code can store, test, and compose it.',
    conceptTitle: 'Inputs in, value out, hidden state out',
    concept: 'Prefer functions whose result depends only on their parameters. Keep printing, files, and network calls in thin boundary code.',
    exampleCode: 'def line_total(unit_price, quantity):\n    return unit_price * quantity\n\ntotal = line_total(7, 6)\nprint(f"Total: {total}")',
    exampleSteps: ['Define the contract with two parameters.', 'Compute from parameters rather than globals.', 'Return the value.', 'The caller decides how to display it.'],
    commonMistake: 'Printing inside the function and accidentally returning None.',
    labTitle: 'Build a reusable line-total function', labSummary: 'Implement line_total(price, quantity) and call it for 7 × 6.',
    starter: 'def line_total(price, quantity):\n    # TODO: return the computed total\n    pass\n\nprint(f"Total: {line_total(7, 6)}")', check: 'Total: 42',
    brokenCode: 'def line_total(price, quantity):\n    print(price * quantity)\n\ntotal = line_total(7, 6)\nprint(total)',
    debugSymptom: 'The calculation appears on screen, then the caller prints None.',
    debugFix: 'Return price * quantity; let the caller print the returned value.',
    tradeoff: ['One pure calculation function', 'A function that calculates, prints, reads input, and changes a global', 'Use the pure function when callers need reuse and tests. Keep I/O at the boundary.'],
    verification: ['line_total(7, 6) returns 42.', 'The function reads no globals.', 'The function returns rather than prints.', 'A second input works without editing the function.'],
    transfer: 'Extract one duplicated calculation from a real script into a pure function and test two inputs.',
    solution: 'def line_total(price, quantity):\n    return price * quantity\n\nprint(f"Total: {line_total(7, 6)}")',
  },
  {
    slug: 'collections', title: 'Lists, Dictionaries, Sets, and Comprehensions',
    outcome: 'Choose a collection by access pattern and transform structured records without losing meaning.',
    mission: 'An automation receives order records. You need ordered rows, lookup by field, unique customer IDs, and a filtered report—without parallel mystery lists.',
    context: 'Python collections encode intent: list for ordered sequences, dict for named fields and keyed lookup, set for uniqueness.',
    pretest: 'Which structure answers “have I seen this ID?” most directly: list, dict, or set?',
    reveal: 'A set represents membership and uniqueness directly; a dict is right when each key also maps to data.',
    conceptTitle: 'Choose the structure that makes the operation obvious',
    concept: 'Model each record as a dict, records as a list, and uniqueness as a set. Use comprehensions when the transform remains readable.',
    exampleCode: 'orders = [{"id": 1, "paid": True, "total": 20}, {"id": 2, "paid": False, "total": 10}]\npaid = [order for order in orders if order["paid"]]\nrevenue = sum(order["total"] for order in paid)',
    exampleSteps: ['Each dict names the fields.', 'The list preserves record order.', 'The comprehension filters paid orders.', 'sum reduces the filtered values.'],
    commonMistake: 'Keeping related fields in parallel lists that drift out of alignment.',
    labTitle: 'Summarize paid orders', labSummary: 'Count paid records and total their revenue from a list of dictionaries.',
    starter: 'orders = [{"id": 1, "paid": True, "total": 20}, {"id": 2, "paid": False, "total": 10}, {"id": 3, "paid": True, "total": 25}]\n# TODO: derive paid_count and revenue\npaid_count = 0\nrevenue = 0\nprint(f"Paid orders: {paid_count} | Revenue: ${revenue}")', check: 'Paid orders: 2 | Revenue: $45',
    brokenCode: 'ids = [1, 2, 3]\npaid = [True, False]\nfor index, order_id in enumerate(ids):\n    print(order_id, paid[index])',
    debugSymptom: 'Parallel lists have different lengths and the report crashes or pairs the wrong values.',
    debugFix: 'Use one list of dictionaries so every record carries its own named fields.',
    tradeoff: ['List of dictionaries', 'Parallel lists for every field', 'Use records when fields belong together; use a set only for uniqueness or membership.'],
    verification: ['Paid order count is 2.', 'Revenue is 45.', 'The source list is not mutated.', 'Adding another unpaid order does not change revenue.'],
    transfer: 'Turn a CSV-shaped set of parallel columns into records, then produce one filtered summary.',
    solution: 'orders = [{"id": 1, "paid": True, "total": 20}, {"id": 2, "paid": False, "total": 10}, {"id": 3, "paid": True, "total": 25}]\npaid_orders = [order for order in orders if order["paid"]]\npaid_count = len(paid_orders)\nrevenue = sum(order["total"] for order in paid_orders)\nprint(f"Paid orders: {paid_count} | Revenue: ${revenue}")',
  },
  {
    slug: 'exceptions-validation', title: 'Exceptions and Boundary Validation',
    outcome: 'Convert and validate untrusted input at the boundary while preserving useful failure context.',
    mission: 'A deployment port arrives as text. “eighty” and 70000 must fail before they reach infrastructure code, with an error a caller can act on.',
    context: 'Exceptions are control flow for exceptional states, not a broom that hides every failure. Catch only what you can handle.',
    pretest: 'Should a parser return 0 when it receives “eighty,” or raise a specific error?',
    reveal: 'Raise a specific error. Returning 0 invents data and moves the failure farther from its cause.',
    conceptTitle: 'Parse, validate, then return—or fail loudly',
    concept: 'Convert at the boundary, validate the domain constraint, and chain a safe error from the original cause when useful.',
    exampleCode: 'def parse_port(raw):\n    try:\n        port = int(raw)\n    except ValueError as error:\n        raise ValueError("port must be an integer") from error\n    if not 1 <= port <= 65535:\n        raise ValueError("port must be 1-65535")\n    return port',
    exampleSteps: ['Convert once at the boundary.', 'Catch only conversion failure.', 'Validate the real integer.', 'Return a trusted value.'],
    commonMistake: 'Using bare except and silently substituting a default.',
    labTitle: 'Parse a safe network port', labSummary: 'Implement parse_port and prove valid, nonnumeric, and out-of-range behavior.',
    starter: 'def parse_port(raw):\n    # TODO: convert, validate 1..65535, and raise clear ValueError messages\n    pass\n\nprint(f"Port: {parse_port(\"8080\")}")', check: 'Port: 8080',
    brokenCode: 'def parse_port(raw):\n    try:\n        return int(raw)\n    except:\n        return 0',
    debugSymptom: 'Invalid input silently becomes port 0 and the real error disappears.',
    debugFix: 'Catch ValueError specifically, raise a clear error, and validate the allowed range.',
    tradeoff: ['Reject invalid input', 'Silently coerce to a default', 'Reject at trust boundaries unless a normalization is explicit, safe, and reversible.'],
    verification: ['"8080" returns integer 8080.', '"eighty" raises ValueError.', '70000 raises ValueError.', 'No bare except or silent default exists.'],
    transfer: 'Apply the same parse-and-validate boundary to a timeout, date, or environment variable.',
    solution: 'def parse_port(raw):\n    try:\n        port = int(raw)\n    except ValueError as error:\n        raise ValueError("port must be an integer") from error\n    if not 1 <= port <= 65535:\n        raise ValueError("port must be 1-65535")\n    return port\n\nprint(f"Port: {parse_port(\"8080\")}")',
  },
  {
    slug: 'files-json', title: 'Files, Context Managers, and JSON',
    outcome: 'Read structured data safely, validate its shape, and produce a deterministic result.',
    mission: 'An automation reads a JSON export every morning. One malformed file must fail clearly; one open handle must never leak.',
    context: 'with owns resource cleanup. json turns text into Python values, but parsing success does not prove the expected schema exists.',
    pretest: 'If json.loads succeeds, is data["users"] guaranteed to be a list?',
    reveal: 'No. Valid JSON can still have the wrong shape. Syntax validation and schema validation are separate checks.',
    conceptTitle: 'Own the resource, parse the syntax, validate the shape',
    concept: 'Use with for files, json.load/loads for parsing, then explicitly validate keys and types before processing.',
    exampleCode: 'import json\n\ndef active_names(raw):\n    data = json.loads(raw)\n    users = data.get("users")\n    if not isinstance(users, list):\n        raise ValueError("users must be a list")\n    return [user["name"] for user in users if user.get("active") is True]',
    exampleSteps: ['Parse JSON text.', 'Read the expected key safely.', 'Validate the collection shape.', 'Filter and return names.'],
    commonMistake: 'Assuming valid JSON automatically means valid application data.',
    labTitle: 'Extract active users from JSON', labSummary: 'Parse a supplied payload, validate users is a list, and print active names.',
    starter: 'import json\n\nRAW = \'{"users":[{"name":"Ada","active":true},{"name":"Grace","active":false},{"name":"Lin","active":true}]}\'\n\ndef active_names(raw):\n    # TODO: parse, validate, filter, and return names\n    return []\n\nprint("Active: " + ", ".join(active_names(RAW)))', check: 'Active: Ada, Lin',
    brokenCode: 'import json\n\ndef names(raw):\n    data = json.loads(raw)\n    return [user["name"] for user in data["users"]]',
    debugSymptom: 'A syntactically valid payload with users={} crashes deep inside the comprehension.',
    debugFix: 'Validate that users exists and is a list before iterating; raise a boundary error.',
    tradeoff: ['Stream a large file', 'Read the whole file', 'Stream when size is unbounded; load whole small documents when atomic parsing is required.'],
    verification: ['The valid payload returns Ada and Lin.', 'Grace is filtered out.', 'A missing or non-list users value raises.', 'The function returns data rather than only printing.'],
    transfer: 'Read a small real JSON file with with open(...) and run the same shape validation.',
    solution: 'import json\n\nRAW = \'{"users":[{"name":"Ada","active":true},{"name":"Grace","active":false},{"name":"Lin","active":true}]}\'\n\ndef active_names(raw):\n    data = json.loads(raw)\n    users = data.get("users")\n    if not isinstance(users, list):\n        raise ValueError("users must be a list")\n    return [user["name"] for user in users if user.get("active") is True]\n\nprint("Active: " + ", ".join(active_names(RAW)))',
  },
  {
    slug: 'modules-venvs', title: 'Modules, Imports, Virtual Environments, and Dependencies',
    outcome: 'Separate reusable code from execution and describe a reproducible dependency boundary.',
    mission: 'A script works on one laptop and fails everywhere else. Turn “works on my machine” into an importable module plus an explicit environment contract.',
    context: 'Modules organize code; virtual environments isolate installed packages; dependency locks make a working environment reproducible.',
    pretest: 'Why place executable code under if __name__ == "__main__"?',
    reveal: 'So importing the module exposes functions without accidentally running the script’s side effects.',
    conceptTitle: 'Importable core, explicit entry point, isolated environment',
    concept: 'Put reusable functions in modules, execution behind a main guard, and third-party packages in a project-local environment with pinned versions.',
    exampleCode: 'import math\n\ndef circle_area(radius):\n    if radius < 0:\n        raise ValueError("radius must be nonnegative")\n    return math.pi * radius ** 2\n\nif __name__ == "__main__":\n    print(f"Area: {circle_area(2):.2f}")',
    exampleSteps: ['Import a standard-library module.', 'Expose a reusable function.', 'Validate its contract.', 'Run output only at the entry point.'],
    commonMistake: 'Installing packages globally and running side effects during import.',
    labTitle: 'Build an import-safe geometry module', labSummary: 'Implement circle_area and keep display code behind the main guard.',
    starter: 'import math\n\ndef circle_area(radius):\n    # TODO: reject negative radius and return the area\n    pass\n\nif __name__ == "__main__":\n    print(f"Area: {circle_area(2):.2f}")', check: 'Area: 12.57',
    brokenCode: 'print("connecting to production")\n\ndef circle_area(radius):\n    return 3.14 * radius * radius',
    debugSymptom: 'Importing the module immediately performs a side effect.',
    debugFix: 'Keep reusable definitions at module scope and execution inside a main function guarded by __name__.',
    tradeoff: ['Pin direct and transitive dependencies', 'Use whatever versions happen to be installed', 'Pin for reproducible releases; schedule explicit upgrades rather than accepting invisible drift.'],
    verification: ['circle_area(2) rounds to 12.57.', 'Negative radius raises.', 'Importing defines functions without printing.', 'You can explain what the virtual environment isolates.'],
    transfer: 'Create a fresh virtual environment for a tiny project and document the exact recreate-and-run commands.',
    solution: 'import math\n\ndef circle_area(radius):\n    if radius < 0:\n        raise ValueError("radius must be nonnegative")\n    return math.pi * radius ** 2\n\nif __name__ == "__main__":\n    print(f"Area: {circle_area(2):.2f}")',
  },
  {
    slug: 'testing-debugging', title: 'Testing, Debugging, and Regression Proof',
    outcome: 'Reproduce a bug with a failing test, repair it, and keep the regression permanently executable.',
    mission: 'average([]) crashed in production. A patch without a test is only a promise that the same failure will return later.',
    context: 'A regression test proves the bug existed, proves the fix, and protects future refactors. Debugging starts by reducing a symptom to one repeatable case.',
    pretest: 'Should you fix the function first or write the smallest failing test first?',
    reveal: 'Write the reproducer first. A test that never failed might not exercise the bug you think it does.',
    conceptTitle: 'Red reproduces, green repairs, refactor preserves',
    concept: 'Arrange the input, act once, and assert observable behavior. Keep tests deterministic, isolated, and named after the risk.',
    exampleCode: 'def safe_average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n\nassert safe_average([2, 4, 6]) == 4\nassert safe_average([]) == 0',
    exampleSteps: ['Name the behavior.', 'Guard the empty edge.', 'Test the normal case.', 'Keep the regression case forever.'],
    commonMistake: 'Patching the crash without first proving a test catches it.',
    labTitle: 'Lock an empty-input regression', labSummary: 'Implement safe_average and make three behavior assertions pass.',
    starter: 'def safe_average(values):\n    # TODO: return 0 for empty input and the arithmetic mean otherwise\n    pass\n\nassert safe_average([2, 4, 6]) == 4\nassert safe_average([]) == 0\nassert safe_average([10]) == 10\nprint("3 tests passed")', check: '3 tests passed',
    brokenCode: 'def average(values):\n    return sum(values) / len(values)\n\nprint(average([]))',
    debugSymptom: 'The happy path works, but an empty list raises ZeroDivisionError.',
    debugFix: 'Add the failing empty-list assertion, then define and test the intended empty behavior.',
    tradeoff: ['Assert public behavior', 'Assert internal implementation details', 'Behavior tests survive refactors; inspect internals only when the internal contract is itself the product.'],
    verification: ['All three assertions pass.', 'The empty case failed before the fix.', 'No test depends on execution order.', 'The function has no hidden state or I/O.'],
    transfer: 'Turn the next bug you encounter into a fail-before/pass-after regression test.',
    solution: 'def safe_average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n\nassert safe_average([2, 4, 6]) == 4\nassert safe_average([]) == 0\nassert safe_average([10]) == 10\nprint("3 tests passed")',
  },
  {
    slug: 'http-apis', title: 'HTTP APIs, Timeouts, Schemas, and Safe Automation',
    outcome: 'Treat an API response as untrusted input and normalize it behind a small tested boundary.',
    mission: 'A 200 response changes shape and silently corrupts an automation. Make status, timeout, schema, and retry policy explicit before data reaches the workflow.',
    context: 'Network success is layered: transport completed, status is acceptable, body parses, schema matches, and the operation is safe to retry.',
    pretest: 'Does HTTP 200 prove the JSON body has every field your code expects?',
    reveal: 'No. Status and schema are separate contracts; both require checks.',
    conceptTitle: 'Timeout, status, parse, validate, then act',
    concept: 'Wrap external calls in a boundary that sets a timeout, classifies status, validates response shape, and retries only safe operations.',
    exampleCode: 'def normalize_user(response):\n    if response.get("status") != 200:\n        raise RuntimeError("request failed")\n    body = response.get("json")\n    if not isinstance(body, dict) or not isinstance(body.get("name"), str):\n        raise ValueError("invalid user schema")\n    return {"name": body["name"].strip().lower(), "active": body.get("active") is True}',
    exampleSteps: ['Classify status.', 'Validate body type.', 'Validate required fields.', 'Return a small internal model.'],
    commonMistake: 'Calling response.json() and trusting every key because status was 200.',
    labTitle: 'Normalize an API fixture safely', labSummary: 'Validate a server-owned response fixture without making network access part of the lab.',
    starter: 'RESPONSE = {"status": 200, "json": {"name": " Ada ", "active": True}}\n\ndef normalize_user(response):\n    # TODO: validate status and schema, normalize name, return name + active\n    return {}\n\nuser = normalize_user(RESPONSE)\nprint(f"User: {user[\"name\"]} | Active: {user[\"active\"]}")', check: 'User: ada | Active: True',
    brokenCode: 'def user_name(response):\n    return response["json"]["name"].lower()',
    debugSymptom: 'A timeout, non-200 status, missing body, or numeric name crashes far from the request boundary.',
    debugFix: 'Classify each layer at the boundary and raise a specific error before returning normalized data.',
    tradeoff: ['Retry a bounded idempotent read', 'Retry every failed operation automatically', 'Retry only classified transient failures when repeating the operation cannot duplicate harmful effects.'],
    verification: ['The valid fixture normalizes Ada.', 'Non-200 status raises.', 'Missing or non-string name raises.', 'The lab makes no network request and assumes no network access.'],
    transfer: 'Wrap one real read-only API call with a timeout and the same status/schema boundary outside the sandbox.',
    solution: 'RESPONSE = {"status": 200, "json": {"name": " Ada ", "active": True}}\n\ndef normalize_user(response):\n    if response.get("status") != 200:\n        raise RuntimeError("request failed")\n    body = response.get("json")\n    if not isinstance(body, dict) or not isinstance(body.get("name"), str):\n        raise ValueError("invalid user schema")\n    return {"name": body["name"].strip().lower(), "active": body.get("active") is True}\n\nuser = normalize_user(RESPONSE)\nprint(f"User: {user[\"name\"]} | Active: {user[\"active\"]}")',
  },
  {
    slug: 'automation-capstone', title: 'Capstone: Build a Defensive Python Automation', intensity: 'capstone',
    outcome: 'Integrate parsing, validation, functions, collections, tests, and deterministic reporting into one defensible automation.',
    mission: 'Operations needs a daily order report. The input includes malformed and duplicate records; the output must be reproducible, tested, and safe to rerun.',
    context: 'Production automation is not “a script that ran once.” It has an input contract, deterministic core, explicit failures, regression tests, and an operator-readable result.',
    pretest: 'What should happen when one record has a missing ID: silently skip, crash with no context, or record a rejection?',
    reveal: 'Record a specific rejection while preserving deterministic processing of valid records, unless policy requires the whole batch to fail atomically.',
    conceptTitle: 'Validate → normalize → deduplicate → compute → prove',
    concept: 'Separate the pure transformation from I/O. Return both accepted results and explicit rejections so an operator can reconcile the batch.',
    exampleCode: 'def build_report(records):\n    seen = set()\n    accepted, rejected = [], []\n    for record in records:\n        order_id = record.get("id")\n        if not isinstance(order_id, str) or not order_id:\n            rejected.append("missing-id")\n            continue\n        if order_id in seen:\n            rejected.append(f"duplicate:{order_id}")\n            continue\n        seen.add(order_id)\n        accepted.append(record)\n    return accepted, rejected',
    exampleSteps: ['Own deduplication state.', 'Validate identity first.', 'Name every rejection.', 'Return evidence for reconciliation.'],
    commonMistake: 'Silently dropping bad records and reporting a total nobody can reconcile.',
    labTitle: 'Ship a reconciled order report', labSummary: 'Process valid, duplicate, and malformed records into exact accepted/rejected/revenue evidence.',
    starter: 'RECORDS = [{"id":"A1","total":20},{"id":"A1","total":20},{"id":"B2","total":25},{"total":99}]\n\ndef build_report(records):\n    # TODO: validate IDs and numeric totals, reject duplicates, compute revenue\n    return {"accepted": 0, "rejected": [], "revenue": 0}\n\nreport = build_report(RECORDS)\nprint(f"Accepted: {report[\"accepted\"]}")\nprint("Rejected: " + ", ".join(report["rejected"]))\nprint(f"Revenue: ${report[\"revenue\"]}")', check: 'Revenue: $45',
    brokenCode: 'def revenue(records):\n    return sum(record["total"] for record in records)',
    debugSymptom: 'The report double-counts duplicates and crashes on malformed data without identifying the record.',
    debugFix: 'Validate and deduplicate before aggregation; return named rejections beside the computed result.',
    tradeoff: ['Continue with explicit per-record rejections', 'Fail the entire batch atomically', 'Choose from business risk: reconciliation pipelines may continue; money movement may require atomic failure. Never silently skip.'],
    verification: ['Exactly two records are accepted.', 'A1 is rejected as duplicate.', 'The missing-ID record is rejected explicitly.', 'Revenue is 45.', 'Running twice produces identical output.'],
    transfer: 'Adapt the automation to a new record schema and add one unseen rejection rule without weakening old tests.',
    solution: 'RECORDS = [{"id":"A1","total":20},{"id":"A1","total":20},{"id":"B2","total":25},{"total":99}]\n\ndef build_report(records):\n    seen = set()\n    rejected = []\n    revenue = 0\n    accepted = 0\n    for record in records:\n        order_id = record.get("id")\n        total = record.get("total")\n        if not isinstance(order_id, str) or not order_id:\n            rejected.append("missing-id")\n            continue\n        if order_id in seen:\n            rejected.append(f"duplicate:{order_id}")\n            continue\n        if not isinstance(total, (int, float)) or total < 0:\n            rejected.append(f"invalid-total:{order_id}")\n            continue\n        seen.add(order_id)\n        accepted += 1\n        revenue += total\n    return {"accepted": accepted, "rejected": rejected, "revenue": revenue}\n\nreport = build_report(RECORDS)\nprint(f"Accepted: {report[\"accepted\"]}")\nprint("Rejected: " + ", ".join(report["rejected"]))\nprint(f"Revenue: ${report[\"revenue\"]}")',
  },
]

const pythonLesson = (spec) => {
  const intensity = spec.intensity ?? 'standard'
  const proof = `A runnable Python artifact that satisfies the observable check: ${spec.check}`
  const blocks = [
    { type: 'sprint-contract', outcome: spec.outcome, intensity, time: intensity === 'capstone' ? '2-4 hrs' : '45-75 min', proof, unlock: `The lab passes, the failure is repaired, and you can defend the transfer.`, doNotClaim: 'Do not claim mastery from the happy path. The debug case, transfer, and delayed retrieval remain required evidence.' },
    { type: 'mission', text: spec.mission },
    { type: 'context', text: spec.context },
    { type: 'pretest', prompt: spec.pretest, reveal: spec.reveal },
    { type: 'worked-example', intro: `Trace the complete ${spec.title} model before editing it.`, code: spec.exampleCode, language: 'python', steps: spec.exampleSteps, commonMistake: spec.commonMistake },
    { type: 'concept', title: spec.conceptTitle, text: spec.concept },
    { type: 'diagram', title: `${spec.title}: evidence flow`, subtitle: 'Every arrow must be observable or testable.', rankdir: 'LR', nodes: [
      { id: 'input', label: 'Untrusted input', kind: 'external', tone: 'warning' },
      { id: 'boundary', label: spec.conceptTitle, kind: 'process', tone: 'accent' },
      { id: 'proof', label: spec.check, kind: 'process', tone: 'success' },
    ], edges: [{ from: 'input', to: 'boundary', label: 'validate' }, { from: 'boundary', to: 'proof', label: 'verify' }], caption: 'A production-practical lesson ends in evidence, not merely code that looks plausible.' },
    { type: 'lab', title: spec.labTitle, summary: spec.labSummary, language: 'python', starter: spec.starter, check: spec.check },
    { type: 'debug', symptom: spec.debugSymptom, brokenCode: spec.brokenCode, language: 'python', task: 'Reproduce the failure, explain its cause, then repair it without weakening the contract.', fix: spec.debugFix },
    { type: 'tradeoff', question: `Which design is safer for ${spec.title}?`, optionA: { label: spec.tradeoff[0], text: spec.tradeoff[0] }, optionB: { label: spec.tradeoff[1], text: spec.tradeoff[1] }, guidance: spec.tradeoff[2] },
    { type: 'quiz', question: spec.pretest, options: [spec.reveal, 'The opposite is always true.', 'It depends only on variable names.'], answer: 0, explanation: spec.reveal },
    { type: 'verification', intro: 'Prove the behavior—no vibes:', items: spec.verification },
    { type: 'teachback', prompts: [`Explain ${spec.conceptTitle.toLowerCase()} without reading the lesson.`, `Explain why the broken case fails and how the repair preserves the contract.`, 'Name the evidence that would convince a skeptical reviewer.'] },
  ]
  if (intensity === 'capstone') blocks.push(calibration(blocks[0], blocks.find((block) => block.type === 'verification'), { text: spec.transfer }))
  blocks.push(
    { type: 'transfer', text: spec.transfer },
    { type: 'spaced-review', schedule: ['Day 2: reproduce the core function from memory.', 'Day 7: repair the broken case without notes.', 'Day 21: apply the pattern to a new data shape.', 'Day 45: defend the tradeoff and rerun the evidence.'] },
    { type: 'unlock-gate', criteria: [`Observable evidence — the lab output includes: ${spec.check}`, `A regression check demonstrates the broken case is repaired: ${spec.debugSymptom}`, `Every verification item is satisfied: ${spec.verification.join(' · ')}`, `The transfer is completed without copying the example: ${spec.transfer}`] },
  )
  return blocks
}

function expandAndUpgradePython() {
  const lessonPath = 'data/academy/authoring/python-basics.lessons.json'
  const solutionPath = 'data/academy/authoring/python-basics.lab_solutions.json'
  const lessons = readJson(lessonPath)
  const solutions = readJson(solutionPath)

  for (const spec of pythonSpecs) {
    if (!lessons[spec.slug]) lessons[spec.slug] = pythonLesson(spec)
    if (!solutions[spec.slug]) solutions[spec.slug] = { language: 'python', code: spec.solution }
  }
  writeJson(lessonPath, lessons)
  writeJson(solutionPath, solutions)
  upgradeExistingCourse('python-basics')

  const manifestPath = 'data/academy/authoring/manifest.json'
  const manifest = readJson(manifestPath)
  for (const [sort, spec] of pythonSpecs.entries()) {
    if (!manifest.some((entry) => entry.courseSlug === 'python-basics' && entry.slug === spec.slug)) {
      manifest.push({
        courseSlug: 'python-basics',
        slug: spec.slug,
        title: spec.title,
        moduleTitle: spec.intensity === 'capstone' ? 'Module 3 · Production Automation' : 'Module 2 · Python in Practice',
        moduleSort: spec.intensity === 'capstone' ? 2 : 1,
        sort: spec.intensity === 'capstone' ? 0 : sort,
      })
    }
  }
  writeJson(manifestPath, manifest)
}

function completeGitCapstone() {
  const path = 'data/academy/authoring/git-the-terminal.lessons.json'
  const lessons = readJson(path)
  const blocks = lessons['capstone-recover-and-ship']
  const contract = requiredBlock(blocks, 'sprint-contract', 'git-the-terminal/capstone-recover-and-ship')
  const verification = requiredBlock(blocks, 'verification', 'git-the-terminal/capstone-recover-and-ship')
  const transfer = requiredBlock(blocks, 'transfer', 'git-the-terminal/capstone-recover-and-ship')
  if (!blocks.some((block) => block.type === 'calibration')) {
    insertBefore(blocks, 'transfer', calibration(contract, verification, transfer))
  }
  for (const [lessonSlug, lessonBlocks] of Object.entries(lessons)) {
    const gate = requiredBlock(lessonBlocks, 'unlock-gate', `git-the-terminal/${lessonSlug}`)
    if (!gate.criteria.some((criterion) => /test|prove|output|evidence|demonstrate/i.test(criterion))) {
      gate.criteria[0] = `Observable evidence — ${gate.criteria[0]}`
    }
  }
  writeJson(path, lessons)
}

upgradeExistingCourse('career-engineering_judgment_foundation', { requireLabForEveryLesson: true })
expandAndUpgradePython()
completeGitCapstone()

console.log('Upgraded Engineering Judgment (16), Python Basics (12), and Git & Terminal (20) against the flagship mastery contract.')
