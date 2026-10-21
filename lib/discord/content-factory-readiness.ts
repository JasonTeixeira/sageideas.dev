export type DiscordContentFactoryReadinessInput = {
  generatedAt: string;
  evidence: any;
  minPlannedDrafts?: number;
  minQualityScore?: number;
};

export type DiscordContentFactoryReadinessReport = {
  ok: boolean;
  version: 'discord-content-factory-readiness-v1';
  generatedAt: string;
  mutationMode: 'local_file_evidence_only';
  sourceEvidence: string;
  dryRun: boolean;
  planned: number;
  created: number;
  skipped: number;
  failed: number;
  draftCount: number;
  minQualityScore: number | null;
  channelCoverage: string[];
  requiredChannelCoverage: {
    required: string[];
    missing: string[];
  };
  channelCadence: Array<{
    channel: string;
    plannedCount: number;
    draftTypes: string[];
    topics: string[];
  }>;
  draftTypeCoverage: string[];
  topicCoverageCount: number;
  operatingContractCoverage: string[];
  proofLaneTargetCoverage: string[];
  proofEligibleDrafts: number;
  operatingCadence: {
    dailyActions: string[];
    weeklyActions: string[];
    adminReviewActions: string[];
  };
  approvalChecklist: string[];
  proofPromotionRequirements: {
    realOperatingProofRequired: true;
    requiredEvidence: string[];
    nonProofExamples: string[];
  };
  approvalGate: {
    noPublicPublish: boolean;
    adminApprovalRequired: boolean;
    readOnly: boolean;
  };
  sourcePolicy: {
    sourceKind: string | null;
    operatingProofEligible: boolean | null;
    requiresApprovedSourceBeforePublicProof: boolean | null;
  };
  failures: string[];
  releaseMeaning: string;
};

function uniqueSorted(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const requiredOperatingChannels = [
  'daily-signal',
  'the-floor',
  'build-lab',
  'project-submissions',
  'review-queue',
  'challenges',
  'quiz-room',
  'weekly-recap',
  'resources',
  'saved-answers',
  'playbooks',
  'live-room',
  'office-hours',
];

function buildChannelCadence(drafts: any[]): DiscordContentFactoryReadinessReport['channelCadence'] {
  const byChannel = new Map<string, { draftTypes: Set<string>; topics: Set<string>; plannedCount: number }>();
  for (const draft of drafts) {
    const channel = String(draft?.targetChannelBaseName ?? '').trim();
    if (!channel) continue;
    const current = byChannel.get(channel) ?? { draftTypes: new Set<string>(), topics: new Set<string>(), plannedCount: 0 };
    current.plannedCount += 1;
    if (draft?.draftType) current.draftTypes.add(String(draft.draftType));
    if (draft?.topic) current.topics.add(String(draft.topic));
    byChannel.set(channel, current);
  }

  return [...byChannel.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([channel, value]) => ({
      channel,
      plannedCount: value.plannedCount,
      draftTypes: [...value.draftTypes].sort(),
      topics: [...value.topics].sort(),
    }));
}

export function buildDiscordContentFactoryReadinessReport(
  input: DiscordContentFactoryReadinessInput,
): DiscordContentFactoryReadinessReport {
  const minPlannedDrafts = input.minPlannedDrafts ?? 28;
  const minQualityScore = input.minQualityScore ?? 90;
  const evidence = input.evidence ?? {};
  const drafts = Array.isArray(evidence.drafts) ? evidence.drafts : [];
  const qualityScores = drafts
    .map((draft: any) => finiteNumber(draft?.qualityScore))
    .filter((score: number | null): score is number => score !== null);
  const observedMinQualityScore = qualityScores.length ? Math.min(...qualityScores) : finiteNumber(evidence.safety?.minQualityScore);
  const channelCoverage = uniqueSorted(evidence.safety?.channelCoverage ?? drafts.map((draft: any) => draft?.targetChannelBaseName));
  const missingRequiredChannels = requiredOperatingChannels.filter((channel) => !channelCoverage.includes(channel));
  const channelCadence = buildChannelCadence(drafts);
  const draftTypeCoverage = uniqueSorted(evidence.safety?.draftTypeCoverage ?? drafts.map((draft: any) => draft?.draftType));
  const topicCoverage = uniqueSorted(evidence.safety?.topicCoverage ?? drafts.map((draft: any) => draft?.topic));
  const operatingContractCoverage = uniqueSorted(evidence.safety?.operatingContractCoverage ?? drafts.flatMap((draft: any) => [
    draft?.operatingContract?.cadence,
    draft?.operatingContract?.adminAction,
    ...(Array.isArray(draft?.operatingContract?.proofPromotionPath) ? draft.operatingContract.proofPromotionPath : []),
  ]));
  const proofLaneTargetCoverage = uniqueSorted(evidence.safety?.proofLaneTargetCoverage ?? drafts.flatMap((draft: any) => (
    Array.isArray(draft?.operatingContract?.proofLaneTargets) ? draft.operatingContract.proofLaneTargets : []
  )));
  const draftsWithOperatingContracts = Number(evidence.safety?.draftsWithOperatingContracts ?? drafts.filter((draft: any) => draft?.operatingContract).length);
  const proofEligibleDrafts = Number(evidence.safety?.proofEligibleDrafts ?? drafts.filter((draft: any) => (
    Array.isArray(draft?.operatingContract?.proofPromotionPath)
      && draft.operatingContract.proofPromotionPath.includes('public_proof_candidate')
  )).length);
  const failures: string[] = [];

  if (evidence.ok !== true) failures.push('source_evidence_not_ok');
  if (evidence.version !== 'discord-content-factory-v1') failures.push('wrong_content_factory_version');
  if (evidence.dryRun !== true || evidence.safety?.dryRun !== true) failures.push('not_dry_run');
  if (evidence.created !== 0 || evidence.safety?.createdDrafts !== 0) failures.push('dry_run_created_drafts');
  if (evidence.skipped !== 0 || evidence.safety?.skippedDrafts !== 0) failures.push('dry_run_skipped_drafts');
  if (evidence.failed !== 0 || evidence.safety?.failedDrafts !== 0) failures.push('dry_run_failed_drafts');
  if (evidence.safety?.readOnly !== true) failures.push('dry_run_not_read_only');
  if (evidence.safety?.noPublicPublish !== true) failures.push('public_publish_not_blocked');
  if (evidence.safety?.adminApprovalRequired !== true) failures.push('admin_approval_not_required');
  if (evidence.sourcePolicy?.sourceKind !== 'editorial_seed') failures.push('source_policy_not_editorial_seed');
  if (evidence.sourcePolicy?.operatingProofEligible !== false) failures.push('editorial_seed_marked_operating_proof');
  if (evidence.sourcePolicy?.requiresApprovedSourceBeforePublicProof !== true) failures.push('approved_source_requirement_missing');
  if (evidence.channelValidation?.ok !== true || evidence.safety?.canonicalChannels !== true) failures.push('canonical_channel_validation_failed');
  if ((evidence.channelValidation?.unknownChannels ?? evidence.safety?.unknownChannels ?? []).length > 0) failures.push('unknown_channels_present');
  if (Number(evidence.planned ?? 0) < minPlannedDrafts) failures.push('insufficient_planned_drafts');
  if (drafts.length !== Number(evidence.planned ?? drafts.length)) failures.push('draft_count_mismatch');
  if (!drafts.every((draft: any) => draft?.status === 'planned' && draft?.draftId === null)) failures.push('dry_run_drafts_not_planned_only');
  if (draftsWithOperatingContracts !== drafts.length) failures.push('missing_operating_contracts');
  if (!drafts.every((draft: any) => draft?.operatingContract?.adminAction === 'review_then_approve_or_reject')) failures.push('missing_admin_review_contract');
  if (!drafts.every((draft: any) => Array.isArray(draft?.operatingContract?.requiredEvidenceBeforeProof) && draft.operatingContract.requiredEvidenceBeforeProof.length >= 5)) {
    failures.push('weak_proof_evidence_contract');
  }
  if (!drafts.every((draft: any) => Array.isArray(draft?.operatingContract?.proofLaneTargets) && draft.operatingContract.proofLaneTargets.length > 0)) {
    failures.push('missing_proof_lane_targets');
  }
  if (!drafts.every((draft: any) => typeof draft?.operatingContract?.collectionInstruction === 'string' && draft.operatingContract.collectionInstruction.length > 40)) {
    failures.push('missing_collection_instruction');
  }
  for (const requiredTarget of ['approved_discord_knowledge', 'rag_discord_sources', 'public_proof_assets', 'premium_workflow_proof']) {
    if (!proofLaneTargetCoverage.includes(requiredTarget)) failures.push(`missing_proof_lane_target:${requiredTarget}`);
  }
  if (proofEligibleDrafts < 4) failures.push('insufficient_public_proof_candidate_slots');
  if (observedMinQualityScore === null || observedMinQualityScore < minQualityScore) failures.push('quality_score_below_gate');
  if (channelCoverage.length < 10) failures.push('insufficient_channel_coverage');
  if (missingRequiredChannels.length > 0) failures.push('missing_required_operating_channels');
  if (!channelCadence.every((item) => item.plannedCount > 0 && item.draftTypes.length > 0)) failures.push('invalid_channel_cadence');
  if (draftTypeCoverage.length < 5) failures.push('insufficient_draft_type_coverage');
  if (topicCoverage.length < 7) failures.push('insufficient_topic_coverage');

  return {
    ok: failures.length === 0,
    version: 'discord-content-factory-readiness-v1',
    generatedAt: input.generatedAt,
    mutationMode: 'local_file_evidence_only',
    sourceEvidence: 'docs/evidence/discord-ai-os/phase-22-content-factory-dry-run.json',
    dryRun: evidence.dryRun === true,
    planned: Number(evidence.planned ?? 0),
    created: Number(evidence.created ?? 0),
    skipped: Number(evidence.skipped ?? 0),
    failed: Number(evidence.failed ?? 0),
    draftCount: drafts.length,
    minQualityScore: observedMinQualityScore,
    channelCoverage,
    requiredChannelCoverage: {
      required: requiredOperatingChannels,
      missing: missingRequiredChannels,
    },
    channelCadence,
    draftTypeCoverage,
    topicCoverageCount: topicCoverage.length,
    operatingContractCoverage,
    proofLaneTargetCoverage,
    proofEligibleDrafts,
    operatingCadence: {
      dailyActions: [
        'Review the daily-signal, question, build-lab, and resource drafts before posting.',
        'Approve only drafts with a concrete member action and no unsupported claim.',
        'Tag any useful member reply as a question, answer, resource, project, win, or review candidate.',
      ],
      weeklyActions: [
        'Approve or reject the weekly announcement, project submission prompt, review queue prompt, content queue prompt, office-hours prompt, accountability prompt, and wins recap.',
        'Promote only real member activity into public proof or authoritative RAG.',
        'Rerun content factory readiness and operating proof packet after the weekly cycle.',
      ],
      adminReviewActions: [
        'Reject generic posts that could fit any community.',
        'Require source links before any draft becomes public proof or RAG knowledge.',
        'Record approval, rejection, published message id, and member outcome when a draft goes live.',
      ],
    },
    approvalChecklist: [
      'Draft has one clear member action.',
      'Draft targets the correct canonical channel.',
      'Draft is specific to Sage Ideas Academy builders.',
      'Draft does not claim live proof from editorial seed content.',
      'Draft has no unsupported factual claim.',
      'Draft has no private member detail.',
      'Draft can produce a measurable reply, submission, question, or content candidate.',
    ],
    proofPromotionRequirements: {
      realOperatingProofRequired: true,
      requiredEvidence: [
        'approved draft id',
        'published Discord message id',
        'member response or submission id',
        'admin approval actor and timestamp',
        'content queue or knowledge candidate id when reused',
        'privacy review result before public proof',
        'proof lane target and collection instruction',
      ],
      nonProofExamples: [
        'dry-run planned draft',
        'editorial seed without member response',
        'bot-only message with no engagement',
        'unapproved raw Discord message',
      ],
    },
    approvalGate: {
      noPublicPublish: evidence.safety?.noPublicPublish === true,
      adminApprovalRequired: evidence.safety?.adminApprovalRequired === true,
      readOnly: evidence.safety?.readOnly === true,
    },
    sourcePolicy: {
      sourceKind: typeof evidence.sourcePolicy?.sourceKind === 'string' ? evidence.sourcePolicy.sourceKind : null,
      operatingProofEligible: typeof evidence.sourcePolicy?.operatingProofEligible === 'boolean'
        ? evidence.sourcePolicy.operatingProofEligible
        : null,
      requiresApprovedSourceBeforePublicProof: typeof evidence.sourcePolicy?.requiresApprovedSourceBeforePublicProof === 'boolean'
        ? evidence.sourcePolicy.requiresApprovedSourceBeforePublicProof
        : null,
    },
    failures,
    releaseMeaning: 'Content factory readiness only proves local dry-run quality and approval gates. Real operating proof still requires admin-approved publishing, member responses, and weekly growth-cycle evidence.',
  };
}

export function validateDiscordContentFactoryReadinessReport(report: DiscordContentFactoryReadinessReport): {
  ok: boolean;
  failures: string[];
} {
  const failures = [...report.failures];
  if (report.version !== 'discord-content-factory-readiness-v1') failures.push('wrong_readiness_version');
  if (report.mutationMode !== 'local_file_evidence_only') failures.push('wrong_mutation_mode');
  if (report.requiredChannelCoverage.missing.length > 0) failures.push('missing_required_channel_coverage');
  if (report.approvalChecklist.length < 7) failures.push('approval_checklist_too_weak');
  if (report.proofPromotionRequirements.realOperatingProofRequired !== true) failures.push('proof_promotion_not_real_operating_required');
  if (report.proofPromotionRequirements.requiredEvidence.length < 5) failures.push('proof_promotion_evidence_too_weak');
  if (report.operatingContractCoverage.length < 5) failures.push('operating_contract_coverage_too_weak');
  for (const requiredTarget of ['approved_discord_knowledge', 'rag_discord_sources', 'public_proof_assets', 'premium_workflow_proof']) {
    if (!report.proofLaneTargetCoverage.includes(requiredTarget)) failures.push(`missing_proof_lane_target:${requiredTarget}`);
  }
  if (report.proofEligibleDrafts < 4) failures.push('proof_candidate_slots_too_weak');
  if (!report.releaseMeaning.includes('Real operating proof still requires admin-approved publishing')) {
    failures.push('missing_operating_proof_disclaimer');
  }
  return {
    ok: report.ok === true && failures.length === 0,
    failures,
  };
}
