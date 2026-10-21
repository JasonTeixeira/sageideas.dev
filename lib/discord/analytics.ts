import { supabaseAdmin } from '@/lib/supabase/server';

type Json = Record<string, unknown>;

export type DiscordEventInput = {
  eventType: string;
  commandName?: string | null;
  discordUserId?: string | null;
  discordUsername?: string | null;
  channelBaseName?: string | null;
  metadata?: Json;
};

export async function recordDiscordEvent(input: DiscordEventInput): Promise<void> {
  try {
    await supabaseAdmin().from('discord_events').insert({
      event_type: input.eventType,
      command_name: input.commandName ?? null,
      discord_user_id: input.discordUserId ?? null,
      discord_username: input.discordUsername ?? null,
      channel_base_name: input.channelBaseName ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.warn('[discord/analytics] event insert failed', err instanceof Error ? err.message : err);
  }
}

export async function upsertDiscordMember(input: {
  discordUserId: string;
  username?: string | null;
  pathKey?: string | null;
  levelKey?: string | null;
  timezone?: string | null;
  weeklyTimeBudget?: string | null;
  primaryGoal?: string | null;
  preferredSupport?: string | null;
  portfolioUrl?: string | null;
  referralSource?: string | null;
  onboardingCompletedAt?: string | null;
  academyMember?: boolean;
}): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      discord_user_id: input.discordUserId,
      academy_member: input.academyMember ?? true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (input.username !== undefined) row.username = input.username;
    if (input.pathKey !== undefined) row.path_key = input.pathKey;
    if (input.levelKey !== undefined) row.level_key = input.levelKey;
    if (input.timezone !== undefined) row.timezone = input.timezone;
    if (input.weeklyTimeBudget !== undefined) row.weekly_time_budget = input.weeklyTimeBudget;
    if (input.primaryGoal !== undefined) row.primary_goal = input.primaryGoal;
    if (input.preferredSupport !== undefined) row.preferred_support = input.preferredSupport;
    if (input.portfolioUrl !== undefined) row.portfolio_url = input.portfolioUrl;
    if (input.referralSource !== undefined) row.referral_source = input.referralSource;
    if (input.onboardingCompletedAt !== undefined) row.onboarding_completed_at = input.onboardingCompletedAt;

    await supabaseAdmin().from('discord_members').upsert(
      row,
      { onConflict: 'discord_user_id' },
    );
  } catch (err) {
    console.warn('[discord/analytics] member upsert failed', err instanceof Error ? err.message : err);
  }
}

export async function getDiscordMemberRouting(discordUserId: string): Promise<{
  pathKey: string | null;
  levelKey: string | null;
}> {
  try {
    const { data } = await supabaseAdmin()
      .from('discord_members')
      .select('path_key, level_key')
      .eq('discord_user_id', discordUserId)
      .maybeSingle();
    return {
      pathKey: data?.path_key ? String(data.path_key) : null,
      levelKey: data?.level_key ? String(data.level_key) : null,
    };
  } catch (err) {
    console.warn('[discord/analytics] member routing read failed', err instanceof Error ? err.message : err);
    return { pathKey: null, levelKey: null };
  }
}

export async function updateDiscordPremium(input: {
  discordUserId: string;
  username?: string | null;
  premiumMember: boolean;
  premiumStatus: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin().from('discord_members').upsert(
    {
      discord_user_id: input.discordUserId,
      username: input.username ?? null,
      academy_member: true,
      premium_member: input.premiumMember,
      premium_status: input.premiumStatus,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      premium_role_synced_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'discord_user_id' },
  );
  if (error) {
    throw new Error(`Discord premium persistence failed: ${error.message}`);
  }
}

export async function recordDiscordScheduledRun(input: {
  runKey: string;
  kind: 'daily_signal' | 'weekly_recap' | 'learning_lab' | 'content_factory';
  status: 'drafted' | 'published' | 'posted' | 'skipped' | 'failed';
  messageId?: string | null;
  metadata?: Json;
}): Promise<void> {
  try {
    await supabaseAdmin().from('discord_scheduled_runs').upsert(
      {
        run_key: input.runKey,
        kind: input.kind,
        status: input.status,
        message_id: input.messageId ?? null,
        metadata: input.metadata ?? {},
        posted_at: new Date().toISOString(),
      },
      { onConflict: 'run_key' },
    );
  } catch (err) {
    console.warn('[discord/analytics] scheduled run insert failed', err instanceof Error ? err.message : err);
  }
}
