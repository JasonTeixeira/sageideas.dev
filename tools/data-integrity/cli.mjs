#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { auditMigrationChain, buildMigrationChainHash } from './core.mjs';

const root = process.cwd();

async function readMigrations(directory) {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  return Promise.all(names.map(async (filename) => ({
    filename,
    sql: await readFile(path.join(directory, filename), 'utf8'),
  })));
}

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(root, 'supabase', 'migration-manifest.json'), 'utf8'),
  );
  const migrations = await readMigrations(path.join(root, 'supabase', 'migrations'));
  const legacy = await readMigrations(path.join(root, 'supabase', 'legacy_migrations'));
  const foundation = await Promise.all(
    manifest.baseline.foundationFiles.map(async (filename) => ({
      filename,
      sql: await readFile(path.join(root, 'supabase', filename), 'utf8'),
    })),
  );
  const migrationAudit = auditMigrationChain({
    migrations,
    baselineMigrations: legacy,
    foundationMigrations: foundation,
    manifest,
  });
  const baselineHash = buildMigrationChainHash(legacy);
  const foundationHash = buildMigrationChainHash(foundation);
  const baselineOk = baselineHash === manifest.baseline.chainHash
    && legacy.length === manifest.baseline.files.length
    && foundationHash === manifest.baseline.foundationChainHash;

  const evidence = {
    schemaVersion: 1,
    contractVersion: 'data-integrity-v1',
    generatedAt: new Date().toISOString(),
    status: migrationAudit.ok && baselineOk ? 'local_static_green' : 'failed',
    migrationAudit,
    legacyBaseline: {
      mode: manifest.baseline.mode,
      foundationFileCount: foundation.length,
      foundationChainHash: foundationHash,
      foundationManifestHash: manifest.baseline.foundationChainHash,
      fileCount: legacy.length,
      chainHash: baselineHash,
      manifestHash: manifest.baseline.chainHash,
      ok: baselineOk,
    },
    remoteProof: {
      status: 'pending_external_approval',
      required: [
        'rotate any formerly repository-published test-account passwords',
        'reconcile the hosted migration ledger and schema against this manifest',
        'run RLS isolation against an isolated staging project',
        'complete an isolated backup restore drill and measure RPO/RTO',
      ],
    },
    trustBoundary: {
      academyCertification: 'uncertified',
      labTrust: 'untrusted_current_runtime',
      labEvidence: 'practice_only',
    },
  };

  const outputPath = path.join(
    root,
    'docs',
    'evidence',
    'project-loop',
    'data-integrity-audit.json',
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, outputPath)} (${evidence.status})`);

  if (evidence.status !== 'local_static_green') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
