import { createDiscordContentDraft } from './content-approval';
import { createLeaderboardSnapshot } from './engagement';
import { buildWeeklyRecapContent } from './sage-commands';
import { recordDiscordEvent, recordDiscordScheduledRun } from './analytics';
import { postToChannelByBaseName } from './sage-rest';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  SAGEBOT_PERSONALITY_VERSION,
  SAGEBOT_PROMPT_VERSIONS,
  sageBotWeeklyRecapPolicyLine,
  scoreSageBotPolicyOutput,
} from './sagebot-personality';

export const DISCORD_WEEKLY_RECAP_PROMPT_VERSION = SAGEBOT_PROMPT_VERSIONS.weeklyRecap;

export type WeeklyRecapDraftInput = {
  now?: Date;
  metadata?: Record<string, unknown>;
};

export type WeeklyRecapDraftResult = {
  ok: boolean;
  draftId: string;
  weekKey: string;
  leaderboardSnapshotId: string;
  leaderboardCount: number;
  qualityScore: number;
  bodyPreview: string;
};

export type WeeklyRecapPublishResult = {
  ok: boolean;
  posted: boolean;
  skipped: boolean;
  reason?: 'no_approved_weekly_recap_draft' | 'already_published';
  weekKey: string;
  draftId: string | null;
  messageId: string | null;
};

export function discordWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function scoreWeeklyRecap(body: string): number {
  let score = 30;
  if (body.includes('# Weekly Recap')) score += 10;
  if (/\*\*Leaderboard\*\*/i.test(body)) score += 15;
  if (/\*\*Challenge recap\*\*/i.test(body)) score += 15;
  if (/\*\*Content queue\*\*/i.test(body)) score += 10;
  if (/\*\*Open questions\*\*/i.test(body)) score += 10;
  if (body.length >= 500) score += 10;
  return Math.max(0, Math.min(100, score));
}

export async function createWeeklyRecapDraft(input: WeeklyRecapDraftInput = {}): Promise<WeeklyRecapDraftResult> {
  const now = input.now ?? new Date();
  const weekKey = discordWeekKey(now);
  const leaderboardSnapshot = await createLeaderboardSnapshot({ now, periodKey: weekKey, limit: 10 });
  const body = await buildWeeklyRecapContent();
  const policyScore = scoreSageBotPolicyOutput(body, { maxLength: 4000 });
  const qualityScore = Math.min(scoreWeeklyRecap(body), policyScore.score);
  const draft = await createDiscordContentDraft({
    draftType: 'weekly_recap',
    targetChannelBaseName: 'weekly-recap',
    title: `Weekly Recap - ${weekKey}`,
    body,
    promptVersion: DISCORD_WEEKLY_RECAP_PROMPT_VERSION,
    qualityScore,
    status: 'pending_approval',
    metadata: {
      week_key: weekKey,
      leaderboard_snapshot_id: leaderboardSnapshot.id,
      leaderboard_count: leaderboardSnapshot.rankings.length,
      source: 'discord_weekly_recap_automation',
      personality_version: SAGEBOT_PERSONALITY_VERSION,
      prompt_version: DISCORD_WEEKLY_RECAP_PROMPT_VERSION,
      policy_line: sageBotWeeklyRecapPolicyLine(),
      policy_score: policyScore.score,
      policy_passed: policyScore.passed,
      policy_reasons: policyScore.reasons,
      policy_flags: policyScore.flags,
      ...(input.metadata ?? {}),
    },
  });
  return {
    ok: true,
    draftId: draft.id,
    weekKey,
    leaderboardSnapshotId: leaderboardSnapshot.id,
    leaderboardCount: leaderboardSnapshot.rankings.length,
    qualityScore,
    bodyPreview: body.slice(0, 300),
  };
}

export async function publishApprovedWeeklyRecapDraft(input: {
  now?: Date;
  source: string;
}): Promise<WeeklyRecapPublishResult> {
  const now = input.now ?? new Date();
  const weekKey = discordWeekKey(now);
  const alreadyPublished = await findPublishedWeeklyRecapDraft(weekKey);
  if (alreadyPublished) {
    await recordDiscordScheduledRun({
      runKey: `weekly-recap-${weekKey}`,
      kind: 'weekly_recap',
      status: 'skipped',
      messageId: alreadyPublished.published_message_id,
      metadata: { source: input.source, reason: 'already_published', draft_id: alreadyPublished.id },
    });
    return {
      ok: true,
      posted: false,
      skipped: true,
      reason: 'already_published',
      weekKey,
      draftId: alreadyPublished.id,
      messageId: alreadyPublished.published_message_id,
    };
  }

  const approved = await findApprovedWeeklyRecapDraft(weekKey);
  if (!approved) {
    await recordDiscordScheduledRun({
      runKey: `weekly-recap-${weekKey}`,
      kind: 'weekly_recap',
      status: 'skipped',
      metadata: { source: input.source, reason: 'no_approved_weekly_recap_draft' },
    });
    return {
      ok: false,
      posted: false,
      skipped: true,
      reason: 'no_approved_weekly_recap_draft',
      weekKey,
      draftId: null,
      messageId: null,
    };
  }

  const messageId = await postToChannelByBaseName(approved.target_channel_base_name, approved.body, {
    embed: true,
    title: 'Weekly Recap',
    variant: 'win',
    footer: 'Sage Ideas weekly rhythm',
  });
  await supabaseAdmin()
    .from('discord_content_drafts')
    .update({
      status: messageId ? 'published' : 'approved',
      published_message_id: messageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', approved.id);

  await recordDiscordScheduledRun({
    runKey: `weekly-recap-${weekKey}`,
    kind: 'weekly_recap',
    status: messageId ? 'posted' : 'failed',
    messageId,
    metadata: { source: input.source, draft_id: approved.id },
  });
  await recordDiscordEvent({
    eventType: messageId ? 'weekly_recap_posted' : 'weekly_recap_post_failed',
    commandName: input.source,
    channelBaseName: approved.target_channel_base_name,
    metadata: { message_id: messageId, draft_id: approved.id, week_key: weekKey },
  });

  return {
    ok: Boolean(messageId),
    posted: Boolean(messageId),
    skipped: false,
    weekKey,
    draftId: approved.id,
    messageId,
  };
}

async function findApprovedWeeklyRecapDraft(weekKey: string): Promise<{
  id: string;
  body: string;
  target_channel_base_name: string;
} | null> {
  const { data, error } = await supabaseAdmin()
    .from('discord_content_drafts')
    .select('id, body, target_channel_base_name, metadata')
    .eq('draft_type', 'weekly_recap')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; body: string; target_channel_base_name: string; metadata?: { week_key?: string } }>)
    .find((row) => row.metadata?.week_key === weekKey) ?? null;
}

async function findPublishedWeeklyRecapDraft(weekKey: string): Promise<{
  id: string;
  published_message_id: string | null;
} | null> {
  const { data, error } = await supabaseAdmin()
    .from('discord_content_drafts')
    .select('id, published_message_id, metadata')
    .eq('draft_type', 'weekly_recap')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; published_message_id: string | null; metadata?: { week_key?: string } }>)
    .find((row) => row.metadata?.week_key === weekKey) ?? null;
}
