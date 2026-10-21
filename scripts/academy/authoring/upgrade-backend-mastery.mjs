import { readFileSync, writeFileSync } from 'node:fs'

const courseSlug = 'career-backend_engineering'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const solutionPath = `data/academy/authoring/${courseSlug}.lab_solutions.json`
const graphPath = 'data/academy/flagship-competency-graph.json'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const lessons = readJson(lessonPath)
const solutions = readJson(solutionPath)
if (Object.keys(lessons).length !== 20 || JSON.stringify(Object.keys(lessons)) !== JSON.stringify(Object.keys(solutions))) throw new Error('Backend lesson/solution coverage drift')

const replaceOnce = (source, needle, replacement, key) => {
  if (!source.includes(needle)) throw new Error(`${key}: repair marker not found`)
  return source.replace(needle, replacement)
}
const starter = (slug) => lessons[slug].find((block) => block.type === 'lab').starter
const repair = (slug, needle, body) => {
  solutions[slug] = { language: 'python', code: replaceOnce(starter(slug), needle, body, slug) }
}

repair('backend-request-response', '    # TODO: implement the contract above. Return (status:int, body:dict).\n    raise NotImplementedError', `    body = req.get("body")
    if not isinstance(body, dict) or not isinstance(body.get("customer_id"), int) or not isinstance(body.get("amount"), int) or body["amount"] <= 0:
        return 400, {"ok": False, "error": "INVALID_BODY"}
    if req.get("token") != VALID_TOKEN:
        return 401, {"ok": False, "error": "UNAUTHENTICATED"}
    if TOKEN_OWNER != body["customer_id"]:
        return 403, {"ok": False, "error": "FORBIDDEN"}
    key = req.get("idempotency_key")
    if not isinstance(key, str) or not key:
        return 400, {"ok": False, "error": "IDEMPOTENCY_KEY_REQUIRED"}
    if key in _idempotency_store:
        return _idempotency_store[key]
    order_id = _next_id[0]
    _next_id[0] += 1
    _orders[order_id] = {"customer_id": body["customer_id"], "amount": body["amount"]}
    result = (200, {"ok": True, "order_id": order_id, "amount": body["amount"]})
    _idempotency_store[key] = result
    return result`)

repair('http-status-codes', '    # TODO: your code here\n    raise NotImplementedError', `    if amount <= 0:
        return Result(422, "amount must be positive")
    if not can_charge:
        return Result(403, "not allowed to charge this account")
    if idem_key in _IDEM_STORE:
        return _IDEM_STORE[idem_key]
    try:
        result = charge_and_persist(account_id, amount, idem_key, infra_ok, duplicate)
        _IDEM_STORE[idem_key] = result
        return result
    except DuplicateChargeError:
        return Result(409, "payment already exists for this order")
    except InfraError:
        return Result(503, "payment provider unavailable")`)

repair('auth-authorization-boundaries', '    # TODO: implement the authorization boundary described above.\n    # Return an (int_status_code, body) tuple.\n    raise NotImplementedError', `    if principal_customer_id is None:
        return 401, "unauthenticated"
    order = ORDERS.get(order_id)
    if order is None:
        return 404, "not_found"
    if order["customer_id"] != principal_customer_id:
        return 403, "forbidden"
    return 200, {"id": order["id"], "total": order["total"]}`)

repair('persistence-repository-boundary', '        raise NotImplementedError', `        prior = self._orders.find_by_idempotency_key(idempotency_key)
        if prior is not None:
            return prior
        return self._orders.save(order, idempotency_key)`)

repair('background-jobs-queue-basics', '    ...', `    if order["status"] == "charged":
        return
    CHARGES.append(job["order_id"])
    order["status"] = "charged"`)

repair('worker-state-retries-dlq', '    # TODO: return one of "skip", "ack", "dead-letter", "retry"\n    # following the numbered rules above. Remember to record the key\n    # in `processed` on a successful ack.\n    raise NotImplementedError', `    if key in processed:
        return "skip"
    if code == 200:
        processed.add(key)
        return "ack"
    if code in NON_RETRYABLE or attempt >= MAX_ATTEMPTS:
        return "dead-letter"
    return "retry"`)

repair('observability-request-ids-logs-metrics', '# Your code goes here:\n', `# Your code goes here:
for rid, method, path, status in REQUEST_LOG:
    token = request_id_ctx.set(rid)
    try:
        log.info(f"{method} {path} -> {status}")
        record_request(method, path, status)
    finally:
        request_id_ctx.reset(token)
`)

repair('versioning-compatibility', '    raise NotImplementedError', `    item_id = body.get("itemId")
    if not isinstance(item_id, str):
        raise ValueError("itemId must be a string")
    qty = body.get("qty")
    if isinstance(qty, bool) or not isinstance(qty, int) or qty <= 0:
        raise ValueError("qty must be a positive integer")
    tier = body.get("shippingTier", "standard")
    if tier is None:
        tier = "standard"
    if tier not in VALID_TIERS:
        raise ValueError("shippingTier must be 'standard' or 'express'")
    return {"itemId": item_id, "qty": qty, "shippingTier": tier}`)

repair('backend-debugging-incident-loop', '    # TODO: implement the three boundaries in order\n    raise NotImplementedError', `    amount = req.get("amount")
    if not isinstance(amount, int) or amount <= 0:
        raise OrderError(422, "invalid amount")
    if req.get("account_id") != caller_account_id:
        raise OrderError(403, "forbidden")
    key = req.get("key")
    if key in seen_keys:
        return f"REPLAYED id={seen_keys[key]}"
    order_id = _next_id[0]
    _next_id[0] += 1
    orders[order_id] = {"account_id": caller_account_id, "key": key}
    seen_keys[key] = order_id
    return f"CREATED id={order_id}"`)

repair('backend-capstone', '    # TODO: implement the 4 ordered gates described above.\n    raise NotImplementedError', `    body = request.get("body")
    if not isinstance(body, dict) or not isinstance(body.get("account_id"), str) or isinstance(body.get("amount"), bool) or not isinstance(body.get("amount"), int) or body["amount"] <= 0:
        return 422, "422 invalid"
    if request.get("actor") != body["account_id"]:
        return 403, "403 forbidden"
    key = request.get("idempotency_key")
    if not isinstance(key, str) or not key:
        return 400, "400 key required"
    if key in store:
        return 200, f"200 replayed {store[key]}"
    store[key] = body["amount"]
    return 201, f"201 created {body['amount']}"`)

const required = (blocks, type, key) => { const block = blocks.find((candidate) => candidate.type === type); if (!block) throw new Error(`${key}: missing ${type}`); return block }
const before = (blocks, type, block) => { const index = blocks.findIndex((candidate) => candidate.type === type); blocks.splice(index, 0, block) }
const after = (blocks, type, block) => { const index = blocks.findIndex((candidate) => candidate.type === type); blocks.splice(index + 1, 0, block) }

for (const [lessonSlug, blocks] of Object.entries(lessons)) {
  const key = `${courseSlug}/${lessonSlug}`
  const contract = required(blocks, 'sprint-contract', key)
  const walkthrough = required(blocks, 'code-walkthrough', key)
  const comparison = required(blocks, 'compare', key)
  const lab = required(blocks, 'lab', key)
  const verification = required(blocks, 'verification', key)
  const transfer = required(blocks, 'transfer', key)
  lab.language = 'python'

  if (!blocks.some((block) => block.type === 'worked-example')) before(blocks, 'concept', {
    type: 'worked-example', intro: `${walkthrough.title}. Trace one complete boundary decision before changing the handler.`, code: walkthrough.code,
    language: walkthrough.language, steps: walkthrough.steps.map((step) => `${step.label}: ${step.note ?? `inspect lines ${step.lines.join(', ')}`}`), commonMistake: comparison.left.verdict,
  })

  let debug = blocks.find((block) => block.type === 'debug')
  if (debug && blocks.indexOf(debug) < blocks.indexOf(lab)) {
    blocks.splice(blocks.indexOf(debug), 1)
    after(blocks, 'lab', debug)
  }
  if (!debug) {
    debug = { type: 'debug', symptom: comparison.left.verdict, brokenCode: lab.starter, language: 'python', task: `Add an adversarial request that defeats ${comparison.left.label}, reproduce the unsafe response or side effect, repair the boundary, and retain the case as a regression check.`, fix: `${comparison.right.lines.join(' · ')}. ${comparison.right.verdict}` }
    after(blocks, 'lab', debug)
  } else if (!/regression/i.test(debug.task ?? '')) debug.task = `${debug.task} Retain the repaired case as a regression check.`

  let tradeoff = blocks.find((block) => block.type === 'tradeoff')
  if (!tradeoff) {
    tradeoff = { type: 'tradeoff', question: comparison.title, optionA: { label: comparison.left.label, text: `${comparison.left.lines.join(' · ')} Outcome: ${comparison.left.verdict}` }, optionB: { label: comparison.right.label, text: `${comparison.right.lines.join(' · ')} Outcome: ${comparison.right.verdict}` }, guidance: comparison.caption }
    after(blocks, 'debug', tradeoff)
  } else if (blocks.indexOf(tradeoff) < blocks.indexOf(debug)) {
    blocks.splice(blocks.indexOf(tradeoff), 1)
    after(blocks, 'debug', tradeoff)
  }
  if (!blocks.some((block) => block.type === 'calibration')) before(blocks, 'transfer', { type: 'calibration', artifact: contract.proof, weak: 'The happy path works, but failure precedence, replay behavior, boundary evidence, or an adversarial regression is missing.', passing: `The exact simulation passes and every verification item is evidenced: ${verification.items.join(' · ')}`, excellent: `Passing evidence plus an unseen failure, retained regression, operational tradeoff, and this transfer: ${transfer.text}`, note: 'Local output is practice feedback; controlled evaluation and expert review are still required for mastery.' })
  if (!blocks.some((block) => block.type === 'unlock-gate')) after(blocks, 'spaced-review', { type: 'unlock-gate', criteria: [`Build evidence — complete the handler and match the exact output contract.`, `Debug evidence — reproduce and retain the weak case as a regression: ${debug.symptom}`, `Boundary evidence — produce: ${contract.proof}`, `Verification evidence — ${verification.items.join(' · ')}`, `Transfer evidence — ${transfer.text}`], practiceOnlyNotice: 'This deterministic local lab is practice feedback only, not controlled mastery evidence or production certification.' })
}

const graph = readJson(graphPath)
const competency = graph.competencies.find((candidate) => candidate.id === 'backend-distributed-systems')
const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
if (!mapping) throw new Error('Missing backend-distributed-systems mapping')
mapping.lessonSlugs = Object.keys(lessons)
writeJson(lessonPath, lessons)
writeJson(solutionPath, solutions)
writeJson(graphPath, graph)
console.log(`Upgraded ${Object.keys(lessons).length} Backend lessons and repaired exact reference contracts.`)
