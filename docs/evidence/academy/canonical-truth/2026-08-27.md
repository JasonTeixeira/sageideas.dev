# Sage Academy Canonical Truth Baseline

**Observed:** 2026-08-27
**Registry:** `sha256:6d54d95a42e89c796e7e6cd96c26107aaac298374d570bbf6888b20c66f0108a`
**Scope:** repository authoring corpus and checked-in evidence only; live database state was not mutated or asserted.

## Defensible inventory

- 32 registered course bundles
- 632 authored lessons
- 354 lab blocks
- 547 solution entries
- 268 lab lessons with same-slug solutions
- 86 lab lessons without same-slug solutions
- 3 course-level source ledgers
- 0 certified courses

## Known contradictions and launch blockers

- 32 authored course bundles versus 23 courses represented in the legacy manifest
- 632 authored lessons versus 448 lessons represented in the legacy manifest
- 86 lab lessons lack same-slug solution entries
- 29 courses lack course-level source ledgers
- Current lab output-substring evidence is not eligible for mastery or certification
- No course is certified by Academy Certification Harness V2

## Course inventory

| Course | Lessons | Legacy manifest | Labs | Labs missing solutions | Source ledger | Certification |
|---|---:|---:|---:|---:|---|---|
| `career-engineering_judgment_foundation` | 16 | 16 | 8 | 0 | no | uncertified |
| `career-concept_maps_real_world_engineering` | 30 | 30 | 0 | 0 | no | uncertified |
| `programming-fundamentals` | 18 | 18 | 18 | 7 | no | uncertified |
| `career-programming_cs_foundations` | 20 | 20 | 20 | 0 | no | uncertified |
| `python-basics` | 4 | 4 | 4 | 0 | no | uncertified |
| `git-the-terminal` | 20 | 0 | 20 | 20 | no | uncertified |
| `data-structures` | 20 | 0 | 20 | 3 | no | uncertified |
| `career-backend_engineering` | 20 | 20 | 20 | 0 | yes | uncertified |
| `career-frontend_fullstack` | 20 | 20 | 20 | 0 | no | uncertified |
| `career-architecture_system_design` | 20 | 20 | 0 | 0 | no | uncertified |
| `system-design` | 24 | 0 | 24 | 2 | no | uncertified |
| `career-security_identity` | 20 | 20 | 0 | 0 | yes | uncertified |
| `career-mobile_engineering_deep_dive` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-qa_sdet_test_automation_engineering` | 20 | 20 | 20 | 0 | no | uncertified |
| `career-networking_fundamentals_advanced_networking` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-ux_ui_product_design_for_engineers` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-databases_data_modeling` | 20 | 20 | 20 | 0 | no | uncertified |
| `career-data_engineering_analytics` | 20 | 20 | 20 | 0 | no | uncertified |
| `career-ai_engineering_rag_eval` | 20 | 20 | 20 | 0 | yes | uncertified |
| `the-llm-api` | 20 | 0 | 20 | 7 | no | uncertified |
| `prompt-engineering` | 20 | 0 | 20 | 9 | no | uncertified |
| `rag-retrieval` | 20 | 0 | 20 | 9 | no | uncertified |
| `agents-tool-use` | 20 | 0 | 20 | 3 | no | uncertified |
| `career-cloud_devops_operations` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-observability_reliability_performance` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-platform_engineering_internal_developer_platforms` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-enterprise_it_saas_admin_business_systems` | 20 | 20 | 0 | 0 | no | uncertified |
| `nextjs-supabase` | 20 | 0 | 20 | 20 | no | uncertified |
| `stripe-auth` | 20 | 0 | 20 | 6 | no | uncertified |
| `career-interview_career_portfolio` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-product_execution_market_feedback` | 20 | 20 | 0 | 0 | no | uncertified |
| `career-engineering_leadership_staff_execution` | 20 | 20 | 0 | 0 | no | uncertified |

## Authority boundary

- `data/academy/registry.config.json` owns canonical course identity, title, topic, level, lifecycle state, and aliases.
- `data/academy/authoring/*.lessons.json` owns authored lesson content.
- `data/academy/registry.json` is the deterministic generated snapshot consumed by application and audit adapters.
- `data/academy/authoring/manifest.json` is compatibility-only during migration and cannot define a course by itself.
- Supabase is a runtime projection. Publication state must be reconciled read-only before cutover and is not inferred here.
