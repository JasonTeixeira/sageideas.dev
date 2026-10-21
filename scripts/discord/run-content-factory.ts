import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { runDiscordContentFactory } from '@/lib/discord/content-factory';

const evidenceDir = path.join(process.cwd(), 'docs', 'evidence', 'discord-ai-os');
const evidenceFilename = process.argv.includes('--dry-run')
  ? 'phase-22-content-factory-dry-run.json'
  : 'phase-22-content-factory-run.json';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} missing`);
  return value;
}

function argValue(name: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.split('=').slice(1).join('=').trim() || null;
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() || null : null;
}

async function main() {
  const days = Number(argValue('days') ?? 7);
  const dateArg = argValue('date');
  const startDate = dateArg ? new Date(`${dateArg}T12:00:00.000Z`) : new Date();
  if (Number.isNaN(startDate.getTime())) throw new Error(`Invalid --date value: ${dateArg}`);
  const dryRun = process.argv.includes('--dry-run');
  const sb = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const startedAt = new Date().toISOString();
  const result = await runDiscordContentFactory(sb, {
    startDate,
    days,
    force: process.argv.includes('--force'),
    dryRun,
  });
  const channelCoverage = [...new Set(result.drafts.map((draft) => draft.targetChannelBaseName))].sort();
  const draftTypeCoverage = [...new Set(result.drafts.map((draft) => draft.draftType))].sort();
  const topicCoverage = [...new Set(result.drafts.map((draft) => draft.topic))].sort();
  const operatingContractCoverage = [...new Set(result.drafts.flatMap((draft) => [
    draft.operatingContract?.cadence,
    draft.operatingContract?.adminAction,
    ...(draft.operatingContract?.proofPromotionPath ?? []),
  ]).filter(Boolean))].sort();
  const proofLaneTargetCoverage = [...new Set(result.drafts.flatMap((draft) => (
    draft.operatingContract?.proofLaneTargets ?? []
  )).filter(Boolean))].sort();
  const qualityScores = result.drafts
    .map((draft) => draft.qualityScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  const safety = {
    dryRun,
    readOnly: dryRun && result.created === 0,
    noPublicPublish: true,
    adminApprovalRequired: true,
    plannedSlots: result.planned,
    createdDrafts: result.created,
    skippedDrafts: result.skipped,
    failedDrafts: result.failed,
    canonicalChannels: result.channelValidation.ok,
    unknownChannels: result.channelValidation.unknownChannels,
    channelCoverage,
    draftTypeCoverage,
    topicCoverage,
    operatingContractCoverage,
    proofLaneTargetCoverage,
    draftsWithOperatingContracts: result.drafts.filter((draft) => draft.operatingContract).length,
    proofEligibleDrafts: result.drafts.filter((draft) => draft.operatingContract?.proofPromotionPath.includes('public_proof_candidate')).length,
    minQualityScore: qualityScores.length ? Math.min(...qualityScores) : null,
    maxQualityScore: qualityScores.length ? Math.max(...qualityScores) : null,
  };
  const evidence = {
    ...result,
    ok: result.ok && result.created + result.planned + result.skipped > 0,
    safety,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, evidenceFilename);
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
  if (!evidence.ok) process.exit(1);
}

main().catch(async (error) => {
  const evidence = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    finishedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, evidenceFilename);
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.error(JSON.stringify({ ...evidence, evidencePath }, null, 2));
  process.exit(1);
});
