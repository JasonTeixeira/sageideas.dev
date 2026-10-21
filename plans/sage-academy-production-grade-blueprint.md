# Sage Academy Production-Grade Blueprint

**Objective:** turn the existing Sage Academy into a commercially launchable, evidence-backed learning institution that can take a complete beginner through AI automation, software, cloud, networking, security, and production operations—and prove mastery through executable work.

**Created:** 2026-08-26  
**Repository:** `JasonTeixeira/sageideas.dev`  
**Default branch:** `main`  
**Execution mode:** local branches/worktrees and scoped commits; no push, deploy, paid action, credential change, or third-party mutation without explicit approval.

## 1. Executive decision

Do **not** add more courses yet and do **not** rewrite the LMS.

Use the implemented Supabase-backed Academy and the existing evidence, review, lesson, lab, mastery, and commerce foundations only where end-to-end verification proves them real. Some capabilities are fully learner-visible, some are partially wired, and some survive only in plans or stale proofs. Step 1 classifies them before they can support a launch claim. First build a trustworthy certification pipeline, then certify one flagship beginner-to-production path, launch a controlled paid founding beta, measure real outcomes, and graduate the remaining courses in batches.

The Academy can earn an internal 95–97 through engineering and review. A credible 98–99 requires real learner retention, verified mastery gain, high-quality artifacts, external review, and production operating evidence. A self-awarded 99 is prohibited.

## 2. Verified starting point

### Current snapshot strengths

These counts are a working-tree snapshot from 2026-08-26, not durable product truth. Step 1 must replace them with generated, reproducible inventory.

- 32 git-resident course bundles and 632 authored lessons.
- 354 lesson lab blocks, 632 pretests, 632 quizzes, 632 spaced-review blocks, and 193 unlock gates.
- A five-beat learning model: HOOK → MODEL → DO → PROVE → LOCK.
- Evidence events, score caps, repair flow, FSRS recall, mastery, tutor, progress, certificates, community, goals, streaks, and efficacy code exist at varying levels of wiring. Learner-visible and end-to-end status remains to be classified and proven.
- 61 Academy pages/endpoints, 128 Academy React components, and 11 Academy-relevant E2E/accessibility suites.
- The July structural board recorded all 32 courses as structurally passing.

### Current weaknesses and contradictions

- The global authoring manifest contains 23 courses / 448 lessons, while the working tree contains 32 / 632.
- Nine course bundles / 184 lessons are outside the global manifest.
- 268 of 354 current lab blocks have a same-slug solution; 86 do not.
- Existing proof boards are stale or incompatible: the July content board has 668 warnings and marks labs unverified, while other documents claim 140 executable labs.
- Only 12 courses have substantive excellence judgments; their average is 82, with scores from 58 to 87.
- Only three course evidence directories currently contain `sources.json`; authoring bundles contain no per-course `*.sources.json` ledgers.
- Multiple catalog fixtures, manifests, taxonomy files, database records, and design catalogs disagree about what is live.
- Product/pricing plans conflict: $20/$25/$29 subscriptions and $397/$497 one-time tracks all appear in repository planning.
- An old plan proposes Payload CMS and WebContainers, but the implemented product uses Supabase content and Pyodide/SQL/JS runtimes.
- The implemented learning engine calls itself 17-step in places but declares 16 loop entries.
- The current learner lab verifier can accept client-provided output containing a server-side check substring. Until Step 4A replaces this trust boundary, that signal is ineligible for certification or mastery.
- Marketing/design proofs are older than the current content state.
- Production dependencies remain externally gated: canonical Stripe prices/account, paywall decision, Sentry, durable rate limiting, live tutor key, and deployment proof.

## 3. Non-negotiable product invariants

1. **One source of truth:** every course has one canonical ID, status, manifest row, database record, quality record, and public route.
2. **No passive completion:** reading or clicking alone never establishes mastery.
3. **Evidence before unlock:** progress and mastery derive from server-verified evidence.
4. **Every skill is practiced:** practice may be code, configuration, simulation, diagnosis, design, oral defense, or an artifact—not necessarily a code lab.
5. **Labs fail closed:** deterministic checks, hidden tests, isolated runtime, resource limits, and no client-trusted pass signal.
6. **Sources are first-class:** technical claims have primary-source provenance, freshness dates, and review ownership.
7. **Novice and expert pedagogy differ:** scaffolding fades as demonstrated competence rises.
8. **Accessibility is a release gate:** WCAG 2.2 AA, keyboard, screen-reader, reduced-motion, captions/transcripts, and usable cognitive load.
9. **Security is a release gate:** auth, billing, user data, code execution, AI grading, and admin boundaries receive explicit security review.
10. **No course-specific platform forks:** a new course maps into the existing engine without requiring bespoke runtime logic.
11. **No fake institutional claims:** “university-grade” may describe the standard; “accredited” is forbidden unless accreditation is actually earned.
12. **No 99 without outcomes:** internal construction cannot substitute for real learner evidence.

## 4. Target learner and flagship product

Initial target: a serious beginner or career-switcher seeking to become an **AI Automation & Cloud Systems Builder**.

Flagship path:

1. Engineering Judgment and Learning How to Learn
2. Programming, Linux, Git, APIs, and Automation Foundations
3. Networking, Systems, and Security Foundations
4. Backend, Databases, and Distributed-System Foundations
5. Cloud, DevOps, Reliability, and Cost Operations
6. Applied AI Engineering: LLM APIs, RAG, agents, evals, safety, and LLMOps
7. Production Capstone: build, deploy, secure, monitor, repair, document, and defend an AI automation system

The flagship may reuse selected units from multiple existing courses. It is a competency path, not necessarily seven new course records.

## 5. Construction dependency graph

```text
Step 1 Canonical truth
  ├── Step 2 Quality/certification harness
  ├── Step 3 Source and freshness system
  ├── Step 4 Secure lab contract
  └── Step 5 Competency/prerequisite graph
             └── Step 6 Placement and adaptive path

Steps 2–6, with Step 4A required before any lab-backed certification
  └── Step 7 Reinforced mastery loop validation
        ├── Step 8 Immutable releases and flagship certification
        ├── Step 9 Commerce and entitlement hardening
        └── Step 10 Production platform gate
                     └── Step 11 Paid founding beta and efficacy proof
                                  └── Step 12 Batch certification and institutional operations
```

Steps 2–5 are logically parallel after Step 1, but file ownership must remain disjoint. Because the current worktree contains extensive untracked user work, execution must first preserve and inventory those files; no reset, clean, or broad checkout is allowed. After the operator approves a scoped baseline snapshot, each implementation step uses a dedicated worktree. “Zero unrelated edits” is measured against that isolated branch, not against the already-dirty root worktree.

## 6. Step-by-step build program

### Step 1 — Establish canonical truth, capability status, and a migration path

**Execution status (2026-08-27):** repository Phase A implemented on local branch `academy/01-canonical-truth`. Canonical snapshot `sha256:874c2f483948e9d0dbead455ca7fd31502895630ad0244733b3cf51add4a6cc3` covers 32 courses / 632 lessons. Read-only live Supabase reconciliation was attempted and returned `TypeError: fetch failed`; runtime publication truth remains explicitly unverified and no database mutation occurred.

**Model tier:** strongest; architecture/data-contract judgment.  
**Depends on:** none.  
**Suggested branch:** `academy/01-canonical-truth`.

**Context brief:** Academy truth is currently split across git authoring files, the 448-row manifest, Supabase, `taxonomy.ts`, `catalog.ts`, `learn-catalog.ts`, design catalog copy, proof boards, and multiple stale plans. Production work cannot proceed while counts, statuses, prices, and architecture disagree.

**Tasks:**

- Inventory all course/lesson/lab/solution/source/catalog/database identities without mutating production.
- Classify each advertised capability as `implemented_learner_visible`, `implemented_partial`, `planned_only`, `stale_documentation`, or `externally_blocked`; attach code, test, route, or proof evidence.
- Define lifecycle states: `draft → structurally_valid → source_verified → expert_reviewed → lab_verified → pilot_ready → published → stale/deprecated`.
- Choose one canonical registry and generate all secondary views from it. Do not introduce a fourth independent authority.
- Implement an adapter/backfill and dual-read transition for the current manifest/database coupling, including a permanent slug-alias policy, mismatch telemetry, cutover criteria, and manifest deprecation date.
- Reconcile 32/632 working content with 23/448 manifest content.
- Migrate `apply-course.ts`, `ingest-career-os.ts`, catalog/stat pages, runtime loaders, and both current audit entry points to registry-derived identities before retiring legacy reads.
- Write an ADR locking the implemented stack: Supabase content/runtime; current lab runtimes; no Payload/WebContainers rewrite without a future ADR.
- Write a pricing/packaging decision record. Until approved, label commerce state `blocked_external_decision`.
- Mark older contradictory documents as historical/superseded without deleting them.
- Regenerate a dated baseline report from the current working tree.

**Verification:**

- Registry counts equal filesystem counts and explicitly explain database differences.
- Every course file maps to exactly one registry row; no duplicate public slug.
- A consistency test fails when any generated catalog/manifest count drifts.
- Compatibility fixtures prove legacy manifest, database, runtime, catalog, and audit consumers resolve the same course/lesson identities throughout dual-read migration.
- `git diff --check` and focused registry tests pass.

**Exit criteria:** one machine-readable registry, one capability-status inventory, one architecture ADR, one pricing-decision placeholder, one current baseline, and a tested cutover/deprecation path. Every public count is derived, never hardcoded independently.

**Rollback:** remove only the new registry/ADR wiring; preserve all existing content and historical documents.

### Step 2 — Build Academy Certification Harness V2

**Model tier:** strongest for rubric/contract; default for implementation.  
**Depends on:** Step 1.  
**Suggested branch:** `academy/02-certification-harness`.

**Local execution status (2026-08-27):** implemented and verified in the isolated
Step 2 worktree. `npm run academy:audit:all` now audits the 32-course/632-lesson
registry corpus and writes the authoritative V2 evidence family under
`docs/evidence/academy/certification-v2/`. The first board reports 19 hard-blocked
courses, 13 courses needing deterministic remediation, 0 eligible courses, and 0
certified courses. All current labs remain `untrusted_current_runtime`. ADR 0003
demotes both prior audit outputs to diagnostics. Step 2 does not satisfy Step 3
source governance, Step 4A controlled lab execution, rendered accessibility or
performance proof, expert review, human review, immutable releases, or live runtime
reconciliation.

**Context brief:** Current gates prove structure but do not provide one honest, current answer for all 32 courses. Existing boards are stale, sample only part of the corpus, or leave labs/visual/UX dimensions pending.

**Tasks:**

- Decide which current audit core—`scripts/academy/quality/harness.mjs` or `scripts/academy/quality/audit-courses.ts`—survives as the authority. Adapt or retire the other with documented compatibility boundaries; do not add a third scoring authority.
- Add one `academy:audit:all` orchestrator that evaluates each canonical course independently.
- Combine schema, loop arc, duplication/template, lab, source, assessment, metadata, accessibility, links/assets, and substantive-review results.
- Separate deterministic scores from human/judge scores; never substitute one for the other.
- Emit versioned per-lesson, per-course, path, and Academy rollups with timestamps and tool versions.
- Track bounded/sampled checks explicitly.
- Add a known-good and known-bad fixture to prove hard-fail behavior.
- Make H1 fabricated/unsupported claim, H2 failing lab, H3 broken media, H4 serious accessibility issue, and H5 dead reference non-buy-downable.
- Until Step 4A passes, emit `lab_trust: untrusted_current_runtime`; exclude that evidence from lab points, mastery, and certification even if legacy checks report success.

**Verification:**

- New harness correctly fails the known-bad fixture and passes the known-good fixture.
- It audits all canonical course bundles without treating the aggregate directory as one course.
- Re-running unchanged content is deterministic apart from timestamps.
- `npm run typecheck`, focused unit tests, and harness self-tests pass.

**Exit criteria:** a single command produces the authoritative, honest Academy quality board; no course can appear certified with pending hard-fail dimensions or untrusted lab evidence.

**Rollback:** preserve prior boards; remove only V2 runner and generated V2 artifacts.

### Step 3 — Implement claim provenance, source ledgers, and freshness governance

**Model tier:** strongest; technical correctness and research.  
**Depends on:** Step 1.  
**Suggested branch:** `academy/03-source-governance`.

**Context brief:** Standards attribution was previously error-prone, and only a few courses have evidence ledgers. University-grade content needs claim-level primary sources, subject-matter review, and an update policy.

**Tasks:**

- Define per-course source-ledger schema: claim ID, lesson/block, claim text, primary source, retrieval date, source tier, verdict, reviewer, freshness class, and next review date.
- Import the three existing evidence ledgers and standards-claim fixes.
- Route volatile claims—cloud APIs, AI models, security standards, pricing/specs—to short review intervals.
- Add citation resolution and dead-link/freshness gates.
- Add expert-review sign-off and conflict/uncertainty fields.
- Prohibit rhetorical authority name-dropping without a directly supported claim.

**Verification:**

- A fixture with a fabricated citation hard-fails.
- All flagship-course load-bearing claims resolve to primary sources or are labeled as practitioner judgment.
- Freshness report identifies overdue claims deterministically.

**Exit criteria:** every flagship course has a complete source ledger and zero unresolved load-bearing claims; the remaining corpus has an explicit coverage backlog.

**Rollback:** source ledgers are additive; removing enforcement must not alter lesson content.

### Step 4 — Make lab evidence trustworthy, then expand lab types

**Model tier:** strongest; security/code-execution architecture.  
**Depends on:** Step 1.  
**Suggested branch:** `academy/04-secure-labs`.

**Context brief:** Labs are the Academy's main proof mechanism. Current code paths can treat client-produced stdout containing an expected substring as verified evidence. That is not a certification boundary. Secure the existing runtimes first; future networking/cloud simulations cannot delay this correction.

#### Step 4A — Harden current Python, JavaScript, SQL, and shell proof paths

**Tasks:**

- Reconcile every current lab block, solution, runtime, check, hidden test, and orphan solution.
- Define a common lab contract: starter, goal, runtime version, resource limits, allowed capabilities, deterministic visible check, hidden checks, reference solution, reset behavior, hints, artifact output, and accessibility metadata.
- Replace substring/client-output verification with an authoritative evaluator that receives the submitted work, runs private checks in a controlled environment, and writes evidence only from the server-owned result.
- Keep checks/solutions server-side or build-time private; never trust client completion, claimed stdout, or browser state.
- Harden runtimes: no network by default, CPU/time/memory/filesystem limits, clean state per run, pinned versions, sanitized output, and audit logs.
- Require a security review for code execution, auth, AI grading, and evidence writes.

**Verification:**

- Every flagship lab executes against its reference solution and hidden negative fixtures.
- Infinite loops, filesystem escape, network access, oversized output, and forged pass signals are denied.
- Keyboard/screen-reader flow and mobile fallback pass.
- `npm audit --omit=dev` findings are reviewed; relevant security tests pass.

**Exit criteria:** 100% of flagship labs verified; zero unexplained orphan solutions; runtime threat model and incident procedure approved; failed labs route to repair rather than dead-end.

**Rollback:** runtime changes remain behind feature flags; the existing verifier may remain for non-certifying practice feedback until parity proof passes, but it cannot write mastery or certification evidence.

#### Step 4B — Design and prove non-code and simulation lab classes

**Depends on:** Step 4A for any evidence that contributes to mastery or certification.

**Tasks:**

- Add governed lab contracts for configuration, packet/network simulation, cloud/IaC planning, incident diagnosis, threat modeling, oral defense, and artifact review.
- Define which results are deterministic, AI-assisted, peer-reviewed, or human-reviewed and the maximum mastery weight each evidence class may carry.
- Add tamper-resistant artifact storage, reviewer identity, rubric version, appeal/regrade, and expiration rules where human judgment is involved.

**Verification:**

- One positive and multiple adversarial fixtures pass/fail correctly for every enabled lab class.
- AI or human-review outages degrade to pending review, never automatic pass.
- Simulation evidence can be replayed against a pinned scenario and rubric version.

**Exit criteria:** every enabled lab class has a threat model, evaluator contract, evidence weight, accessibility behavior, and reproducible proof. Planned lab classes remain explicitly non-certifying until then.

**Rollback:** new lab classes remain feature-flagged and cannot affect existing mastery calculations until their contracts pass review.

### Step 5 — Build the competency and prerequisite graph

**Model tier:** strongest; curriculum architecture.  
**Depends on:** Step 1.  
**Suggested branch:** `academy/05-competency-graph`.

**Context brief:** Thirty-two courses are broad, but breadth does not prove a complete beginner-to-expert route. Course levels and lesson ordering must derive from explicit competencies and prerequisite evidence.

**Tasks:**

- Define competencies across learning-how-to-learn, programming, automation, Linux, networking, cloud, data, backend, frontend, security, reliability, AI, product, communication, and ethics.
- Map every lesson to `teaches`, `practices`, `assesses`, and `requires` competencies.
- Detect gaps, duplication, circular prerequisites, abrupt difficulty jumps, and dead-end skills.
- Define novice, practitioner, advanced, and expert-trajectory performance standards.
- Map the flagship path without creating duplicate courses.
- Align program/course/unit outcomes to direct assessments and artifacts.

**Verification:**

- Graph is acyclic where prerequisites must be strict.
- Every flagship outcome has at least one direct assessment and one authentic proof artifact.
- A complete beginner has a valid route with no undeclared prerequisite.
- Advanced claims require transfer/capstone evidence, not quiz-only evidence.

**Exit criteria:** canonical competency graph, flagship route, curriculum gap report, and a rule that new courses require a proven graph gap or market need.

**Rollback:** graph is additive; existing course order remains available behind the prior route strategy.

### Step 6 — Placement, personalization, and scaffold fading

**Model tier:** strongest for assessment validity; default for UI.  
**Depends on:** Step 5.  
**Suggested branch:** `academy/06-placement-paths`.

**Context brief:** A beginner and experienced engineer should not receive identical explanation density or practice. The Academy needs honest diagnosis and routes, not a self-selected “beginner/intermediate/advanced” dropdown.

**Tasks:**

- Build diagnostic placement across prerequisite competencies using low-stakes questions and performance tasks.
- Capture confidence before answers to measure calibration.
- Generate a recommended route with transparent reasoning and manual override.
- Run placement in shadow/recommendation mode first; record what the learner chooses and how both suggested and chosen routes perform before enabling any hard prerequisite gate.
- Implement scaffold levels: modeled → guided → hinted → independent → adversarial.
- Add re-placement after demonstrated progress and a disengagement-recovery path.
- Teach the five-beat learning method explicitly in Course 00.

**Verification:**

- No answer keys leave the server.
- Known novice/expert fixtures receive sensible routes.
- Placement cannot permanently lock a learner out; override and repair paths exist.
- Manual-review samples measure harmful misroutes, false prerequisite gaps, override rate/reason, and time-to-first-proof by placement bucket.
- Hard placement enforcement remains disabled until an approved validity threshold is stable across representative learners.
- Accessibility and E2E journeys pass on desktop/mobile.

**Exit criteria:** a new learner reaches an appropriate first meaningful task, understands why, and can earn a first verified proof without a dead end.

**Rollback:** personalization is recommendation-only behind a feature flag until validated; catalog remains browsable.

### Step 7 — Validate the reinforced mastery loop as product behavior

**Model tier:** strongest; learning/evidence contract.  
**Depends on:** Steps 2, 5, and 6.  
**Suggested branch:** `academy/07-mastery-loop`.

**Context brief:** Pretests, quizzes, spaced-review blocks, FSRS, evidence events, score caps, repair, teach-back, and mastery maps exist. The gap is proving they form one closed loop and measure durable transfer rather than activity.

**Tasks:**

- Reconcile the 16/17-step naming and lock one canonical five-beat/underlying-stage contract.
- Verify each evidence event has a trustworthy producer and cannot be client-forged.
- Ensure review cards are actually created, scheduled, surfaced, graded, and rescheduled.
- Add interleaved cross-course review and varied near/far transfer tasks.
- Validate AI tutor behavior: hint before answer, lesson-grounded, injection-resistant, uncertainty-aware, and dependency-reducing.
- Add oral defense/teach-back rubrics and a human-review escalation path.
- Instrument beat-level drop-off, time-to-first-proof, repair success, calibration, retention, mastery gain, and proof completion.

**Verification:**

- E2E proves: diagnose → attempt → fail → feedback → repair → verify → schedule review → recall later → transfer → unlock.
- Forged evidence and skipped stages cannot produce mastery.
- The system shows `collecting` rather than efficacy claims below minimum data thresholds.
- Unit, enforcement E2E, and security review pass.

**Exit criteria:** one reference course runs the complete reinforced loop with inspectable evidence, and each mastery label explains what was actually demonstrated.

**Rollback:** event schema changes are additive/backward-compatible; new scheduler behavior is feature-flagged.

### Step 8 — Version course releases, then certify the flagship path

**Model tier:** strongest for course judgment; default for mechanical fixes.  
**Depends on:** Steps 2–7.  
**Suggested branch family:** `academy/08-flagship-<course>`.

**Context brief:** The Academy should earn revenue from one complete transformation before claiming all 32 courses are world-class. Certification must refer to immutable content: current draft/published rows are mutable, so evidence and credentials cannot remain reproducible without release snapshots.

#### Step 8A — Add immutable course and lesson releases

**Tasks:**

- Define immutable `course_release`, `lesson_release`, assessment/rubric, lab-runtime, and source-ledger snapshot identities.
- Attach release IDs to enrollments, attempts, evidence events, mastery calculations, capstones, certificates, analytics, and audit artifacts.
- Preserve learner access to the release they started while allowing an explicit migration path to a newer release.
- Define release withdrawal, certificate revocation/correction, stale-source withdrawal, supersession, and audit-history policies.
- Prevent in-place mutation of a certified release; edits create a new draft release and require re-certification of affected dimensions.

**Verification:**

- A historical certificate resolves the exact lesson, assessment, rubric, lab runtime, and sources used when it was earned.
- Publishing a new release does not rewrite historical evidence or change old metrics.
- Withdrawal/revocation updates trust state without deleting learner work or the audit trail.

**Exit criteria:** paid-beta content has immutable release IDs, reproducible certification artifacts, and tested supersession/withdrawal behavior.

#### Step 8B — Certify the flagship beginner-to-production path

**Tasks:**

- Select existing courses/units that form the flagship path.
- For every included unit: correct metadata, sources, mental model, worked example, practice, failure case, tradeoff, assessment, transfer, review, and proof.
- Execute all labs and repair shallow/hardcoded exercises.
- Add domain-spanning capstones with production constraints and reviewer rubrics.
- Run expert review and operator sample sign-off per course.
- Mark only certified release IDs as included in the paid flagship promise.

**Verification:**

- Certification Harness V2: zero hard-fails and all required dimensions complete against immutable release IDs.
- Step 4A lab trust gate passes for every lab-backed claim.
- Full learner journey passes at mobile and desktop breakpoints.
- Two adversarial reviewers find no open critical/high issue.
- Operator signs the worst passing sample and capstone.

**Exit criteria:** one coherent, versioned flagship release is honestly sellable, every promised lab works, and the graduate proof packet is reproducible and inspectable by an employer/client.

**Rollback:** certification status can be withdrawn without deleting content; uncertified courses remain preview/building.

### Step 9 — Harden commerce, entitlements, support, and trust

**Model tier:** strongest; payments/auth/user-data production work.  
**Depends on:** Step 1; can run parallel to Step 8 after pricing ADR approval.  
**Suggested branch:** `academy/09-commerce-production`.

**Context brief:** Checkout code exists, but repository documents disagree on packaging/pricing and production credentials are externally controlled. Paid launch requires a complete subscription lifecycle and honest access behavior.

**Tasks:**

- Approve one packaging/pricing model and canonical Stripe account.
- Verify checkout, webhook idempotency/signature, entitlements, grace/past-due, cancel-at-period-end, immediate cancellation policy, refunds, portal, receipts, exports, and deletion/privacy requests.
- Eliminate copy/price drift by deriving product copy from canonical plan data.
- Add support runbooks, refund/cancellation policy, status messaging, and audit logs.
- Run mandatory security review for auth, payments, and user data.

**Verification:**

- Test-mode purchase → access → progress → portal cancel → correct revocation passes.
- Duplicate/reordered webhooks do not duplicate or corrupt entitlement.
- Unauthorized users cannot read another learner's data or gain access.
- `verify:academy-commerce`, focused E2E, RLS tests, audit review, and diff review pass.

**Exit criteria:** the Academy can accept a test payment and honor the full lifecycle without manual database intervention. Live mode remains approval-gated.

**Rollback:** keep paywall/commerce behind configuration; never change live Stripe objects during implementation without approval.

### Step 10 — Close the production platform gate

**Model tier:** strongest for security/reliability; default for fixes.  
**Depends on:** Steps 7–9.  
**Suggested branch:** `academy/10-production-gate`.

**Context brief:** Production-grade means the whole service operates safely—not just lessons rendering correctly.

**Tasks:**

- Complete WCAG 2.2 AA review, keyboard/screen-reader journeys, captions/transcripts, reduced motion, target sizes, and accessible authentication.
- Establish performance budgets for landing, catalog, lesson, lab, review, dashboard, and checkout.
- Configure durable rate limiting, error tracking, cron heartbeat/alerts, structured logs, backup/restore proof, and incident runbooks.
- Verify certificate revocation and print/export; remove any fake trust state.
- Validate privacy/security boundaries, AI safety, dependency risks, email deliverability, SEO, offline/error/loading/empty states, and browser/device support.
- Run dependency audit and mandatory security review on sensitive surfaces.

**Verification:**

- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- Academy E2E and accessibility suites
- Lighthouse/CWV budgets in production serve
- RLS/security tests and dependency review
- Backup restore drill and monitoring test
- Final `git diff` review with zero edits unrelated to the slice in its dedicated worktree

**Exit criteria:** zero P0/P1 findings, zero serious/critical accessibility findings, no unowned alert/runbook gap, and all launch journeys green on a production-like environment.

**Rollback:** observability/rate-limit changes use reversible configuration; schema changes must be additive with tested down/forward recovery.

### Step 11 — Run a paid founding beta and earn efficacy evidence

**Model tier:** strongest for analysis/research; default for dashboard work.  
**Depends on:** Steps 8–10.  
**Suggested branch:** `academy/11-beta-efficacy`.

**Context brief:** The final quality points cannot be built internally. They require real learners, artifact review, retention data, support experience, and observed failures.

**Tasks:**

- Launch only after explicit approval as a clearly labeled founding beta.
- Define cohort eligibility, support level, refund policy, consent/privacy, and success criteria.
- Measure activation, time-to-first-proof, beat drop-off, lab pass/repair, D1/D7/D30 return, due-review completion, pre/post gain, course completion, artifact quality, refund/cancel reasons, and support burden, all keyed to immutable course/path release IDs.
- Conduct learner interviews and independent capstone reviews.
- Publish only aggregated, privacy-safe efficacy results with sample size and caveats.
- Feed findings into content, UX, and mastery corrections.

**Verification:**

- Analytics events reconcile to user journeys without PII leakage.
- Efficacy math passes sanity/null/aggregation checks.
- No experiment claims a winner below its declared sample threshold.
- Every high-severity learner failure becomes a tracked remediation with verification.

**Exit criteria:** flagship learners complete real proofs; the team understands where learners fail and recover; efficacy claims are evidence-backed; public-launch decision is informed rather than assumed.

**Rollback:** beta remains cohort-gated; suspend new enrollment without removing learner access or data.

### Step 12 — Certify all 32 courses and establish institutional operations

**Model tier:** strongest for course/expert reviews; default for mechanical batches.  
**Depends on:** Step 11.  
**Suggested branch family:** `academy/12-certify-<batch>`.

**Context brief:** Only after the flagship and platform are proven should the Academy scale breadth. World-class quality is an ongoing institution, not a one-time content batch.

**Tasks:**

- Rank remaining courses by prerequisite value, learner demand, strategic differentiation, and remediation cost.
- Certify in small batches; never mix course fixes with platform rewrites.
- Establish academic governance: course owner, domain expert, instructional reviewer, accessibility reviewer, source freshness owner, revision history, and annual/volatile review cadence.
- Add external advisory review and capstone moderation.
- Maintain public program outcomes, course outcomes, syllabi, prerequisites, assessment rubrics, workload estimates, and versioned credentials.
- Add new courses only when the competency/market graph proves a gap.
- Evaluate formal accreditation only as a separate business/institutional program.

**Verification:**

- Every published course has a current certification artifact and zero hard-fails.
- Catalog counts equal certified/published registry state.
- Scheduled freshness checks create actionable work and can withdraw stale certification.
- Quarterly continuous-improvement review links learner evidence to completed changes.

**Exit criteria:** all marketed courses are certified, current, accessible, executable where appropriate, and governed; the Academy can add a course without changing the runtime.

**Rollback:** certification and publication are reversible status changes; never delete learner evidence or historical course versions.

## 7. Paid-beta launch gate

The founding beta may open only when all are true:

- Canonical registry and pricing/package decision approved.
- Flagship path certified; no uncertified course is included in the promise.
- 100% of flagship labs verified; no client-forgeable completion.
- Landing → checkout → entitlement → onboarding → lesson → lab → repair → review → proof → cancel/support journey passes.
- Zero P0/P1 security, privacy, billing, accessibility, or data-integrity finding.
- Monitoring, rate limiting, backups, support, refund/cancel, and incident handling are operational.
- Analytics measure first proof, retention, mastery, artifacts, and support without leaking PII.
- Explicit approval is given for live Stripe configuration, deployment, and enrollment opening.

## 8. Public/world-class launch gate

Public “world-class” positioning requires, in addition:

- A completed founding beta with honest outcome evidence.
- Independent expert review of flagship content and capstones.
- Demonstrated delayed retention and transfer—not only course completion.
- Published methodology, source/freshness policy, assessment approach, accessibility commitment, and evidence caveats.
- Stable production operations across at least one real learner cohort.
- No claim of accreditation unless separately earned.

## 9. Anti-pattern catalog

- Adding courses to solve a pathway/quality problem.
- Rewriting the LMS before proving a missing platform capability.
- Making every lesson identical to satisfy a schema.
- Counting a quiz as proof of production competence.
- Treating AI tutor output as authoritative or letting it complete work for the learner.
- Gamification that rewards clicks, time, or easy repetition instead of evidence.
- Calling a lab verified because the reference solution prints the expected string.
- Shipping code execution without isolation, limits, hidden tests, or incident response.
- Hardcoding catalog/course/lesson counts in multiple files.
- Claiming 99 from internal scores without learners.
- Publishing all 32 courses when only a flagship subset has passed current gates.
- Letting stale plans remain apparently canonical.
- Changing auth/payments/user-data logic without security review.
- Pushing, deploying, changing credentials, or mutating third-party services without approval.

## 10. Plan mutation protocol

- **Split:** split a step when it cannot be implemented and fully verified in one reviewable change. Preserve the parent objective and add explicit dependency edges.
- **Insert:** insert urgent work only when it closes a discovered prerequisite, P0/P1 risk, or external blocker. Record why it was not known earlier.
- **Reorder:** reorder only when dependencies remain valid and the change reduces risk or unlocks evidence sooner.
- **Skip:** skip only with an operator-approved written rationale and explicit impact on launch claims.
- **Abandon:** abandon a technical approach through an ADR that preserves evidence, migration/rollback consequences, and the replacement decision.
- **Block:** after three evidence-backed failed attempts, mark the step blocked with the exact condition needed; do not weaken the gate.

## 11. Execution reporting contract

Every implementation slice reports:

1. Objective and files owned.
2. Before-state evidence.
3. Tests written first when behavior changes.
4. What changed.
5. Focused verification and broader gates.
6. Security/accessibility review when applicable.
7. Diff review and unrelated-work preservation.
8. Proof artifact links.
9. Remaining risks, blocked external decisions, and next dependency-ready step.

“Done” means the relevant command output, browser proof, review evidence, and rollback path exist. A green narrative without proof is not completion.
