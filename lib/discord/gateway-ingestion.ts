import { supabaseAdmin } from '@/lib/supabase/server';
import { isApprovedDiscordMember, type MemberApplicationProfile } from './engagement';
import { captureDiscordKnowledgeCandidateFromMessage } from './knowledge-candidates';
import { approveDiscordMember } from './onboarding';
import { baseDiscordName } from './sage-rest';

type Json = Record<string, unknown>;

export type DiscordGatewayAuthor = {
  id?: string;
  username?: string;
  global_name?: string | null;
  bot?: boolean;
};

export type DiscordGatewayAttachment = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  url?: string;
};

export type DiscordGatewayMessagePayload = {
  id: string;
  guild_id?: string;
  channel_id: string;
  author?: DiscordGatewayAuthor;
  member?: { nick?: string | null };
  content?: string;
  timestamp?: string;
  edited_timestamp?: string | null;
  type?: number;
  attachments?: DiscordGatewayAttachment[];
  referenced_message?: { id?: string } | null;
  message_reference?: { message_id?: string; channel_id?: string; guild_id?: string } | null;
  thread?: { id?: string; name?: string } | null;
};

export type DiscordGatewayReactionPayload = {
  user_id: string;
  guild_id?: string;
  channel_id: string;
  message_id: string;
  emoji?: { id?: string | null; name?: string | null };
};

export type DiscordGatewayThreadPayload = {
  id: string;
  guild_id?: string;
  parent_id?: string | null;
  owner_id?: string | null;
  name?: string;
  thread_metadata?: {
    archived?: boolean;
    locked?: boolean;
    create_timestamp?: string;
  };
};

export type DiscordGatewayGuildMemberPayload = {
  guild_id?: string;
  user?: {
    id?: string;
    username?: string;
    global_name?: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  pending?: boolean;
  roles?: string[];
  joined_at?: string;
};

export type NormalizedDiscordMessage = {
  discordMessageId: string;
  guildId: string | null;
  channelId: string;
  channelBaseName: string | null;
  authorUserId: string | null;
  authorUsername: string | null;
  authorBot: boolean;
  content: string;
  detectedKind: 'question' | 'answer' | 'project' | 'review' | 'win' | 'resource' | 'general';
  hasAttachments: boolean;
  attachmentCount: number;
  linkCount: number;
  messageType: number | null;
  threadId: string | null;
  referencedMessageId: string | null;
  capturedAt: string;
  editedAt: string | null;
  raw: Json;
};

const QUESTION_RE = /(^|\s)(how|what|why|where|when|can|could|should|is|are|do|does|did)\b|[?？]\s*$/i;
const URL_RE = /\bhttps?:\/\/[^\s<>)]+/gi;

export function detectDiscordMessageKind(input: {
  channelBaseName?: string | null;
  content?: string | null;
  referencedMessageId?: string | null;
}): NormalizedDiscordMessage['detectedKind'] {
  const channel = input.channelBaseName ?? '';
  const content = (input.content ?? '').toLowerCase();
  if (channel === 'weekly-recap') return 'win';
  if (channel === 'review-queue') return 'review';
  if (channel === 'resources') return 'resource';
  if (channel === 'build-lab') return 'project';
  if (input.referencedMessageId || /^(answer|re:|here is|here's)\b/.test(content)) return 'answer';
  if (QUESTION_RE.test(content)) return 'question';
  return 'general';
}

export function countLinks(content: string): number {
  return content.match(URL_RE)?.length ?? 0;
}

export function shouldRunNativeScreeningApproval(input: {
  pending?: boolean | null;
  hadPendingMarker: boolean;
  alreadyApproved: boolean;
  bot?: boolean | null;
}): boolean {
  return input.pending === false && input.hadPendingMarker && !input.alreadyApproved && !input.bot;
}

export function normalizeDiscordGatewayMessage(
  payload: DiscordGatewayMessagePayload,
  channelName?: string | null,
): NormalizedDiscordMessage {
  const channelBaseName = channelName ? baseDiscordName(channelName) : null;
  const content = String(payload.content ?? '').trim();
  const referencedMessageId = payload.referenced_message?.id ?? payload.message_reference?.message_id ?? null;
  return {
    discordMessageId: payload.id,
    guildId: payload.guild_id ?? null,
    channelId: payload.channel_id,
    channelBaseName,
    authorUserId: payload.author?.id ?? null,
    authorUsername: payload.member?.nick ?? payload.author?.global_name ?? payload.author?.username ?? null,
    authorBot: Boolean(payload.author?.bot),
    content,
    detectedKind: detectDiscordMessageKind({ channelBaseName, content, referencedMessageId }),
    hasAttachments: Boolean(payload.attachments?.length),
    attachmentCount: payload.attachments?.length ?? 0,
    linkCount: countLinks(content),
    messageType: typeof payload.type === 'number' ? payload.type : null,
    threadId: payload.thread?.id ?? null,
    referencedMessageId,
    capturedAt: payload.timestamp ?? new Date().toISOString(),
    editedAt: payload.edited_timestamp ?? null,
    raw: payload as unknown as Json,
  };
}

export async function recordDiscordGatewayEvent(input: {
  eventType: string;
  discordMessageId?: string | null;
  channelId?: string | null;
  authorUserId?: string | null;
  payload?: Json;
}): Promise<void> {
  try {
    await supabaseAdmin().from('discord_gateway_events').insert({
      event_type: input.eventType,
      discord_message_id: input.discordMessageId ?? null,
      channel_id: input.channelId ?? null,
      author_user_id: input.authorUserId ?? null,
      payload: input.payload ?? {},
    });
  } catch (err) {
    console.warn('[discord/gateway] event insert failed', err instanceof Error ? err.message : err);
  }
}

export async function recordDiscordGatewayHeartbeat(input: {
  workerId: string;
  status: 'starting' | 'connected' | 'ready' | 'resumed' | 'heartbeat_ack' | 'reconnecting' | 'closed' | 'failed';
  sessionId?: string | null;
  sequence?: number | null;
  resumeGatewayUrl?: string | null;
  lastCloseCode?: number | null;
  lastCloseReason?: string | null;
  metadata?: Json;
}): Promise<void> {
  try {
    let previousMetadata: Record<string, unknown> = {};
    try {
      const { data } = await supabaseAdmin()
        .from('discord_gateway_heartbeats')
        .select('metadata')
        .eq('worker_id', input.workerId)
        .maybeSingle();
      previousMetadata = typeof data?.metadata === 'object' && data.metadata ? data.metadata as Record<string, unknown> : {};
    } catch (err) {
      console.warn('[discord/gateway] heartbeat metadata read failed', err instanceof Error ? err.message : err);
    }
    const nextMetadata = typeof input.metadata === 'object' && input.metadata ? input.metadata as Record<string, unknown> : {};
    const metadata = { ...previousMetadata, ...nextMetadata } as Json;
    await supabaseAdmin().from('discord_gateway_heartbeats').upsert({
      worker_id: input.workerId,
      status: input.status,
      session_id: input.sessionId ?? null,
      sequence: input.sequence ?? null,
      resume_gateway_url: input.resumeGatewayUrl ?? null,
      last_close_code: input.lastCloseCode ?? null,
      last_close_reason: input.lastCloseReason ?? null,
      metadata,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'worker_id' });
  } catch (err) {
    console.warn('[discord/gateway] heartbeat upsert failed', err instanceof Error ? err.message : err);
  }
}

export async function recordDiscordGatewaySession(input: {
  workerId: string;
  sessionId: string;
  sequence?: number | null;
  resumeGatewayUrl?: string | null;
  status: 'ready' | 'resumed' | 'closed' | 'invalidated';
  metadata?: Json;
}): Promise<void> {
  try {
    await supabaseAdmin().from('discord_gateway_sessions').upsert({
      worker_id: input.workerId,
      session_id: input.sessionId,
      sequence: input.sequence ?? null,
      resume_gateway_url: input.resumeGatewayUrl ?? null,
      status: input.status,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'worker_id' });
  } catch (err) {
    console.warn('[discord/gateway] session upsert failed', err instanceof Error ? err.message : err);
  }
}

export async function getLatestDiscordGatewaySession(workerId: string): Promise<{
  sessionId: string;
  sequence: number | null;
  resumeGatewayUrl: string | null;
  metadata: Json;
} | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('discord_gateway_sessions')
      .select('session_id, sequence, resume_gateway_url, status, metadata')
      .eq('worker_id', workerId)
      .maybeSingle();
    if (error || !data || data.status === 'invalidated') return null;
    return {
      sessionId: String(data.session_id),
      sequence: data.sequence == null ? null : Number(data.sequence),
      resumeGatewayUrl: data.resume_gateway_url ? String(data.resume_gateway_url) : null,
      metadata: typeof data.metadata === 'object' && data.metadata ? data.metadata as Json : {},
    };
  } catch (err) {
    console.warn('[discord/gateway] session read failed', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function recordDiscordGatewayDeadLetter(input: {
  workerId: string;
  eventType: string;
  error: string;
  payload?: Json;
  retryable?: boolean;
  sequence?: number | null;
}): Promise<void> {
  try {
    await supabaseAdmin().from('discord_gateway_dead_letters').insert({
      worker_id: input.workerId,
      event_type: input.eventType,
      error: input.error,
      payload: input.payload ?? {},
      retryable: input.retryable ?? true,
      sequence: input.sequence ?? null,
    });
  } catch (err) {
    console.warn('[discord/gateway] dead letter insert failed', err instanceof Error ? err.message : err);
  }
}

export async function recordDiscordMessageCreate(
  payload: DiscordGatewayMessagePayload,
  channelName?: string | null,
): Promise<NormalizedDiscordMessage | null> {
  const message = normalizeDiscordGatewayMessage(payload, channelName);
  if (message.authorBot) {
    await recordDiscordGatewayEvent({
      eventType: 'message_create_bot_skipped',
      discordMessageId: message.discordMessageId,
      channelId: message.channelId,
      authorUserId: message.authorUserId,
      payload: { channel_base_name: message.channelBaseName },
    });
    return null;
  }

  const sb = supabaseAdmin();
  try {
    await sb.from('discord_messages').upsert({
      discord_message_id: message.discordMessageId,
      guild_id: message.guildId,
      channel_id: message.channelId,
      channel_base_name: message.channelBaseName,
      author_user_id: message.authorUserId,
      author_username: message.authorUsername,
      author_bot: message.authorBot,
      content: message.content,
      detected_kind: message.detectedKind,
      has_attachments: message.hasAttachments,
      attachment_count: message.attachmentCount,
      link_count: message.linkCount,
      message_type: message.messageType,
      thread_id: message.threadId,
      referenced_message_id: message.referencedMessageId,
      captured_at: message.capturedAt,
      edited_at: message.editedAt,
      raw: message.raw,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'discord_message_id' });
    await recordDiscordGatewayEvent({
      eventType: 'message_create',
      discordMessageId: message.discordMessageId,
      channelId: message.channelId,
      authorUserId: message.authorUserId,
      payload: { detected_kind: message.detectedKind, channel_base_name: message.channelBaseName },
    });
    try {
      const candidate = await captureDiscordKnowledgeCandidateFromMessage(sb, message);
      await recordDiscordGatewayEvent({
        eventType: candidate.queued ? 'message_candidate_queued' : 'message_candidate_skipped',
        discordMessageId: message.discordMessageId,
        channelId: message.channelId,
        authorUserId: message.authorUserId,
        payload: {
          category: candidate.classification.category,
          recommended_action: candidate.classification.recommended_action,
          confidence: candidate.classification.confidence,
          quality_score: candidate.classification.quality_score,
          content_value_score: candidate.classification.content_value_score,
          queue_id: candidate.queueId,
          reason: candidate.reason,
        },
      });
    } catch (err) {
      await recordDiscordGatewayDeadLetter({
        workerId: 'gateway-ingestion',
        eventType: 'message_candidate_failed',
        error: err instanceof Error ? err.message : String(err),
        payload: { discord_message_id: message.discordMessageId, channel_id: message.channelId },
      });
      await recordDiscordGatewayEvent({
        eventType: 'message_candidate_failed',
        discordMessageId: message.discordMessageId,
        channelId: message.channelId,
        authorUserId: message.authorUserId,
        payload: { error: err instanceof Error ? err.message : String(err) },
      });
    }
    return message;
  } catch (err) {
    await recordDiscordGatewayEvent({
      eventType: 'message_create_failed',
      discordMessageId: message.discordMessageId,
      channelId: message.channelId,
      authorUserId: message.authorUserId,
      payload: { error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

export async function recordDiscordMessageUpdate(
  payload: Partial<DiscordGatewayMessagePayload> & { id: string; channel_id?: string },
  channelName?: string | null,
): Promise<void> {
  const updates: Record<string, unknown> = {
    edited_at: payload.edited_timestamp ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    raw: payload as Json,
  };
  if (payload.content !== undefined) {
    const content = String(payload.content ?? '').trim();
    const channelBaseName = channelName ? baseDiscordName(channelName) : null;
    updates.content = content;
    updates.link_count = countLinks(content);
    updates.detected_kind = detectDiscordMessageKind({ channelBaseName, content });
  }
  if (channelName) updates.channel_base_name = baseDiscordName(channelName);

  await supabaseAdmin().from('discord_messages').update(updates).eq('discord_message_id', payload.id);
  await recordDiscordGatewayEvent({
    eventType: 'message_update',
    discordMessageId: payload.id,
    channelId: payload.channel_id ?? null,
    payload: updates,
  });
}

export async function recordDiscordMessageDelete(payload: { id: string; channel_id?: string }): Promise<void> {
  await supabaseAdmin()
    .from('discord_messages')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('discord_message_id', payload.id);
  await recordDiscordGatewayEvent({
    eventType: 'message_delete',
    discordMessageId: payload.id,
    channelId: payload.channel_id ?? null,
  });
}

export async function recordDiscordReaction(
  action: 'add' | 'remove',
  payload: DiscordGatewayReactionPayload,
): Promise<void> {
  const emoji = payload.emoji?.id ? `${payload.emoji.name ?? 'emoji'}:${payload.emoji.id}` : payload.emoji?.name ?? 'unknown';
  await supabaseAdmin().from('discord_reactions').insert({
    action,
    discord_message_id: payload.message_id,
    channel_id: payload.channel_id,
    guild_id: payload.guild_id ?? null,
    user_id: payload.user_id,
    emoji,
    raw: payload as unknown as Json,
  });
  await recordDiscordGatewayEvent({
    eventType: `reaction_${action}`,
    discordMessageId: payload.message_id,
    channelId: payload.channel_id,
    authorUserId: payload.user_id,
    payload: { emoji },
  });
}

export async function recordDiscordThread(payload: DiscordGatewayThreadPayload): Promise<void> {
  await supabaseAdmin().from('discord_threads').upsert({
    thread_id: payload.id,
    guild_id: payload.guild_id ?? null,
    parent_channel_id: payload.parent_id ?? null,
    owner_user_id: payload.owner_id ?? null,
    name: payload.name ?? null,
    archived: Boolean(payload.thread_metadata?.archived),
    locked: Boolean(payload.thread_metadata?.locked),
    created_at: payload.thread_metadata?.create_timestamp ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    raw: payload as unknown as Json,
  }, { onConflict: 'thread_id' });
  await recordDiscordGatewayEvent({
    eventType: 'thread_upsert',
    discordMessageId: payload.id,
    channelId: payload.parent_id ?? null,
    authorUserId: payload.owner_id ?? null,
    payload: { name: payload.name ?? null },
  });
}

async function hasNativeScreeningPendingMarker(discordUserId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('discord_gateway_events')
    .select('id')
    .eq('event_type', 'member_screening_pending')
    .eq('author_user_id', discordUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

function nativeScreeningProfile(payload: DiscordGatewayGuildMemberPayload): MemberApplicationProfile {
  const user = payload.user ?? {};
  const username = payload.nick ?? user.global_name ?? user.username ?? null;
  return {
    discordUserId: String(user.id ?? ''),
    username,
    goal: 'Completed Discord native member application.',
    experience: 'Captured through Discord native screening.',
    intendedBuild: 'Run Sage Ideas onboarding and choose a first project.',
    pathKey: null,
    levelKey: 'beginner',
    timezone: null,
    weeklyTimeBudget: null,
    primaryGoal: 'Complete Sage Ideas Academy onboarding.',
    preferredSupport: 'questions',
    portfolioUrl: null,
    referralSource: 'discord_native_screening',
    submittedAt: new Date().toISOString(),
  };
}

export async function recordDiscordGuildMemberUpdate(payload: DiscordGatewayGuildMemberPayload): Promise<void> {
  const discordUserId = payload.user?.id ? String(payload.user.id) : null;
  if (!discordUserId) {
    await recordDiscordGatewayEvent({
      eventType: 'guild_member_update_skipped',
      payload: { reason: 'missing_user_id', pending: payload.pending ?? null },
    });
    return;
  }

  const username = payload.nick ?? payload.user?.global_name ?? payload.user?.username ?? null;
  const basePayload = {
    guild_id: payload.guild_id ?? null,
    username,
    pending: payload.pending ?? null,
    role_count: payload.roles?.length ?? 0,
  };

  if (payload.user?.bot) {
    await recordDiscordGatewayEvent({
      eventType: 'guild_member_update_bot_skipped',
      authorUserId: discordUserId,
      payload: basePayload,
    });
    return;
  }

  if (payload.pending === true) {
    await recordDiscordGatewayEvent({
      eventType: 'member_screening_pending',
      authorUserId: discordUserId,
      payload: basePayload,
    });
    return;
  }

  const [hadPendingMarker, alreadyApproved] = await Promise.all([
    hasNativeScreeningPendingMarker(discordUserId),
    isApprovedDiscordMember(discordUserId),
  ]);

  if (!shouldRunNativeScreeningApproval({
    pending: payload.pending,
    hadPendingMarker,
    alreadyApproved,
    bot: payload.user?.bot,
  })) {
    await recordDiscordGatewayEvent({
      eventType: 'guild_member_update_ignored',
      authorUserId: discordUserId,
      payload: { ...basePayload, had_pending_marker: hadPendingMarker, already_approved: alreadyApproved },
    });
    return;
  }

  await approveDiscordMember({
    discordUserId,
    username,
    reviewer: 'discord-native-screening',
    commandName: 'native-screening',
    application: nativeScreeningProfile(payload),
  });
  await recordDiscordGatewayEvent({
    eventType: 'member_screening_approved',
    authorUserId: discordUserId,
    payload: basePayload,
  });
}
