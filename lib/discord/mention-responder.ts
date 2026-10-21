import { askSageFromDiscord } from './ask-sage';
import type { DiscordGatewayMessagePayload, NormalizedDiscordMessage } from './gateway-ingestion';
import { discordApi } from './sage-rest';

export type SageMentionResponsePlan = {
  shouldRespond: boolean;
  reason: string;
  question: string | null;
};

export type SageMentionIntent = 'casual' | 'thanks' | 'capability' | 'confused' | 'build_question';

export function detectSageMentionIntent(message: string): SageMentionIntent {
  const normalized = message.trim().toLowerCase();
  if (/\b(thanks|thank you|appreciate)\b/.test(normalized)) return 'thanks';
  if (/\bwhat can you do\b|\bhelp with\b/.test(normalized)) return 'capability';
  if (/\b(stuck|confused|lost|not sure where to start)\b/.test(normalized)) return 'confused';
  if (/\b(hey|hello|hi)\b.*\b(what'?s up|how are you)\b/.test(normalized)) return 'casual';
  if (/\b(how|what|why|where|when|should|build|ship|deploy|structure)\b|\?/.test(normalized)) return 'build_question';
  return 'casual';
}

function cleanEnv(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '').trim();
}

function mentionResponsesEnabled(): boolean {
  return ['true', '1', 'yes', 'on'].includes(cleanEnv(process.env.DISCORD_ENABLE_MENTION_RESPONSES)?.toLowerCase() ?? '');
}

function botUserId(): string | null {
  return cleanEnv(process.env.DISCORD_BOT_USER_ID)
    ?? cleanEnv(process.env.DISCORD_APPLICATION_ID)
    ?? cleanEnv(process.env.DISCORD_CLIENT_ID)
    ?? null;
}

export function stripDiscordBotMention(content: string, botId: string): string {
  const mentionPattern = new RegExp(`<@!?${botId}>`, 'g');
  return content.replace(mentionPattern, ' ').replace(/\s+/g, ' ').trim();
}

export function planSageMentionResponse(input: {
  payload: Pick<DiscordGatewayMessagePayload, 'content'> & { mentions?: Array<{ id?: string; bot?: boolean }> };
  normalizedMessage: Pick<NormalizedDiscordMessage, 'authorBot' | 'content' | 'authorUserId'>;
  botId?: string | null;
  enabled?: boolean;
}): SageMentionResponsePlan {
  if (!input.enabled) return { shouldRespond: false, reason: 'mention_responses_disabled', question: null };
  if (input.normalizedMessage.authorBot) return { shouldRespond: false, reason: 'author_is_bot', question: null };
  const botId = input.botId?.trim();
  if (!botId) return { shouldRespond: false, reason: 'bot_id_missing', question: null };

  const content = input.normalizedMessage.content || input.payload.content || '';
  const mentionedByPayload = (input.payload.mentions ?? []).some((mention) => mention.id === botId);
  const mentionedByText = content.includes(`<@${botId}>`) || content.includes(`<@!${botId}>`);
  if (!mentionedByPayload && !mentionedByText) {
    return { shouldRespond: false, reason: 'bot_not_mentioned', question: null };
  }

  const question = stripDiscordBotMention(content, botId);
  if (question.length < 8) return { shouldRespond: false, reason: 'question_too_short', question };
  if (question.length > 900) return { shouldRespond: false, reason: 'question_too_long', question: question.slice(0, 900) };
  return { shouldRespond: true, reason: 'bot_mentioned_with_question', question };
}

export async function maybeRespondToSageMention(input: {
  payload: DiscordGatewayMessagePayload;
  normalizedMessage: NormalizedDiscordMessage;
}): Promise<SageMentionResponsePlan & { postedMessageId?: string | null }> {
  const plan = planSageMentionResponse({
    payload: input.payload,
    normalizedMessage: input.normalizedMessage,
    botId: botUserId(),
    enabled: mentionResponsesEnabled(),
  });
  if (!plan.shouldRespond || !plan.question) return plan;

  const result = await askSageFromDiscord({
    question: plan.question,
    context: input.normalizedMessage.channelBaseName
      ? `Discord channel: ${input.normalizedMessage.channelBaseName}`
      : null,
    discordUserId: input.normalizedMessage.authorUserId,
    username: input.normalizedMessage.authorUsername,
	  });
	  const response = await discordApi<{ id: string }>(`/channels/${input.normalizedMessage.channelId}/messages`, {
	    method: 'POST',
	    body: JSON.stringify({
	      ...result.messagePayload,
	      message_reference: {
	        message_id: input.normalizedMessage.discordMessageId,
	        channel_id: input.normalizedMessage.channelId,
	        guild_id: input.normalizedMessage.guildId ?? undefined,
	        fail_if_not_exists: false,
	      },
	      allowed_mentions: { parse: [], replied_user: false },
	    }),
	  });

  return { ...plan, postedMessageId: response.id };
}
