import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputPath = path.join(root, 'docs', 'evidence', 'engineering-loop', 'discord-corpus-readiness-latest.json');

const paths = {
  authoritativeSources: 'lib/rag/discord-authoritative-sources.ts',
  sourceSync: 'lib/rag/discord-source-sync.ts',
  corpusHealth: 'lib/rag/discord-corpus-health.ts',
  authoritativeSmoke: 'scripts/rag/smoke-discord-authoritative-sync.ts',
  knowledgeCaptureSmoke: 'scripts/discord/smoke-knowledge-capture.ts',
  adminActions: 'app/admin/discord/actions.ts',
  adminPage: 'app/admin/discord/page.tsx',
  ragCorpusE2e: 'tests/e2e/admin/discord-rag-corpus.spec.ts',
  knowledgeCandidateE2e: 'tests/e2e/admin/discord-knowledge-candidates.spec.ts',
  proofSourceScan: 'docs/evidence/engineering-loop/discord-proof-source-volume-scan-latest.json',
  proofRecoveryPlan: 'docs/evidence/engineering-loop/discord-proof-source-recovery-plan-latest.json',
  packageJson: 'package.json',
};

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function includesAll(text, patterns) {
  return patterns.every((pattern) => text.includes(pattern));
}

function validateDiscordCorpusReadiness(evidence) {
  const failures = [];
  const checkNames = new Set((evidence.checks ?? []).map((check) => check.name));
  const failedChecks = (evidence.checks ?? []).filter((check) => check.passed !== true).map((check) => check.name);

  if (evidence.version !== 'discord-corpus-readiness-v1') failures.push('invalid_version');
  if (evidence.mutationMode !== 'local_file_evidence_only') failures.push('invalid_mutation_mode');
  if (evidence.ok !== (failedChecks.length === 0)) failures.push('ok_does_not_match_check_failures');
  if ((evidence.failures ?? []).join('|') !== failedChecks.join('|')) failures.push('failures_do_not_match_failed_checks');
  if (!checkNames.has('approved_only_collector_policy_wired')) failures.push('missing_approved_only_collector_check');
  if (!checkNames.has('admin_approval_and_sync_surfaces_wired')) failures.push('missing_admin_approval_surface_check');
  if (!checkNames.has('empty_live_corpus_is_explicitly_blocked_from_world_class_claims')) failures.push('missing_empty_corpus_blocker_check');
  if (evidence.proofSummary?.approvedOnlyCollector !== true) failures.push('approved_only_collector_not_proven');
  if (evidence.proofSummary?.adminApprovalSurface !== true) failures.push('admin_approval_surface_not_proven');
  if (Number(evidence.proofSummary?.approvedKnowledgeCount ?? 0) >= 10) failures.push('approved_knowledge_count_claim_changed');
  if (Number(evidence.proofSummary?.discordRagSourceCount ?? 0) >= 10) failures.push('discord_rag_source_count_claim_changed');
  if (!(evidence.releaseMeaning ?? '').includes('does not mutate Supabase, sync live RAG, create knowledge rows')) failures.push('release_meaning_overclaims');
  if (!(evidence.antiFakeRules ?? []).some((rule) => rule.includes('raw discord_messages rows'))) failures.push('missing_raw_message_anti_fake_rule');
  if (!(evidence.antiFakeRules ?? []).some((rule) => rule.includes('smoke-created and cleaned-up RAG rows'))) failures.push('missing_smoke_row_anti_fake_rule');
  if (!(evidence.nextOperatingProofRequired ?? []).some((item) => item.includes('Approve at least 10 high-signal Discord knowledge sources'))) failures.push('missing_approved_knowledge_next_proof');
  if (!(evidence.nextOperatingProofRequired ?? []).some((item) => item.includes('explicit approval'))) failures.push('missing_non_dry_eval_approval_guard');

  return {
    ok: failures.length === 0,
    validator: 'discord-corpus-readiness-validator-v1',
    validatedAt: new Date().toISOString(),
    failures,
  };
}

async function main() {
  const [
    authoritativeSources,
    sourceSync,
    corpusHealth,
    authoritativeSmoke,
    knowledgeCaptureSmoke,
    adminActions,
    adminPage,
    ragCorpusE2e,
    knowledgeCandidateE2e,
    proofSourceScanRaw,
    proofRecoveryPlanRaw,
    packageRaw,
  ] = await Promise.all([
    read(paths.authoritativeSources),
    read(paths.sourceSync),
    read(paths.corpusHealth),
    read(paths.authoritativeSmoke),
    read(paths.knowledgeCaptureSmoke),
    read(paths.adminActions),
    read(paths.adminPage),
    read(paths.ragCorpusE2e),
    read(paths.knowledgeCandidateE2e),
    read(paths.proofSourceScan),
    read(paths.proofRecoveryPlan),
    read(paths.packageJson),
  ]);
  const proofSourceScan = JSON.parse(proofSourceScanRaw);
  const proofRecoveryPlan = JSON.parse(proofRecoveryPlanRaw);
  const packageJson = JSON.parse(packageRaw);

  const sourceCounts = proofSourceScan?.counts ?? {};
  const approvedKnowledgeCount = Number(sourceCounts['discord_questions.status.in'] ?? 0)
    + Number(sourceCounts['discord_answers.helpful=true'] ?? 0)
    + Number(sourceCounts['discord_content_queue.status=published'] ?? 0)
    + Number(sourceCounts['discord_content_drafts.approved_with_discord_provenance'] ?? 0);
  const discordRagSourceCount = Number(sourceCounts['rag_sources.or'] ?? 0);
  const reviewableCandidateCount = Number(sourceCounts['discord_message_classifications.recommended_action.in'] ?? 0)
    + Number(sourceCounts['discord_content_queue.status.in'] ?? 0);
  const recoveryBlockers = (proofRecoveryPlan?.lanes ?? []).map((lane) => String(lane.blocker ?? ''));

  const checks = [
    {
      name: 'approved_only_collector_policy_wired',
      passed: includesAll(authoritativeSources, [
        'DISCORD_AUTHORITATIVE_RAG_SYNC_VERSION',
        'isApprovedDiscordQuestion',
        "['answered', 'closed']",
        'isApprovedDiscordAnswer',
        'row.helpful === true',
        'isApprovedDiscordContentQueue',
        "status ?? '').toLowerCase() === 'published'",
        'isApprovedDiscordContentDraft',
        'Number(row.quality_score ?? 0) >= 80',
        "row.metadata?.policy_passed !== false",
        'hasDiscordContentDraftProvenance',
        'approved_for_rag: true',
      ]) && !authoritativeSources.includes(".from('discord_messages')"),
      evidence: paths.authoritativeSources,
    },
    {
      name: 'approved_discord_sync_writes_sources_and_documents',
      passed: includesAll(sourceSync, [
        'collectApprovedDiscordRagInputs',
        'normalizeRagSource',
        "from('rag_sources')",
        "from('rag_documents')",
        'phase_5_authoritative_discord_rag',
        'No approved Discord knowledge-source rows were available to sync',
        'Raw/unapproved Discord rows are intentionally excluded',
      ]),
      evidence: paths.sourceSync,
    },
    {
      name: 'admin_approval_and_sync_surfaces_wired',
      passed: includesAll(adminActions, [
        'promoteKnowledgeCandidateForRag',
        'knowledge_candidate_promoted',
        'knowledge_candidate_rejected',
        'requireAdmin',
      ]) && includesAll(adminPage, [
        'data-testid="discord-rag-corpus-ops"',
        'data-testid="rag-sync-now"',
        'data-testid="rag-health-sync-now"',
        'Sync approved Discord knowledge',
        'Approving here changes the source row into the Phase 5 approved state',
      ]),
      evidence: `${paths.adminActions}, ${paths.adminPage}`,
    },
    {
      name: 'corpus_health_blocks_unapproved_or_low_quality_sources',
      passed: includesAll(corpusHealth, [
        'Question must be answered or closed before it becomes authoritative RAG.',
        'Answer must be marked helpful before it becomes authoritative RAG.',
        'Content queue item must be published before it becomes authoritative RAG.',
        'Draft must be approved or published before it becomes authoritative RAG.',
        'Draft must reference an approved Discord source',
        'authoritativeSources === 0',
      ]),
      evidence: paths.corpusHealth,
    },
    {
      name: 'authoritative_sync_smoke_proves_allow_and_block_paths_with_cleanup',
      passed: includesAll(authoritativeSmoke, [
        'phase_5_authoritative_rag_smoke',
        "status: 'published'",
        "status: 'captured'",
        "status: 'approved'",
        "status: 'rejected'",
        'approvedPresent',
        'blockedAbsent',
        'documentsPresent',
        'discord-authoritative-sync-smoke.json',
        "sb.from('rag_sources').delete()",
        "sb.from('discord_content_drafts').delete()",
        "sb.from('discord_content_queue').delete()",
      ]),
      evidence: paths.authoritativeSmoke,
    },
    {
      name: 'knowledge_capture_smoke_and_e2e_paths_exist',
      passed: includesAll(knowledgeCaptureSmoke, [
        'promoteKnowledgeCandidateForRag',
        'knowledge-capture-smoke.json',
        "sb.from('rag_sources').delete()",
        "sb.from('discord_content_queue').delete()",
      ]) && includesAll(ragCorpusE2e, [
        'Admin Discord authoritative RAG corpus',
        'admin approves a Discord content item into authoritative RAG',
        'rag-sync-now',
        'approved_for_rag',
      ]) && includesAll(knowledgeCandidateE2e, [
        'Admin Discord knowledge candidates',
        'admin promotes a captured Discord message candidate into RAG',
        'knowledge-candidate-resource',
      ]),
      evidence: `${paths.knowledgeCaptureSmoke}, ${paths.ragCorpusE2e}, ${paths.knowledgeCandidateE2e}`,
    },
    {
      name: 'local_commands_available_but_not_in_live_release_gate_without_approval',
      passed: packageJson.scripts?.['rag:smoke-discord-authoritative-sync'] === 'tsx --env-file=.env.local scripts/rag/smoke-discord-authoritative-sync.ts'
        && packageJson.scripts?.['discord:smoke-knowledge-capture'] === 'tsx --env-file=.env.local scripts/discord/smoke-knowledge-capture.ts'
        && packageJson.scripts?.['rag:discord-corpus-readiness'] === 'node scripts/rag/write-discord-corpus-readiness.mjs',
      evidence: paths.packageJson,
    },
    {
      name: 'empty_live_corpus_is_explicitly_blocked_from_world_class_claims',
      passed: proofSourceScan.ok === true
        && approvedKnowledgeCount < 10
        && discordRagSourceCount < 10
        && recoveryBlockers.some((blocker) => blocker.includes('Approved knowledge is'))
        && recoveryBlockers.some((blocker) => blocker.includes('Discord RAG sources are'))
        && proofRecoveryPlan.releaseMeaning?.includes('does not approve, sync, publish')
        && proofRecoveryPlan.releaseMeaning?.includes('satisfy operating proof')
        && JSON.stringify(proofRecoveryPlan).includes('Raw unapproved Discord chatter.'),
      evidence: `${paths.proofSourceScan}, ${paths.proofRecoveryPlan}`,
    },
  ];

  const failures = checks.filter((check) => check.passed !== true).map((check) => check.name);
  const evidence = {
    ok: failures.length === 0,
    version: 'discord-corpus-readiness-v1',
    generatedAt: new Date().toISOString(),
    mutationMode: 'local_file_evidence_only',
    sourceEvidence: paths,
    checks,
    proofSummary: {
      approvedOnlyCollector: checks.find((check) => check.name === 'approved_only_collector_policy_wired')?.passed === true,
      adminApprovalSurface: checks.find((check) => check.name === 'admin_approval_and_sync_surfaces_wired')?.passed === true,
      smokeProofCommandAvailable: packageJson.scripts?.['rag:smoke-discord-authoritative-sync'] ?? null,
      approvedKnowledgeCount,
      discordRagSourceCount,
      reviewableCandidateCount,
    },
    antiFakeRules: [
      'Do not treat raw discord_messages rows as authoritative RAG sources.',
      'Do not treat captured or pending content queue rows as approved knowledge.',
      'Do not count smoke-created and cleaned-up RAG rows as live corpus volume.',
      'Do not count seeded internal starter knowledge as organic member corpus volume.',
      'Do not improve RAG corpus quality score until real approved Discord knowledge reaches the target and is synced.',
    ],
    nextOperatingProofRequired: [
      'Capture real non-bot Discord questions, answers, builds, reviews, wins, and resources.',
      'Approve at least 10 high-signal Discord knowledge sources from the admin dashboard.',
      'Run the approved Discord RAG sync and verify rag_sources/rag_documents provenance.',
      'With explicit approval, rerun non-dry RAG eval and final scorecard after sync.',
    ],
    failures,
    releaseMeaning: 'Discord corpus readiness proves approved-only ingestion wiring, admin surfaces, smoke proof paths, and current empty-corpus blockers. It does not mutate Supabase, sync live RAG, or create knowledge rows. It does not claim organic member corpus volume.',
  };
  evidence.validation = validateDiscordCorpusReadiness(evidence);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  if (!evidence.ok || evidence.validation.ok !== true) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
