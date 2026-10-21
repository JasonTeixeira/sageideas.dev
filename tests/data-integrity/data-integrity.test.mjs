import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  auditMigrationChain,
  buildMigrationChainHash,
} from '../../tools/data-integrity/core.mjs'

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.resolve(relativePath), 'utf8'))

async function repositoryMigrations() {
  const directory = path.resolve('supabase/migrations')
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  return Promise.all(names.map(async (filename) => ({
    filename,
    sql: await readFile(path.join(directory, filename), 'utf8'),
  })))
}

async function legacyMigrations() {
  const directory = path.resolve('supabase/legacy_migrations')
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
  return Promise.all(names.map(async (filename) => ({
    filename,
    sql: await readFile(path.join(directory, filename), 'utf8'),
  })))
}

async function repositoryFoundationMigrations() {
  const manifest = await readJson('supabase/migration-manifest.json')
  return Promise.all(manifest.baseline.foundationFiles.map(async (filename) => ({
    filename,
    sql: await readFile(path.resolve('supabase', filename), 'utf8'),
  })))
}

test('known-good fixture passes and deliberately broken fixture fails closed', async () => {
  const good = await readJson('tests/data-integrity/fixtures/known-good.json')
  good.manifest.chainHash = buildMigrationChainHash(good.migrations)
  const broken = await readJson('tests/data-integrity/fixtures/deliberately-broken.json')

  assert.equal(auditMigrationChain(good).ok, true)
  const result = auditMigrationChain(broken)
  assert.equal(result.ok, false)
  for (const code of [
    'duplicate_migration_version',
    'migration_sequence_gap',
    'migration_chain_hash_mismatch',
    'created_table_without_rls',
    'security_definer_without_search_path',
    'unapproved_anon_grant',
    'unapproved_destructive_migration',
  ]) {
    assert.ok(result.findings.some((finding) => finding.code === code), code)
  }
})

test('repository migration chain is contiguous, immutable, RLS-covered, and security-definer safe', async () => {
  const migrations = await repositoryMigrations()
  const baselineMigrations = await legacyMigrations()
  const foundationMigrations = await repositoryFoundationMigrations()
  const manifest = await readJson('supabase/migration-manifest.json')
  const result = auditMigrationChain({
    migrations,
    baselineMigrations,
    foundationMigrations,
    manifest,
  })

  assert.deepEqual(result.findings, [])
  assert.equal(result.ok, true)
  assert.equal(result.summary.migrationCount, 117)
  assert.equal(result.summary.baselineFileCount, 14)
  assert.equal(result.summary.foundationFileCount, 2)
  assert.equal(result.summary.schemaFileCount, 133)
  assert.equal(result.summary.incrementalStart, 6)
  assert.equal(result.summary.incrementalEnd, 122)
  assert.equal(result.summary.createdTables, result.summary.rlsEnabledTables)
})

test('legacy baseline is explicit, ordered, and hash-bound instead of being mistaken for migrations 0001-0005', async () => {
  const manifest = await readJson('supabase/migration-manifest.json')
  const legacyNames = (await readdir(path.resolve('supabase/legacy_migrations')))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const legacyMigrations = await Promise.all(legacyNames.map(async (filename) => ({
    filename,
    sql: await readFile(path.resolve('supabase/legacy_migrations', filename), 'utf8'),
  })))

  assert.equal(manifest.baseline.mode, 'legacy_manifest')
  assert.equal(manifest.baseline.requiresLiveReconciliation, true)
  assert.deepEqual([...manifest.baseline.files].sort(), legacyNames)
  assert.equal(manifest.baseline.chainHash, buildMigrationChainHash(legacyMigrations))

  const foundation = await repositoryFoundationMigrations()
  assert.deepEqual(manifest.baseline.foundationFiles, [
    'schema_part1_tables.sql',
    'schema_part2_seed.sql',
  ])
  assert.equal(
    manifest.baseline.foundationChainHash,
    buildMigrationChainHash(foundation),
  )
})

test('remote RLS tests have no embedded project, key, or account credentials and require explicit opt-in', async () => {
  const files = [
    'tests/rls/run.mjs',
    'tests/rls/signed-in.mjs',
    'tests/rls/audit-log.mjs',
    'tests/rls/uploads.mjs',
    'tests/rls/anon-isolation.spec.ts',
  ]
  for (const relativePath of files) {
    const body = await readFile(path.resolve(relativePath), 'utf8')
    assert.doesNotMatch(body, /hocrntqhgvmeaxwlhzwl/)
    assert.doesNotMatch(body, /sb_publishable_/)
    assert.doesNotMatch(body, /eyJhbGciOi/)
    assert.doesNotMatch(body, /Test!Client#2026/)
    assert.match(body, /loadRlsTestConfig/)
  }

  const config = await readFile(path.resolve('tests/rls/config.mjs'), 'utf8')
  assert.match(config, /RLS_TEST_ALLOW_REMOTE/)
  assert.doesNotMatch(config, /hocrntqhgvmeaxwlhzwl|sb_publishable_|eyJhbGciOi|Test!Client#2026/)

  const probe = "import('./tests/rls/config.mjs').then(({loadRlsTestConfig}) => loadRlsTestConfig())"
  const denied = spawnSync(process.execPath, ['--input-type=module', '--eval', probe], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RLS_TEST_SUPABASE_URL: 'https://example.supabase.co',
      RLS_TEST_ANON_KEY: 'fixture-anon-key',
      RLS_TEST_ALLOW_REMOTE: '',
    },
    encoding: 'utf8',
  })
  assert.notEqual(denied.status, 0)
  assert.match(denied.stderr, /Remote RLS tests are disabled/)

  const local = spawnSync(process.execPath, ['--input-type=module', '--eval', probe], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RLS_TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
      RLS_TEST_ANON_KEY: 'fixture-anon-key',
      RLS_TEST_ALLOW_REMOTE: '',
    },
    encoding: 'utf8',
  })
  assert.equal(local.status, 0, local.stderr)
})

test('test accounts are secret-managed and remote seed mutation is approval-gated', async () => {
  const credentialSurfaces = [
    'scripts/seed-test-data.ts',
    'tests/fixtures/auth.ts',
    'docs/TEST_ACCOUNTS.md',
    'docs/HANDOFF_2026_05_09.md',
  ]
  for (const relativePath of credentialSurfaces) {
    const body = await readFile(path.resolve(relativePath), 'utf8')
    assert.doesNotMatch(body, /Test!(?:Admin|Client|Pending)#2026/, relativePath)
  }

  const seed = await readFile(path.resolve('scripts/seed-test-data.ts'), 'utf8')
  assert.match(seed, /SAGE_ALLOW_TEST_DATA_MUTATION/)
  assert.match(seed, /SAGE_TEST_ADMIN_PASSWORD/)
  assert.match(seed, /SAGE_TEST_CLIENT1_PASSWORD/)
  assert.match(seed, /SAGE_TEST_CLIENT2_PASSWORD/)
  assert.match(seed, /SAGE_TEST_PENDING_PASSWORD/)

  const cleanup = await readFile(path.resolve('tests/db/cleanup.ts'), 'utf8')
  assert.match(cleanup, /SAGE_ALLOW_TEST_DATA_CLEANUP/)

  const approvalBoundary = await readFile(
    path.resolve('scripts/ops/check-approval-boundaries.mjs'),
    'utf8',
  )
  assert.match(approvalBoundary, /'seed:test-data'/)
  assert.match(approvalBoundary, /'test:cleanup'/)

  const workflow = await readFile(path.resolve('.github/workflows/e2e.yml'), 'utf8')
  assert.match(workflow, /github\.event_name\s*==\s*'workflow_dispatch'/)
  assert.match(workflow, /RLS_TEST_ALLOW_REMOTE/)
  assert.match(workflow, /SAGE_TEST_CLIENT1_PASSWORD/)
})

test('Terraform runtime credentials are ignored and only a placeholder template is tracked', async () => {
  const gitignore = await readFile(path.resolve('.gitignore'), 'utf8')
  const template = await readFile(path.resolve('infra/aws-api/terraform.tfvars.example'), 'utf8')
  assert.match(gitignore, /\*\*\/terraform\.tfvars/)
  assert.match(template, /metrics_shared_token\s*=\s*"replace-with-secret-managed-token"/)
  await assert.rejects(readFile(path.resolve('infra/aws-api/terraform.tfvars'), 'utf8'), {
    code: 'ENOENT',
  })
})

test('backup and restore contract defines measurable recovery proof', async () => {
  const runbook = await readFile(path.resolve('docs/sops/06-data-backup-restore.md'), 'utf8')
  for (const required of ['RPO', 'RTO', 'point-in-time', 'restore drill', 'integrity checks', 'approval']) {
    assert.match(runbook, new RegExp(required, 'i'), required)
  }
})

test('the production program continuously runs the static data-integrity contract', async () => {
  const packageJson = await readJson('package.json')
  const programCore = await readFile(path.resolve('tools/project-program/core.mjs'), 'utf8')
  const programCli = await readFile(path.resolve('tools/project-program/cli.mjs'), 'utf8')

  assert.equal(packageJson.scripts?.['test:data-integrity'], 'node --test tests/data-integrity/data-integrity.test.mjs')
  assert.equal(packageJson.scripts?.['audit:data-integrity'], 'node tools/data-integrity/cli.mjs')
  assert.match(programCore, /npm run test:data-integrity/)
  assert.match(programCli, /id:\s*['"]data-integrity-contract['"]/)
})
