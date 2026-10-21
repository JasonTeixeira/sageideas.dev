# Academy Program Scorecard

This human-readable ledger mirrors `docs/evidence/academy/program-loop/state.json`. The machine-readable state is
the execution authority; Certification Harness V2 remains the certification-readiness authority.

## Current checkpoint

- Progress: **32/32 local GREEN curriculum checkpoints**.
- Registry: `sha256:fbcfb4642f5f5239fa36e072fc24f3a9cbe19afc03b43261bbc863222edce828`.
- Catalog: 32 courses, 640 lessons, 640 lab blocks, 640 aligned references, and 32 source ledgers.
- Current phase: complete.
- Next course: none; the Academy-wide deterministic closure audit is GREEN.
- Certification: 0 courses certified; lab evidence remains practice-only.

## Academy-wide closure result

- Every course has a local GREEN curriculum checkpoint; the deterministic score floor is 90 and the mean is 98.37.
- All 640 lab lessons have aligned references; no lab-reference gaps remain.
- All 32 courses have source ledgers; the seven added foundation ledgers contain 73 unique reachable URLs.
- Academy tests pass 210/210, typecheck passes, registry verification passes, and the production build emits 407 pages.
- H1/H3/H4/H5 are zero. The 640 H2 flags are intentional: every lab remains `untrusted_current_runtime` and cannot create mastery evidence.
- Expert correctness, pedagogy, source, accessibility, visual, UX, performance, consistency, media, learner-outcome,
  immutable-release, and governance evidence remain outside deterministic local completion.

## Proven foundation checkpoints

| Course | Local curriculum checkpoint | Certification |
|---|---|---|
| `career-engineering_judgment_foundation` | GREEN | uncertified |
| `programming-fundamentals` | GREEN | uncertified |
| `python-basics` | GREEN | uncertified |
| `git-the-terminal` | GREEN | uncertified |
| `data-structures` | GREEN | uncertified |
| `career-programming_cs_foundations` | GREEN | uncertified |
| `career-networking_fundamentals_advanced_networking` | GREEN | uncertified |
| `career-security_identity` | GREEN | uncertified |
| `career-databases_data_modeling` | GREEN | uncertified |
| `career-backend_engineering` | GREEN | uncertified |
| `system-design` | GREEN | uncertified |
| `career-cloud_devops_operations` | GREEN | uncertified |
| `career-observability_reliability_performance` | GREEN | uncertified |
| `career-platform_engineering_internal_developer_platforms` | GREEN | uncertified |
| `the-llm-api` | GREEN | uncertified |
| `prompt-engineering` | GREEN | uncertified |
| `rag-retrieval` | GREEN | uncertified |
| `agents-tool-use` | GREEN | uncertified |
| `career-ai_engineering_rag_eval` | GREEN | uncertified |
| `career-product_execution_market_feedback` | GREEN | uncertified |
| `career-concept_maps_real_world_engineering` | GREEN | uncertified |
| `career-frontend_fullstack` | GREEN | uncertified |
| `career-architecture_system_design` | GREEN | uncertified |
| `career-mobile_engineering_deep_dive` | GREEN | uncertified |
| `career-qa_sdet_test_automation_engineering` | GREEN | uncertified |
| `career-ux_ui_product_design_for_engineers` | GREEN | uncertified |
| `career-data_engineering_analytics` | GREEN | uncertified |
| `career-enterprise_it_saas_admin_business_systems` | GREEN | uncertified |
| `nextjs-supabase` | GREEN | uncertified |
| `stripe-auth` | GREEN | uncertified |
| `career-interview_career_portfolio` | GREEN | uncertified |
| `career-engineering_leadership_staff_execution` | GREEN | uncertified |

The imported foundation checkpoint is reachable at commit `9d4d71ee`. It proves the local curriculum contract,
not controlled lab trust, expert review, human appeal, or certification.

## Sequential waves

| Wave | Courses | Status |
|---|---:|---|
| Learning judgment and automation foundations | 6 | local GREEN |
| Networking and security | 2 | local GREEN |
| Data, backend, and system design | 3 | local GREEN |
| Cloud operations and platform reliability | 3 | local GREEN |
| Applied AI, retrieval, agents, and evaluation | 5 | local GREEN |
| Production integration | 1 unique graph course | local GREEN |
| Registry courses outside the flagship graph | 12 | all 12 local GREEN |

`system-design` appears in two graph phases but only once in the 32-course execution queue.

## Networking checkpoint result

- 20 lessons.
- Deterministic score: 77.8 → 88.9 (not a composite quality score).
- Complete mastery-loop sections and novice-scaffolded deterministic practice now cover all 20 lessons.
- All 20 reference implementations pass exact output contracts; the final incident runbook is a capstone.
- H1/H3/H4/H5 remain zero. The 20 H2 flags preserve the correct untrusted-runtime boundary.
- Required expert/human evidence remains pending for correctness, pedagogy, sources, accessibility, visual quality,
  UX, performance, and consistency.

## Security checkpoint result

- 20 lessons.
- Deterministic score: 88.9 → 100 (not a composite quality score).
- Complete evidence-first mastery loops and novice-scaffolded deterministic practice now cover all 20 lessons.
- All 20 reference implementations pass exact output contracts; the multi-tenant export defense remains a capstone.
- The 26-source authoritative ledger remains intact. H1/H3/H4/H5 are zero; 20 H2 flags preserve the untrusted-runtime boundary.
- Required expert/human evidence remains pending for correctness, pedagogy, sources, accessibility, visual quality,
  UX, performance, and consistency.

## Databases checkpoint result

- 20 lessons in the canonical registry.
- Deterministic score: 77.8 → 98.3 (not a composite quality score).
- All 20 original SQL labs remain intact; all references now execute in the declared SQL runtime and match exact output.
- Complete mastery loops, two capstones, a 16-source official ledger, and explicit graph mappings cover all lessons.
- H1/H3/H4/H5 are zero; 20 H2 flags keep lab evidence practice-only and required expert reviews remain pending.

## Backend checkpoint result

- 20 lessons in the canonical registry; deterministic score: 88.9 → 100 (not a composite quality score).
- All 20 Python references now match their exact observable contracts; ten substring-era reference drifts were repaired.
- Complete ordered mastery loops, two production slices, the 13-source ledger, and explicit graph mappings cover every lesson.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only lab evidence and required expert reviews remain pending.

## System Design checkpoint result

- 24 lessons in the canonical registry; deterministic score: 80 → 90 (not a composite quality score).
- All 24 JavaScript references match exact observable contracts; two missing references were repaired.
- Calibrated mastery loops, a deep integration, multi-day defense, 16-source ledger, and two graph mappings cover every lesson.
- H1/H3/H4/H5 are zero; 24 H2 flags preserve practice-only lab evidence. All 159 transcript-bearing hosted narration assets remain blocked because reachability could not be proven.

## Cloud/DevOps checkpoint result

- 20 lessons in the canonical registry; deterministic score: 77.8 → 100 (not a composite quality score).
- All 20 production evaluators are now novice-scaffolded Python labs and match their exact observable contracts.
- Ordered mastery loops, realistic pacing, a multi-day operations capstone, 18-source ledger, and explicit graph mapping cover every lesson.
- H1/H3/H4/H5 are zero; 20 H2 flags correctly keep the new labs practice-only and required expert reviews remain pending.

## Observability/Reliability checkpoint result

- 20 lessons in the canonical registry; deterministic score: 77.8 → 100 (not a composite quality score).
- All 20 telemetry and incident evaluators are novice-scaffolded Python labs and match exact observable contracts.
- Ordered mastery loops, realistic pacing, a multi-day observability capstone, 17-source ledger, and explicit graph mapping cover every lesson.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only lab evidence and required expert reviews remain pending.

## Platform Engineering checkpoint result

- 20 lessons in the canonical registry; deterministic score: 77.8 → 100 (not a composite quality score).
- All 20 platform evaluators are novice-scaffolded Python labs and match their exact observable contracts.
- Ordered mastery loops, realistic pacing, a multi-day platform roadmap capstone, an 18-source first-party ledger, and explicit graph mapping cover every lesson.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only lab evidence and required expert reviews remain pending.

## LLM API checkpoint result

- 20 lessons in the canonical registry; deterministic score: 70 → 100 (not a composite quality score).
- All 20 JavaScript references now match exact observable contracts; seven missing references and thirteen stale contracts were repaired.
- Ordered mastery loops, a multi-day resilient-client capstone, an 18-source first-party ledger, and explicit graph mapping cover every lesson.
- All 143 narration transcripts remain, while 143 nonexistent local audio promises were removed; H5 is now zero.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only lab evidence and required expert reviews remain pending.

## Prompt Engineering checkpoint result

- 20 lessons; deterministic score 80 → 100. All 20 JavaScript references match exact contracts; nine missing references and one formatting drift were repaired.
- The multi-day injection-resistant capstone, 16-source ledger, and graph mapping cover every lesson; all 146 narration transcripts remain and false audio promises were removed.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## RAG Retrieval checkpoint result

- 20 lessons; deterministic score 80 → 100. All 20 JavaScript references match exact observable contracts; nine missing references were added.
- The multi-day grounded-and-cited RAG capstone, 18-source primary ledger, and retrieval competency mapping cover every lesson.
- All 140 narration transcripts remain while 140 nonexistent local audio promises were removed.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Agents & Tool Use checkpoint result

- 20 lessons; deterministic score 80 → 100. All 20 JavaScript references match exact observable contracts; three missing references were added.
- The multi-day bounded and guardrailed agent capstone, 20-source primary ledger, and agent-automation mapping cover every lesson.
- All 140 narration transcripts remain while 140 nonexistent local audio promises were removed.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## AI Engineering, RAG & Evals checkpoint result

- 20 lessons; deterministic score 88.9 → 100. All 20 Python references now match exact observable contracts; 13 stale published checks were reconciled.
- Complete calibrated evidence loops, deep agent-control practice, two multi-day capstones, an 18-source primary ledger, and three explicit competency mappings cover every lesson.
- All 148 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Product Execution checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python product-decision references match their exact observable contracts.
- Complete novice-to-production mastery loops, deep experiment design, a multi-day product capstone, a 20-source primary ledger, and the production-integration mapping cover every lesson.
- All 154 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Concept Maps checkpoint result

- 30 lessons; deterministic score 77.8 → 100. All 30 Python map-backed engineering references match their exact observable contracts.
- Complete build-debug-defend mastery loops, three deep review drills, eight multi-day defenses, and a 20-source primary ledger cover every lesson.
- All 217 honest narration transcripts remain. H1/H3/H4/H5 are zero; 30 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Frontend and Full-Stack checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 JavaScript references match their exact observable contracts.
- Complete novice-to-production mastery loops, three deep production drills, a multi-day deployment capstone, a 20-source primary ledger, and explicit competency mappings cover every lesson.
- All 145 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Architecture and System Design checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python architecture references match their exact observable contracts.
- Complete constraint-to-decision mastery loops, six deep architecture reviews, two multi-day capstones, a 20-source primary ledger, and 20 novice-scaffolded evidence labs cover every lesson.
- All 149 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Mobile Engineering checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python mobile-state references match their exact observable contracts.
- Complete device-to-production mastery loops, seven deep reliability/security/accessibility/release drills, a multi-day incident capstone, a 20-source first-party ledger, and 20 novice-scaffolded labs cover every lesson.
- All 149 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## QA/SDET checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 original Python test-engineering references match their exact observable contracts.
- Complete risk-to-release mastery loops, eight deep browser/nonfunctional/CI/flake drills, a multi-day quality-review capstone, and a 20-source primary ledger cover every lesson.
- All 150 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## UX/UI Product Design checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python design-decision references match their exact observable contracts.
- Complete problem-to-evidence mastery loops, nine deep workflow/system/accessibility/research/handoff drills, a multi-day review packet, and a 20-source primary ledger cover every lesson.
- All 147 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required human, visual, accessibility, and expert reviews remain pending.

## Data Engineering checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 original Python data-product references match their exact observable contracts.
- Complete source-to-trusted-product mastery loops, nine deep orchestration/correctness/recovery/streaming/governance/incident drills, a multi-day capstone, and a 20-source primary ledger cover every lesson.
- H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Enterprise IT and SaaS Administration checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python enterprise-control references match their exact observable contracts.
- Complete system-of-record-to-audit mastery loops, ten deep identity/lifecycle/change/integration/evidence/incident drills, a multi-day operating review, and a 20-source primary ledger cover every lesson.
- One orphan reference was removed and 20 practical labs were aligned to canonical lessons. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required expert reviews remain pending.

## Next.js and Supabase checkpoint result

- 20 lessons; deterministic score 79.5 → 90. All 20 JavaScript references match their exact observable contracts, reducing missing-reference H2 findings from 40 to 20.
- Complete application-boundary mastery loops, ten deep security/consistency/deployment drills, a multi-day RLS CRUD capstone, and a 20-source first-party ledger cover every lesson.
- All 143 narration transcripts and media URLs remain. Media integrity is honestly pending; lab evidence remains practice-only and certification remains blocked.

## Stripe and Authentication checkpoint result

- 20 lessons; deterministic score 80 → 90. All 20 JavaScript references match their exact observable contracts; six missing references were added.
- Complete identity-to-payment mastery loops, 13 deep security and billing drills, a multi-day signup-to-entitlement capstone, and a 21-source authoritative ledger cover every lesson.
- Security review updated password examples to the current OWASP PBKDF2-HMAC-SHA256 work factor and enforced constant-time webhook signature comparisons with replay windows.
- All 146 narration transcripts and media URLs remain. Media integrity and required expert review remain pending; 20 H2 flags keep all lab evidence practice-only and certification blocked.

## Interview, Career, and Portfolio checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python career-evidence references match their exact observable contracts.
- The course now carries one coherent proof packet from target-role and market evidence through portfolio, behavioral/technical interviews, application pipeline, negotiation, and feedback repair.
- Ten deep interview and decision drills, two multi-day capstones, 20 novice-scaffolded practice labs, and a 20-source authoritative ledger cover every lesson.
- All 152 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required artifact, mock-interview, outcome, and expert reviews remain pending.

## Engineering Leadership and Staff Execution checkpoint result

- 20 lessons; deterministic score 77.8 → 100. All 20 Python staff-execution references match their exact observable contracts.
- The course now joins scope, ambiguity, influence, architecture decisions, planning, dependencies, risk, mentoring, feedback, conflict, executive communication, incident command, postmortems, and systemic repair into one operating system.
- Twelve deep leadership scenarios, a multi-day operating-cadence capstone, 20 novice-scaffolded practice labs, and a 20-source authoritative ledger cover every lesson.
- All 148 honest narration transcripts remain. H1/H3/H4/H5 are zero; 20 H2 flags preserve practice-only evidence and required stakeholder, organizational-outcome, and expert leadership reviews remain pending.

## Program-loop completion result

- All 32 canonical registry courses have a machine-validated local GREEN curriculum checkpoint.
- The canonical catalog contains 640 lessons and 640 lab blocks; every lab remains `untrusted_current_runtime` and practice-only.
- This closes the autonomous local curriculum-production queue. It does not certify courses, validate hosted media, replace expert review, or activate trusted mastery evidence.

## Advancement rule

The next course is selected only after a scoped commit carries complete GREEN evidence. A numerical improvement
cannot override a hard fail, pending required review, lab trust limitation, or failed build gate.
