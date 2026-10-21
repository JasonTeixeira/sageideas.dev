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
  commonMistake: debug.symptom,
})

const commentedFailure = (comparison) => comparison.left.lines
  .map((line) => `# ${line}`)
  .join('\n')

const derivedDebug = (comparison, walkthrough) => ({
  type: 'debug',
  symptom: comparison.left.verdict,
  brokenCode: `${commentedFailure(comparison)}\nraise NotImplementedError("Repair the violated contract")`,
  language: walkthrough.language,
  task: `Reproduce the weaker ${comparison.left.label} result in the lesson lab, identify the violated invariant, and repair it before continuing. Add a regression case that would fail on the weaker approach.`,
  fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}`,
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
  weak: 'The artifact follows the visible happy path but cannot survive an injected failure, independent check, or reviewer challenge.',
  passing: `The artifact satisfies every verification item: ${verification.items.join(' · ')}`,
  excellent: `Passing evidence plus a novel constraint, a documented repair, and this independent transfer: ${transfer.text}`,
  note: 'Score only inspectable evidence. Confidence, polish, and completion time cannot substitute for a passing artifact and defensible reasoning.',
})

const unlockGate = (contract, lab, debug, verification, transfer) => ({
  type: 'unlock-gate',
  criteria: [
    `Observable evidence — run the practical artifact and satisfy its output check (${lab.check}): ${contract.proof}`,
    `Debug evidence — reproduce and repair the broken case, then keep a regression check: ${debug.symptom}`,
    `Verification evidence — confirm every item: ${verification.items.join(' · ')}`,
    `Transfer evidence — complete this without copying the worked example: ${transfer.text}`,
  ],
})

const dataStructureSolutions = {
  'amortized-analysis': {
    language: 'python',
    code: `def total_cost_doubling(n):
    cap, size, total = 1, 0, 0
    for _ in range(n):
        if size == cap:
            total += size
            cap *= 2
        total += 1
        size += 1
    return total

def total_cost_constant(n, step=4):
    cap, size, total = step, 0, 0
    for _ in range(n):
        if size == cap:
            total += size
            cap += step
        total += 1
        size += 1
    return total

n = 16
d = total_cost_doubling(n)
c = total_cost_constant(n)
print("doubling total:", d, "avg:", d // n)
print("constant  total:", c, "avg:", c // n)`,
  },
  'heaps-priority-queues': {
    language: 'python',
    code: `import heapq

tasks = []
jobs = [(3, "email"), (1, "pager"), (4, "backup"), (2, "ticket")]
for job in jobs:
    heapq.heappush(tasks, job)
top = tasks[0]
order = []
while tasks:
    order.append(heapq.heappop(tasks))

print("top (min):", top)
print("pop order:", order)`,
  },
  'graph-representations': {
    language: 'python',
    code: `adj = {0: {1, 2}, 1: {2}, 2: {0}, 3: set()}

def to_matrix(adj, vertex_count):
    matrix = [[0] * vertex_count for _ in range(vertex_count)]
    for source, neighbors in adj.items():
        for target in neighbors:
            matrix[source][target] = 1
    return matrix

vertex_count = 4
matrix = to_matrix(adj, vertex_count)
print("neighbors of 0:", sorted(adj[0]))
print("edge 0->2?", matrix[0][2])
print("edge 2->1?", matrix[2][1])
print("matrix row 0:", matrix[0])`,
  },
}

const programmingCsSolutionOverrides = {
  'terminal-files': `import csv

GOOD_CSV = """order_id,customer,total
1001,alice,42.50
1002,bob,19.00
1003,alice,7.25
1004,carol,88.10
"""
BAD_CSV = """id,customer
1,alice
"""
with open("orders.csv", "w", newline="") as handle:
    handle.write(GOOD_CSV)
with open("bad.csv", "w", newline="") as handle:
    handle.write(BAD_CSV)

def count_orders(path):
    try:
        with open(path, newline="") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames is None or "order_id" not in reader.fieldnames:
                raise ValueError(f"{path}: expected an 'order_id' column")
            return sum(1 for _ in reader)
    except FileNotFoundError:
        raise FileNotFoundError(f"no such file: {path} (check your pwd)")

print(count_orders("orders.csv"))
try:
    count_orders("missing.csv")
except FileNotFoundError as error:
    print(f"FileNotFoundError: {error}")
try:
    count_orders("bad.csv")
except ValueError as error:
    print(f"ValueError: {error}")`,
  'types-dataclasses': `from dataclasses import dataclass

@dataclass(frozen=True)
class Order:
    sku: str
    quantity: int
    unit_price: float

    def __post_init__(self):
        if isinstance(self.quantity, bool) or not isinstance(self.quantity, int):
            raise TypeError(f"quantity must be int, got {type(self.quantity).__name__}")
        if self.quantity <= 0:
            raise ValueError(f"quantity must be positive, got {self.quantity}")
        if self.unit_price < 0:
            raise ValueError(f"unit_price must be >= 0, got {self.unit_price}")

    @property
    def total(self):
        return self.quantity * self.unit_price

def parse_order(row):
    return Order(row["sku"], row["quantity"], row["unit_price"])

rows = [
    {"sku": "A-100", "quantity": 3, "unit_price": 4.50},
    {"sku": "B-200", "quantity": 10, "unit_price": 1.25},
    {"sku": "C-300", "quantity": 2, "unit_price": 12.00},
]
orders = [parse_order(row) for row in rows]
for order in orders:
    print(f"{order.sku}: {order.quantity} x {order.unit_price:.2f} = {order.total:.2f}")
print(f"TOTAL: {sum(order.total for order in orders):.2f}")
try:
    orders[0].quantity = 99
except Exception as error:
    print(f"frozen: {type(error).__name__}")
try:
    parse_order({"sku": "X", "quantity": 0, "unit_price": 1.0})
except ValueError as error:
    print(f"invalid: {error}")`,
  'lists-dicts-sets': `from collections import defaultdict

events = [
    {"id": 101, "customer": "acme", "amount": 40.0},
    {"id": 102, "customer": "globex", "amount": 25.0},
    {"id": 101, "customer": "acme", "amount": 40.0},
    {"id": 103, "customer": "acme", "amount": 10.0},
    {"id": 102, "customer": "globex", "amount": 25.0},
    {"id": 104, "customer": "initech", "amount": 5.0},
]

def summarize_orders(records):
    seen = set()
    ordered_ids = []
    revenue = defaultdict(float)
    for record in records:
        if record["id"] in seen:
            continue
        seen.add(record["id"])
        ordered_ids.append(record["id"])
        revenue[record["customer"]] += record["amount"]
    return ordered_ids, dict(revenue)

ids, revenue = summarize_orders(events)
print("ids:", ids)
for customer in sorted(revenue):
    print(f"{customer}: {revenue[customer]:.1f}")`,
  'files-json-csv': `import csv
import io

csv_text = """id,item,qty,price
A1,widget,3,2.50
A2,gadget,10,1.10
A3,gizmo,1,9.99
"""

def parse_orders(text):
    orders = []
    for line_number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        order_id = (row.get("id") or "").strip()
        item = (row.get("item") or "").strip()
        raw_qty = (row.get("qty") or "").strip()
        raw_price = (row.get("price") or "").strip()
        if not raw_qty or not raw_price:
            raise ValueError(f"line {line_number}: qty and price are required")
        orders.append({"id": order_id, "item": item, "qty": int(raw_qty), "price": float(raw_price)})
    return orders

orders = parse_orders(csv_text)
total = 0.0
for order in orders:
    line_total = order["qty"] * order["price"]
    total += line_total
    print(f"{order['id']}: {order['qty']} x {order['price']:.2f} = {line_total:.2f}")
print(f"TOTAL: {total:.2f}")`,
  'errors-validation': `class OrderError(ValueError):
    pass

def validate_order(row):
    required = {"sku", "qty", "price"}
    missing = required - row.keys()
    if missing:
        raise OrderError(f"missing fields: {sorted(missing)}")
    try:
        qty = int(row["qty"])
    except (TypeError, ValueError):
        raise OrderError(f"qty not an integer: {row['qty']!r}")
    if qty <= 0:
        raise OrderError(f"qty must be > 0, got {qty}")
    try:
        price = float(row["price"])
    except (TypeError, ValueError):
        raise OrderError(f"price not numeric: {row['price']!r}")
    if price < 0:
        raise OrderError(f"price must be >= 0, got {price}")
    return {"sku": str(row["sku"]), "qty": qty, "price": price}

rows = [
    {"sku": "A1", "qty": "3", "price": "9.5"},
    {"sku": "B2", "qty": 0, "price": 4.0},
    {"qty": 2, "price": 1.0},
    {"sku": "C3", "qty": "x", "price": 1.0},
    {"sku": "D4", "qty": 5, "price": -2.0},
    {"sku": "E5", "qty": 1, "price": 0},
]
clean, errors = [], []
for row in rows:
    try:
        clean.append(validate_order(row))
    except OrderError as error:
        errors.append(str(error))
for record in clean:
    print(f"OK {record['sku']} qty={record['qty']} price={record['price']}")
print(f"accepted={len(clean)} rejected={len(errors)}")
for error in errors:
    print(f"ERR {error}")`,
  'frequency-maps': `votes = [
    "yes", "no", "yes", "abstain", "yes", "no", "yes", "abstain",
    "no", "yes", "yes", "no", "abstain", "yes", "no",
]

def count_frequencies(items):
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts

frequencies = count_frequencies(votes)
for choice in sorted(frequencies):
    print(f"{choice}: {frequencies[choice]}")
winner = max(sorted(frequencies), key=frequencies.get)
print(f"winner: {winner}")`,
  'stacks-queues': `from collections import deque

pairs = {")": "(", "]": "[", "}": "{"}

def is_balanced(text):
    stack = []
    for character in text:
        if character in "([{":
            stack.append(character)
        elif character in pairs:
            if not stack or stack.pop() != pairs[character]:
                return False
    return not stack

def run_jobs(jobs):
    queue = deque(jobs)
    order = []
    while queue:
        order.append(queue.popleft())
    return order

for expression in ["(a[b]{c})", "([)]", "{[}", "()[]{}", "(("]:
    print(f"{expression} -> {is_balanced(expression)}")
print("order:", " ".join(run_jobs(["build", "test", "deploy"])))`,
  'two-pointers-windows': `def longest_subarray_at_most(nums, k):
    if any(number < 0 for number in nums):
        raise ValueError("nums must be non-negative for the sliding window")
    left = 0
    window_sum = 0
    best = 0
    for right, number in enumerate(nums):
        window_sum += number
        while left <= right and window_sum > k:
            window_sum -= nums[left]
            left += 1
        best = max(best, right - left + 1)
    return best

cases = [
    ([2, 1, 5, 1, 3, 2], 8),
    ([1, 1, 1, 1, 1], 3),
    ([10, 2, 3], 5),
    ([], 5),
    ([4, 4, 4], 3),
]
for nums, k in cases:
    print(f"{nums} k={k} -> {longest_subarray_at_most(nums, k)}")`,
  'binary-search': `def binary_search(items, target):
    low, high = 0, len(items) - 1
    while low <= high:
        middle = (low + high) // 2
        if items[middle] == target:
            return middle
        if items[middle] < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1

data = [2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 91]
for target in [23, 2, 91, 16, 7, 100]:
    print(f"{target} -> {binary_search(data, target)}")`,
  'heaps-top-k': `import heapq

def top_k(nums, k):
    if not isinstance(k, int) or k < 0:
        raise ValueError(f"k must be a non-negative int, got {k!r}")
    if k == 0:
        return []
    heap = []
    for number in nums:
        if len(heap) < k:
            heapq.heappush(heap, number)
        elif number > heap[0]:
            heapq.heappushpop(heap, number)
    return sorted(heap)

stream = [7, 2, 9, 4, 1, 9, 5, 8, 3, 6, 0, 9]
print(top_k(stream, 3))
print(top_k(stream, 5))
print(top_k(stream, 0))
print(top_k(stream, 20))`,
  'graphs-bfs-dfs': `from collections import deque

network = {
    "A": ["B", "C"], "B": ["A", "D", "E"], "C": ["A", "F"],
    "D": ["B"], "E": ["B", "F", "G"], "F": ["C", "E", "G"],
    "G": ["E", "F"],
}

def bfs_shortest_path(graph, start, goal):
    if start not in graph:
        raise KeyError(f"start node {start!r} not in graph")
    queue = deque([[start]])
    visited = {start}
    while queue:
        path = queue.popleft()
        node = path[-1]
        if node == goal:
            return path
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])
    return None

for start, goal in [("A", "G"), ("D", "F"), ("A", "A")]:
    path = bfs_shortest_path(network, start, goal)
    print(f"{start}->{goal}:", " ".join(path), f"({len(path) - 1} hops)")`,
  'processes-ports-env-vars': `allowed_levels = {"debug", "info", "warning", "error"}

def read_port(env):
    raw = env.get("PORT", "8080")
    try:
        port = int(raw)
    except ValueError:
        raise ValueError(f"PORT must be an integer, got {raw!r}")
    if not 1 <= port <= 65535:
        raise ValueError(f"PORT out of range 1..65535: {port}")
    return port

def read_level(env):
    level = env.get("LOG_LEVEL", "info").lower()
    if level not in allowed_levels:
        raise ValueError(f"LOG_LEVEL invalid: {level!r}")
    return level

def describe(env):
    try:
        return f"port={read_port(env)} level={read_level(env)}"
    except ValueError as error:
        return f"ERROR: {error}"

scenarios = [{}, {"PORT": "3000", "LOG_LEVEL": "DEBUG"}, {"PORT": "80x"}, {"PORT": "70000"}, {"LOG_LEVEL": "trace"}]
for scenario in scenarios:
    print(describe(scenario))`,
  'http-dns-tls-basics': `from datetime import datetime, timezone
from urllib.parse import urlparse

now = datetime(2026, 6, 18, tzinfo=timezone.utc)
sites = [
    ("https://example.com/path?q=1", {"notAfter": "Aug 10 23:59:59 2026 GMT"}),
    ("https://api.internal:8443/v1", {"notAfter": "Jul 01 00:00:00 2026 GMT"}),
    ("https://shop.example.org", {"notAfter": "Jun 20 12:00:00 2026 GMT"}),
]

def check_url(url, cert):
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("expected an https URL with a hostname")
    expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    return parsed.hostname, parsed.port or 443, expires, (expires - now).days

for url, cert in sites:
    host, port, expires, days_left = check_url(url, cert)
    status = "OK" if days_left >= 30 else "RENEW"
    print(f"{host}:{port} expires {expires.date().isoformat()} ({days_left}d) [{status}]")`,
  'debugging-loop': `def total_revenue(rows):
    total = 0.0
    for row in rows:
        if "qty" not in row or "price" not in row:
            continue
        total += row["qty"] * row["price"]
    return total

def test_reproduces_missing_price_bug():
    assert total_revenue([{"qty": 2, "price": 5.0}, {"qty": 3}]) == 10.0

orders = [
    {"qty": 4, "price": 2.5}, {"qty": 3}, {"price": 9.0},
    {"qty": 5, "price": 1.5}, {"qty": 2, "price": 10.0},
]
test_reproduces_missing_price_bug()
print("test passed")
print(total_revenue(orders))`,
  'integration-mini-project': `from collections import Counter
from pathlib import Path
import re

review_text = """The quick brown fox jumps over the lazy dog.
The dog was not amused, and the fox did not care.
Quick, quick! The fox said, jumping over the dog again and again."""
Path("review.txt").write_text(review_text, encoding="utf-8")

def top_words(path, n=5):
    if n < 1:
        raise ValueError(f"n must be >= 1, got {n}")
    file = Path(path)
    if not file.is_file():
        raise FileNotFoundError(f"no readable file at {path!r}")
    words = re.findall(r"[a-z']+", file.read_text(encoding="utf-8").lower())
    return Counter(words).most_common(n)

for word, count in top_words("review.txt", 3):
    print(f"{word}: {count}")`,
  'track-1-capstone': `import csv
import io

csv_data = """product,price
Widget,10.00
Gadget,25.50
Widget,5.00
,7.00
Gadget,notaprice
Gizmo,100.00
Widget,
Gizmo,50.25
"""

def summarize_orders(text):
    totals = {}
    skipped = 0
    for row in csv.DictReader(io.StringIO(text)):
        product = (row.get("product") or "").strip()
        try:
            price = float(row["price"])
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue
        if not product:
            skipped += 1
            continue
        totals[product] = totals.get(product, 0.0) + price
    return totals, skipped

totals, skipped = summarize_orders(csv_data)
for product in sorted(totals):
    print(f"{product}: {totals[product]:.2f}")
print(f"skipped: {skipped}")`,
}

function completeDataStructures() {
  const lessonPath = 'data/academy/authoring/data-structures.lessons.json'
  const solutionPath = 'data/academy/authoring/data-structures.lab_solutions.json'
  const lessons = readJson(lessonPath)
  const solutions = readJson(solutionPath)

  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `data-structures/${lessonSlug}`
    const contract = requiredBlock(blocks, 'sprint-contract', key)
    const lab = requiredBlock(blocks, 'lab', key)
    const verification = requiredBlock(blocks, 'verification', key)
    const transfer = requiredBlock(blocks, 'transfer', key)
    const gate = requiredBlock(blocks, 'unlock-gate', key)

    if (!gate.criteria.some((criterion) => /test|prove|output|evidence|demonstrate/i.test(criterion))) {
      gate.criteria[0] = `Observable evidence — ${gate.criteria[0]} Output check: ${lab.check}`
    }

    if (lessonSlug === 'capstone-pick-and-implement') {
      contract.intensity = 'capstone'
      contract.time = '2–4 hrs'
      if (!blocks.some((block) => block.type === 'calibration')) {
        insertBefore(blocks, 'transfer', calibration(contract, verification, transfer))
      }
    }
  }

  for (const [lessonSlug, solution] of Object.entries(dataStructureSolutions)) {
    solutions[lessonSlug] ??= solution
  }

  const orderedSolutions = Object.fromEntries(
    Object.keys(lessons).map((lessonSlug) => {
      if (!solutions[lessonSlug]) throw new Error(`data-structures/${lessonSlug}: missing solution`)
      return [lessonSlug, solutions[lessonSlug]]
    }),
  )
  writeJson(lessonPath, lessons)
  writeJson(solutionPath, orderedSolutions)
}

function upgradeProgrammingCsFoundations() {
  const courseSlug = 'career-programming_cs_foundations'
  const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
  const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
  const lessons = readJson(lessonPath)
  const solutions = readJson(solutionPath)

  for (const [lessonSlug, code] of Object.entries(programmingCsSolutionOverrides)) {
    solutions[lessonSlug] = { language: 'python', code }
  }

  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = requiredBlock(blocks, 'sprint-contract', key)
    const verification = requiredBlock(blocks, 'verification', key)
    const transfer = requiredBlock(blocks, 'transfer', key)
    const comparison = requiredBlock(blocks, 'compare', key)
    const walkthrough = blocks.find((block) => block.type === 'code-walkthrough')
    const lab = requiredBlock(blocks, 'lab', key)
    const solution = solutions[lessonSlug]
    const originalLabIndex = blocks.findIndex((block) => block.type === 'lab')

    if (!solution) throw new Error(`${key}: missing reference solution`)
    lab.language ??= solution.language

    if (!blocks.some((block) => block.type === 'debug')) {
      if (!walkthrough) throw new Error(`${key}: cannot derive debug case without code-walkthrough`)
      insertAfter(blocks, 'lab', derivedDebug(comparison, walkthrough))
    }
    const debug = requiredBlock(blocks, 'debug', key)

    if (!blocks.some((block) => block.type === 'worked-example')) {
      if (!walkthrough) throw new Error(`${key}: cannot derive worked example without code-walkthrough`)
      const walkthroughIndex = blocks.findIndex((block) => block.type === 'code-walkthrough')
      blocks.splice(walkthroughIndex, 1, derivedWorkedExample(walkthrough, debug))
    } else {
      const walkthroughIndex = blocks.findIndex((block) => block.type === 'code-walkthrough')
      if (walkthroughIndex > blocks.findIndex((block) => block.type === 'lab')) {
        blocks.splice(walkthroughIndex, 1)
      }
    }

    if (!blocks.some((block) => block.type === 'tradeoff')) {
      const debugIndex = blocks.findIndex((block) => block.type === 'debug')
      const currentLabIndex = blocks.findIndex((block) => block.type === 'lab')
      insertAfter(blocks, debugIndex < currentLabIndex ? 'lab' : 'debug', derivedTradeoff(comparison))
    }

    const debugIndex = blocks.findIndex((block) => block.type === 'debug')
    const labIndex = blocks.findIndex((block) => block.type === 'lab')
    if (debugIndex < labIndex) {
      const [authoredDebug] = blocks.splice(debugIndex, 1, {
        type: 'callout',
        tone: 'warning',
        text: `Prediction checkpoint: before running the build, name the failure you expect and the invariant it violates. Then reproduce it in the lab and compare your diagnosis with the broken-case evidence after the build.`,
      })
      insertAfter(blocks, 'lab', authoredDebug)
    }

    const verificationIndex = blocks.findIndex((block) => block.type === 'verification')
    const tradeoffIndex = blocks.findIndex((block) => block.type === 'tradeoff')
    if (verificationIndex < tradeoffIndex) {
      const [authoredVerification] = blocks.splice(verificationIndex, 1)
      insertAfter(blocks, 'tradeoff', authoredVerification)
    }

    if (['deep', 'capstone'].includes(contract.intensity) && !blocks.some((block) => block.type === 'calibration')) {
      insertBefore(blocks, 'transfer', calibration(contract, verification, transfer))
    }

    if (!blocks.some((block) => block.type === 'unlock-gate')) {
      blocks.push(unlockGate(contract, lab, debug, verification, transfer))
    }

    if (blocks.findIndex((block) => block.type === 'lab') !== originalLabIndex) {
      throw new Error(`${key}: lab identity moved from block ${originalLabIndex}`)
    }
  }

  const orderedSolutions = Object.fromEntries(
    Object.keys(lessons).map((lessonSlug) => {
      if (!solutions[lessonSlug]) throw new Error(`${courseSlug}/${lessonSlug}: missing solution`)
      return [lessonSlug, solutions[lessonSlug]]
    }),
  )
  writeJson(lessonPath, lessons)
  writeJson(solutionPath, orderedSolutions)
}

function mapCanonicalLessons() {
  const graphPath = 'data/academy/flagship-competency-graph.json'
  const graph = readJson(graphPath)
  const competency = graph.competencies.find((candidate) => candidate.id === 'programming-automation')
  if (!competency) throw new Error('missing programming-automation competency')

  for (const courseSlug of ['data-structures', 'career-programming_cs_foundations']) {
    const lessons = readJson(`data/academy/authoring/${courseSlug}.lessons.json`)
    const mapping = competency.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
    if (!mapping) throw new Error(`${courseSlug}: missing competency mapping`)
    mapping.lessonSlugs = Object.keys(lessons)
  }

  writeJson(graphPath, graph)
}

completeDataStructures()
upgradeProgrammingCsFoundations()
mapCanonicalLessons()

console.log('Completed Data Structures (20) and Programming & Computer Science Foundations (20) against the flagship mastery contract.')
