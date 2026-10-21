import {
  leanDiscordChannels,
  validateLeanDiscordChannelOperatingMatrix,
  type SageDiscordChannel,
} from './sage-content';
import {
  buildDiscordContentFactorySlots,
  validateDiscordContentFactoryChannels,
} from './content-factory';

export type DiscordChannelMatrixReadinessReport = {
  ok: boolean;
  version: 'discord-channel-matrix-readiness-v1';
  generatedAt: string;
  mutationMode: 'local_file_evidence_only';
  channelCount: number;
  approvedMemberChannelCount: number;
  preApprovalChannels: string[];
  premiumChannels: string[];
  staffPrivateChannels: string[];
  dailyChannels: string[];
  weeklyChannels: string[];
  proofLaneCoverage: string[];
  categoryCoverage: string[];
  postingModeCoverage: string[];
  ownerCoverage: string[];
  pinnedAssetCoverage: {
    channelsWithPinnedAssets: number;
    minimumPinnedAssetsPerChannel: number;
  };
  botJobCoverage: {
    channelsWithBotJobs: number;
    totalBotJobs: number;
  };
  antiSprawlCoverage: {
    channelsWithRules: number;
    examples: Array<{ channel: string; rule: string }>;
  };
  contentFactoryTargeting: {
    ok: boolean;
    knownChannelCount: number;
    targetableChannelCount: number;
    plannedSlotCount: number;
    unknownChannels: string[];
    blockedChannels: Array<{ channel: string; reason: string }>;
    blockedVisibilityPolicy: Array<{ visibility: string; reason: string }>;
  };
  operatingChecks: string[];
  failures: string[];
  releaseMeaning: string;
};

function uniqueSorted(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}

function minimum(values: number[]): number {
  return values.length ? Math.min(...values) : 0;
}

export function buildDiscordChannelMatrixReadinessReport(input: {
  generatedAt: string;
  channels?: SageDiscordChannel[];
  contentFactoryStartDate?: Date;
  contentFactoryDays?: number;
}): DiscordChannelMatrixReadinessReport {
  const channels = input.channels ?? leanDiscordChannels;
  const matrixValidation = validateLeanDiscordChannelOperatingMatrix(channels);
  const slots = buildDiscordContentFactorySlots(
    input.contentFactoryStartDate ?? new Date(Date.UTC(2026, 5, 25)),
    input.contentFactoryDays ?? 7,
  );
  const contentFactoryTargeting = validateDiscordContentFactoryChannels(slots);
  const preApprovalChannels = channels.filter((channel) => channel.visibility === 'pre_approval').map((channel) => channel.name);
  const premiumChannels = channels.filter((channel) => channel.visibility === 'premium_members').map((channel) => channel.name);
  const staffPrivateChannels = channels.filter((channel) => channel.visibility === 'staff_private').map((channel) => channel.name);
  const approvedMemberChannelCount = channels.filter((channel) => channel.visibility === 'approved_members').length;
  const proofLaneCoverage = uniqueSorted(channels.flatMap((channel) => channel.proofLanes));
  const pinnedAssetCounts = channels.map((channel) => channel.pinnedAssets.length);
  const botJobCounts = channels.map((channel) => channel.botJobs.length);
  const failures = [...matrixValidation.failures];

  if (channels.length !== 20) failures.push(`unexpected_channel_count:${channels.length}`);
  if (preApprovalChannels.join('|') !== 'start-here|rules|announcements') failures.push('pre_approval_front_door_channels_missing');
  if (approvedMemberChannelCount !== 13) failures.push('approved_member_channel_count_mismatch');
  if (!premiumChannels.includes('premium-lounge') || !premiumChannels.includes('premium-reviews')) failures.push('premium_channels_missing');
  if (staffPrivateChannels.join('|') !== 'team-ops|content-queue') failures.push('staff_private_channel_policy_mismatch');
  if (matrixValidation.coverage.dailyChannels.length < 3) failures.push('daily_channel_coverage_too_thin');
  if (matrixValidation.coverage.weeklyChannels.length < 5) failures.push('weekly_channel_coverage_too_thin');
  if (minimum(pinnedAssetCounts) < 2) failures.push('pinned_asset_coverage_too_thin');
  if (minimum(botJobCounts) < 1) failures.push('bot_job_coverage_too_thin');
  if (!contentFactoryTargeting.ok) failures.push('content_factory_targets_invalid_channel');
  if (contentFactoryTargeting.targetableChannelCount !== 13) failures.push('content_factory_targetable_channel_count_mismatch');

  return {
    ok: failures.length === 0,
    version: 'discord-channel-matrix-readiness-v1',
    generatedAt: input.generatedAt,
    mutationMode: 'local_file_evidence_only',
    channelCount: channels.length,
    approvedMemberChannelCount,
    preApprovalChannels,
    premiumChannels,
    staffPrivateChannels,
    dailyChannels: matrixValidation.coverage.dailyChannels,
    weeklyChannels: matrixValidation.coverage.weeklyChannels,
    proofLaneCoverage,
    categoryCoverage: uniqueSorted(channels.map((channel) => channel.category)),
    postingModeCoverage: uniqueSorted(channels.map((channel) => channel.postingMode)),
    ownerCoverage: uniqueSorted(channels.map((channel) => channel.owner)),
    pinnedAssetCoverage: {
      channelsWithPinnedAssets: channels.filter((channel) => channel.pinnedAssets.length >= 2).length,
      minimumPinnedAssetsPerChannel: minimum(pinnedAssetCounts),
    },
    botJobCoverage: {
      channelsWithBotJobs: channels.filter((channel) => channel.botJobs.length > 0).length,
      totalBotJobs: botJobCounts.reduce((sum, count) => sum + count, 0),
    },
    antiSprawlCoverage: {
      channelsWithRules: channels.filter((channel) => /do not|keep|only|instead/i.test(channel.antiSprawlRule)).length,
      examples: channels.slice(0, 5).map((channel) => ({
        channel: channel.name,
        rule: channel.antiSprawlRule,
      })),
    },
    contentFactoryTargeting: {
      ok: contentFactoryTargeting.ok,
      knownChannelCount: contentFactoryTargeting.knownChannelCount,
      targetableChannelCount: contentFactoryTargeting.targetableChannelCount,
      plannedSlotCount: slots.length,
      unknownChannels: contentFactoryTargeting.unknownChannels,
      blockedChannels: contentFactoryTargeting.blockedChannels,
      blockedVisibilityPolicy: [
        { visibility: 'pre_approval', reason: 'Content factory must not post into the application gate.' },
        { visibility: 'premium_members', reason: 'Premium content uses premium workflows, not free daily/weekly factory slots.' },
        { visibility: 'staff_private', reason: 'Staff operations are private and not public engagement targets.' },
      ],
    },
    operatingChecks: [
      'The pre-approval surface is limited to start-here, rules, and announcements.',
      'Approved free members have one floor, build lab, project and review queues, daily retrieval practice, playbooks, resources, live support, and a weekly recap.',
      'Premium and staff-private channels are excluded from general content factory targeting.',
      'Every channel declares owner, cadence, posting mode, bot jobs, pinned assets, proof lanes, and anti-sprawl rule.',
      'Content factory targets are validated against canonical channels before drafts are created or planned.',
    ],
    failures,
    releaseMeaning: 'Channel matrix readiness proves the local operating design and content-factory targeting rules only. It does not create, delete, rename, reorder, or mutate live Discord channels.',
  };
}

export function validateDiscordChannelMatrixReadinessReport(report: DiscordChannelMatrixReadinessReport): {
  ok: boolean;
  failures: string[];
} {
  const failures = [...report.failures];
  if (report.version !== 'discord-channel-matrix-readiness-v1') failures.push('wrong_channel_matrix_readiness_version');
  if (report.mutationMode !== 'local_file_evidence_only') failures.push('wrong_mutation_mode');
  if (report.channelCount !== 20) failures.push('wrong_channel_count');
  if (report.preApprovalChannels.join('|') !== 'start-here|rules|announcements') failures.push('pre_approval_gate_policy_missing');
  if (report.approvedMemberChannelCount !== 13) failures.push('approved_member_channel_count_wrong');
  if (!report.premiumChannels.includes('premium-lounge') || !report.premiumChannels.includes('premium-reviews')) failures.push('premium_channel_policy_missing');
  if (report.staffPrivateChannels.join('|') !== 'team-ops|content-queue') failures.push('staff_private_policy_missing');
  for (const requiredLane of ['onboarding', 'approved_discord_knowledge', 'rag_discord_sources', 'public_proof_assets', 'premium_workflow_proof', 'operating_admin']) {
    if (!report.proofLaneCoverage.includes(requiredLane)) failures.push(`missing_proof_lane:${requiredLane}`);
  }
  if (report.dailyChannels.length < 3) failures.push('daily_channels_too_thin');
  if (report.weeklyChannels.length < 5) failures.push('weekly_channels_too_thin');
  if (report.pinnedAssetCoverage.channelsWithPinnedAssets !== report.channelCount) failures.push('not_all_channels_have_pinned_assets');
  if (report.botJobCoverage.channelsWithBotJobs !== report.channelCount) failures.push('not_all_channels_have_bot_jobs');
  if (report.antiSprawlCoverage.channelsWithRules !== report.channelCount) failures.push('not_all_channels_have_anti_sprawl_rules');
  if (report.contentFactoryTargeting.ok !== true) failures.push('content_factory_targeting_not_ok');
  if (report.contentFactoryTargeting.targetableChannelCount !== 13) failures.push('content_factory_targetable_channel_count_wrong');
  if (report.contentFactoryTargeting.blockedVisibilityPolicy.length < 3) failures.push('blocked_visibility_policy_missing');
  if (!report.releaseMeaning.includes('does not create, delete, rename, reorder, or mutate live Discord channels')) {
    failures.push('live_discord_mutation_disclaimer_missing');
  }
  return {
    ok: failures.length === 0,
    failures,
  };
}
