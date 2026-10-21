# Academy lab evaluator Step 4B readiness

- Generated: 2026-09-05T19:49:40.489Z
- Release: `flagship-labs-2026-09-05.1`
- Registry: `sha256:fbcfb4642f5f5239fa36e072fc24f3a9cbe19afc03b43261bbc863222edce828`
- Candidate labs: 5
- Status: **BLOCKED**
- Private material included: no

| Gate | Result |
| --- | --- |
| manifest_valid | PASS |
| private_pack_valid | BLOCKED |
| isolated_runtime | BLOCKED |
| digest_pinned_images | BLOCKED |
| migrations_applied | BLOCKED |
| managed_runtime_binding | BLOCKED |
| reference_solutions_passed | BLOCKED |
| adversarial_probes_passed | BLOCKED |
| receipts_reconciled | BLOCKED |
| monitoring_ready | BLOCKED |
| kill_switch_ready | BLOCKED |

## Observations

- The reviewed signer, managed-project, and database-project authority pins are not provisioned.
- ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT is not configured.
- No signed activation attestation proves the managed isolated runtime.
- All three runtime images need digest pins or a valid signed activation attestation.
- Staging has not supplied release-bound evidence that migrations 0116 through 0120 are applied.
- The managed Vercel Sandbox project binding is missing, mismatched, or not attested.
- No valid Ed25519 activation attestation proves private references, adversarial probes, and receipt reconciliation.
- Release-bound monitoring and alerting evidence is absent.
- Mastery writes remain disabled by the two-part release kill switch.
