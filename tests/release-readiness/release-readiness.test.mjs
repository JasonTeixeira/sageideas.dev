import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { auditReleaseReadiness } from '../../lib/release-readiness/contract.mjs'

const fixture = (name) => JSON.parse(readFileSync(`tests/release-readiness/fixtures/${name}.json`, 'utf8'))

test('known-good release manifest and handoff contract passes', () => {
  assert.deepEqual(auditReleaseReadiness(fixture('known-good')), [])
})

test('deliberately broken release fixture is rejected without averaging blockers away', () => {
  const codes = new Set(auditReleaseReadiness(fixture('known-broken')).map((finding) => finding.code))
  for (const code of [
    'script_missing',
    'program_version_mismatch',
    'release_identity_invalid',
    'inventory_mismatch',
    'observation_failure',
    'dependency_vulnerability',
    'checkpoint_reconciliation_failed',
    'evidence_hash_missing',
    'runtime_secret_value_present',
    'academy_certification_fabricated',
    'lab_trust_fabricated',
    'release_status_invalid',
    'rollback_contract_missing',
    'external_boundary_missing',
    'handoff_incomplete',
  ]) assert.ok(codes.has(code), `expected broken fixture finding: ${code}`)
})

test('the release gate revalidates the manifest, evidence hashes, and ancestry locally', () => {
  const cli = readFileSync('tools/project-program/cli.mjs', 'utf8')
  const writer = readFileSync('tools/release-readiness/write-manifest.mjs', 'utf8')
  assert.match(cli, /auditReleaseReadiness/)
  assert.match(cli, /release evidence hash mismatch/)
  assert.match(cli, /merge-base[\s\S]*--is-ancestor/)
  assert.match(cli, /releaseAudit\.status !== 'pass'/)
  assert.match(writer, /externalMutationPerformed:\s*false/)
  assert.match(writer, /runtimeRequirements/)
  assert.doesNotMatch(writer, /\.env\.local|process\.env\[[^\]]+\]/)
})
