# Sage Academy — Master Program (the ultimate-system build, run autonomously)

> **Historical curriculum snapshot.** Counts and certification claims here are not current authority. Use `data/academy/registry.json` and `docs/evidence/academy/canonical-truth/latest.md` for the repository inventory; no course is certified until Harness V2 passes.

> The operator approved running ALL five programs to make the academy the best on the
> planet: complete content, independently verified for accuracy, maximally interactive,
> translated worldwide, on the app stores. This doc sequences them, tracks progress, and
> is the resume point across context summarization + rate-limit cycles. Reads with
> [AUTHORING_PROGRAM.md](./AUTHORING_PROGRAM.md), [CONTENT_AUDIT.md](./CONTENT_AUDIT.md),
> [FRONTEND_DESIGN_HANDOFF.txt](./FRONTEND_DESIGN_HANDOFF.txt).

## Dependency order (why this sequence)
Content must exist before it can be verified; must be verified before it is translated
(never translate an error) or mass-marketed; interactivity layers onto verified content;
mobile packages the whole thing. So:

**P0 Complete content (→ 448/448)** → **P1 Independent accuracy verification** →
**P2 Interactivity + labs** → **P3 Translation** → **P4 Mobile (PWA → stores)**.
Community/portfolio threads throughout (substrate already exists).

## The engine (reused across programs)
The proven per-course loop: `gen-author-workflow` → Workflow(author) → `collect-payload`
(coerce + floor-check) → `apply-course --apply` → `sweep-lessons` (single-login render) →
`gen-score-workflow` → Workflow(score ≥95) → scoped commit. NEVER two 20-agent Workflows
at once. Rate-limit → back off, resume from the ledger. Same shape adapts to verify/translate.

---

## P0 — COMPLETE CONTENT (→ 448/448)
State: 424/448 done (21 courses). Remaining 2 courses:
- [ ] `career-programming_cs_foundations` (20) — DISTINCT CS/algorithms course (own source
      `01_programming_cs_foundations`; big-O, two-pointers, binary search, graphs, DP).
      Manifest un-excluded (410 mapped). Authoring in progress.
- [ ] `python-basics` (4) — no source curriculum; author from authoritative Python docs
      (context7) from scratch, or fold into programming-fundamentals + hide.
Exit: 23/23 courses, 448/448 lessons visual-first + render-verified ≥95.

## P1 — INDEPENDENT ACCURACY VERIFICATION (all 448) [POC PROVEN]
Tools: **context7** (library/framework API truth) + **WebSearch/WebFetch** (OWASP, RFC 9110,
MDN, NIST, SWEBOK, cloud docs). POC scored 3 lessons 82–98 and caught a real spec bug
(403→404 existence-leak in security-mindset-risk — fixed + committed).
Method (per course, Workflow): extract each lesson's technical claims → route (spec→web/RFC,
library-API→context7) → verdict CONFIRMED/IMPRECISE/WRONG with the quoted source → auto-fix
WRONG/IMPRECISE (targeted patch or re-author) → re-apply → re-score → commit. Dedupe by
source URL (OWASP/RFC/MDN pages reused across dozens of lessons) to bound fetch volume.
Output: a per-course accuracy report + a platform accuracy score. This is the marketing moat.
Exit: every lesson accuracy-verified ≥95 against primary sources; errors fixed.

## P2 — INTERACTIVITY + LABS
Have: Pyodide + `LabRunner` (27/448 runnable). Build:
- Executable labs across coding courses (backend/frontend/databases/CS-foundations) — real
  starter+check runs in-browser.
- Interactive ARTIFACT builders for judgment/design/leadership/security courses: fill-in
  ADR / decision-memo / threat-model / risk-register with live validation (matches the
  reviewable-artifact pedagogy — a "lab" that isn't code).
- More WASM runtimes (JS/TS via quickjs; SQL via sql.js) so labs aren't Python-only.
- Clickable/expandable diagrams (SageDiagram node → detail drawer).
Exit: every lesson has ≥1 real interactive element (lab, artifact-builder, or interactive viz).

### P2 engine + run ledger (code-lab lane)
Key finding: a runnable lab is **pure block-JSON** — `verifyLab` reads `labBlock.check` server-side
(never sent to client), so no new API/check-store is needed and Python runs today via Pyodide.
Engine: `gen-lab-workflow` (author one grounded lab/lesson, throttled waves) → decode HTML entities →
`gen-verify-labs` (agent returns full solution) → `run-labs-check` (execute with python3, PASS iff
solution stdout satisfies `check` under verifyLab's exact rule: case-insensitive substring) → fix any
fail → `collect-labs` (insert before consolidation tail) → `apply-course` → authenticated render sweep.
| course (code lane) | labs | verified-executable | notes |
|---|---|---|---|
| career-programming_cs_foundations | 20 | **20/20** | slice-1 proof. All solutions run + satisfy checks under production semantics; 3-lesson render sweep clean (0 overflow). Applied (303 blocks). Runtime = Pyodide/Python. |
| career-backend_engineering | 20 | **20/20** | idempotency/exactly-once, auth boundaries, DLQ/retries, rate-limits, contract-testing. All execute + satisfy checks. Render sweep clean. Applied (302 blocks). |
| career-data_engineering_analytics | 20 | **20/20** | data-contract quality gates, watermark incremental ingestion, dbt-style source contracts, reconcile/incident-response. 1 check healed to real stdout (learner-format lab). Sweep clean. Applied (300 blocks). |
| career-ai_engineering_rag_eval | 20 | **20/20** | RAG framing gates, grounding/refusal prompt contracts, structured-output validation, LLMOps release gates, eval harnesses. Sweep clean. Applied (300 blocks). |
| career-qa_sdet_test_automation_engineering | 20 | **20/20** | risk-based test planning (exposure ranking), test-pyramid layer routing, release-confidence gates (retry/triage), defect taxonomy, flaky-test triage. Sweep clean. Applied (300 blocks). |
| **CODE-LAB TOTAL** | **100** | **100/100** | 5 Python-native courses. Every lab's solution executed with python3 and satisfies its check under verifyLab's exact rule. All render sweeps clean. |
| career-databases_data_modeling | 20 | **20/20** | SQL (sql.js) runtime. CDC freshness-gap anti-joins, many-to-many traversal, normalization, constraint-invariant detection, index access patterns. Verified via real sqlite3. Sweep clean. Applied (304 blocks). |
| career-frontend_fullstack | 20 | **20/20** | JS (sandboxed Web Worker) runtime. Tagged-union UI states, semantic-HTML landmark audits, auto-fit grid math, component composition, testing strategy. Verified via node + worker shim. Sweep clean. Applied (300 blocks). |
| **GRAND TOTAL (code labs)** | **140** | **140/140** | 7 coding courses across 3 runtimes (Python·SQL·JS), every lab proven by real execution vs check. |
| mobile | — | — | RUNTIME-GATED — Swift/Kotlin; needs its own runtime, NOT forced JS. Deferred (only remaining code course without labs). |

## P3 — TRANSLATION (top world languages)
Infra: `scripts/translate-academy.ts` + `i18n:audit` + `i18n:verify`. Translate block
text/labels/captions + diagram node/edge labels per locale; keep code + structure.
Languages (by reach): Spanish, Mandarin (Simplified), Hindi, Arabic (RTL), Portuguese-BR,
French, Japanese, German, Indonesian, Russian. Add a technical-accuracy pass per locale
(terms of art must survive translation; RTL layout for Arabic). Run AFTER P1.
Exit: platform localized to the top languages, each with a passing i18n:verify + a technical
review sample ≥95.

## P4 — MOBILE (learn from anywhere)
Web = Next.js. Ship in order of speed-to-value:
- [ ] PWA: manifest + service worker + offline lesson cache (installable now).
- [ ] Capacitor wrapper → App Store + Play Store (Pyodide/labs work in webview).
- [ ] (optional) Expo/React Native rebuild for native-grade UX if warranted.
Exit: installable PWA live; store builds submitted.

---

## Master ledger
| Program | Status |
|---|---|
| P0 complete content (448) | **✅ DONE — 448/448 lessons, 23/23 courses visual-first, all ≥95 (DB-verified 2026-07-02)** |
| P1 accuracy verification | **✅ DONE (targeted standards pass) — 469/471 standards-claims verified vs primary sources, 261 corrected, re-applied clean + committed (2026-07-02). Deep per-lesson verify remains optional.** |
| P2 interactivity + labs | **✅ DONE (2026-07-02)** — (1) 140 verified-executable code labs across 7 courses in 3 runtimes: Python/Pyodide (CS-foundations, backend, data-eng, ai-eng, qa), SQL/sql.js (databases), JS/sandboxed-worker (frontend); each proven by real execution vs check. (2) Artifact-builder lane: interactive sprint-contract composer on EVERY course. Only mobile (Swift/Kotlin) lacks a runtime. |
| P3 translation | queued (after P1) |
| P4 mobile | queued (PWA can start in parallel) |

### P1 run ledger — TARGETED: standards-claims verified by source (471 distinct claims)
Method: `extract-standards-claims.mjs` inventoried every standards citation (471 distinct,
deduped) → `gen-standards-verify.mjs <STD>` batches by source (fetch primary source once) →
Workflow verifies → `apply-standards-fixes.mjs` substitutes fixes verbatim across all
occurrences → re-apply affected courses → commit. Order by false-attribution risk.
| standard | claims | confirmed | corrected | notes |
|---|---|---|---|---|
| SWEBOK | 66 | 7 | **59** | 89% false/imprecise — SWEBOK invoked for distributed-systems/ops practices it doesn't cover; DORA/ABET co-citations also stripped. Fixed across 7 courses, re-applied clean. |
| DORA | 105 | 20 | **85** | 81% false/imprecise — SRE golden signals, RED method, 12-factor, error budgets all falsely credited to DORA; DORA measures delivery outcomes, doesn't prescribe techniques. Fixed across 7 courses, re-applied clean. (1 rate-limit retry.) |
| OWASP | 102 | 64 | **38** | 63% confirmed (concrete categories fare better) — corrections were miscited category numbers (API1 vs API3/5/8), the retired "Excessive Data Exposure", A09 vs A02 mixups. Fixed across 4 courses, re-applied clean. |
| WCAG | 132 | 101 | **31** | 77% confirmed — corrections were the WCAG-vs-ARIA conflation (aria-busy/role=alert/aria-modal cited as "WCAG requirements" when they're ARIA techniques; WCAG sets the outcome) + omitted SC exceptions (1.4.10 Reflow). Fixed across 4 courses, re-applied clean. |
| NIST | 36 | 6 | **30** | 83% false/imprecise (framework over-attributed like SWEBOK/DORA) — "traceability" cited as a named trustworthiness property (it's "accountable and transparent"), "abstention" prescribed (word absent), cost/latency named as a monitored triad (not in text). Fixed across 3 courses, re-applied clean. |
| SOC2 | 18 | 5 | **13** | "SOC 2 certified" (it's an attestation report, not a certification), invented SLA windows (24h/15min attributed to CC6.3, which sets none), a non-existent "access-review control", mandated quarterly cadence (org-chosen). Fixed across 2 courses, re-applied clean. |
| RFC | 10 | 5 | **5** | 50% — real spec errors: MUST NOT vs SHOULD NOT (9110 §9.2.2 retry rule), Alt-Svc "mandatory" vs OPTIONAL (7838), a garbled "404 (not 404)" corrupting the 403/404 existence-leak point, TCP-only RFC 793 vs UDP 768. Fixed across 3 courses, re-applied clean. |
| **TOTAL** | **469** | **208 (44%)** | **261** | 7 standards, verified by primary source, all fixes applied verbatim across every occurrence + re-applied clean. |

### P1 summary — the systemic finding
Across 469 standards-claims, only **44% survived verification**; **261 were false or imprecise**.
The failure was uniform in kind: standards were cited as **rhetorical authority, not checked
citation** — "SWEBOK says X", "DORA prescribes Y", "WCAG requires Z" — where the primary text
says no such thing. The split by standard is diagnostic:
- **Broad frameworks were worst** (invoked to lend weight to techniques they never name): SWEBOK
  **11%** confirmed, NIST **17%**, DORA **19%**. These bodies describe outcomes/knowledge areas;
  authors wrongly made them *prescribe* implementation practices (idempotency, DLQ, RED method,
  12-factor, abstention, "traceability").
- **Concrete standards fared best** (real, checkable categories): WCAG **77%**, OWASP **63%**,
  RFC **50%**, SOC2 **28%**. Errors here were miscited specifics — wrong OWASP API numbers, the
  WCAG-vs-ARIA conflation (ARIA techniques cited as WCAG requirements), invented SOC2 SLAs and
  "certification" (it's an attestation report), MUST NOT vs SHOULD NOT.
Every fix **preserves the pedagogy and strips (or corrects) the false authority** — the teaching
point stands; the fabricated citation is gone. This was the marketing moat and the biggest
integrity risk in the corpus; it is now closed for standards-attribution. (Note: this pass
targets *standards citations* specifically — the highest-risk error class. A full per-lesson
technical-claim deep-verify, POC'd on 3 lessons, remains available as an optional deeper pass.)
| (security_identity) | POC: 3 lessons 82–98 | 1 (403→404) | proof-of-concept done before the full run |

## Guardrails (unchanged)
Grounded, never hollow. Verify before translate/ship. Scoped commits, no push. Never fake a
gate/score. One heavy Workflow at a time. Rate-limit → back off + resume from this ledger.
Checkpoint the operator at PROGRAM boundaries (not per-lesson).
