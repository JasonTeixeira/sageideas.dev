import { supabaseAdmin } from '@/lib/supabase/server';
import { answerRagQuestion, type RagAnswerResult } from '@/lib/rag/retrieval';
import { SAGEBOT_PERSONALITY_VERSION, SAGEBOT_PROMPT_VERSIONS, scoreSageBotPolicyOutput } from './sagebot-personality';
import { validateRagUserInputSecurity } from './security-privacy';
import { buildSageAnswerEmbed, type DiscordMessagePayload } from './message-formatting';

const DISCORD_LIMIT = 1900;

export type AskSageDiscordInput = {
  question: string;
  context?: string | null;
  discordUserId?: string | null;
  username?: string | null;
};

export type AskSageDiscordResult = RagAnswerResult & {
  formatted: string;
  messagePayload: DiscordMessagePayload;
  normalizedQuestion: string;
};

export function normalizeAskSageQuestion(input: Pick<AskSageDiscordInput, 'question' | 'context'>): string {
  const question = input.question.replace(/\s+/g, ' ').trim();
  const context = input.context?.replace(/\s+/g, ' ').trim();
  if (question.length < 8) throw new Error('Ask a more specific question so SageBot can retrieve useful context.');
  if (question.length > 900) throw new Error('Question is too long. Keep it under 900 characters.');
  if (context && context.length > 700) throw new Error('Context is too long. Keep it under 700 characters.');
  validateRagUserInputSecurity({ question, context });
  return context ? `${question}\n\nMember context: ${context}` : question;
}

export async function askSageFromDiscord(input: AskSageDiscordInput): Promise<AskSageDiscordResult> {
  const normalizedQuestion = normalizeAskSageQuestion(input);
  const result = await answerRagQuestion(supabaseAdmin(), normalizedQuestion, { limit: 5, persist: true });
  return {
    ...result,
    normalizedQuestion,
    formatted: formatAskSageDiscordAnswer(input.question, result),
    messagePayload: formatAskSageDiscordMessage(input.question, result),
  };
}

export function formatAskSageDiscordMessage(question: string, result: RagAnswerResult): DiscordMessagePayload {
  const citations = result.citations
    .slice(0, 5)
    .map((citation, index) => {
      const title = citation.title ?? citation.source_type;
      return `[${index + 1}] ${title}${citation.source_url ? ` - ${citation.source_url}` : ''}`;
    });
  return buildSageAnswerEmbed({
    question,
    answer: result.answer,
    sources: citations,
    answerId: result.answerId,
  });
}

export function formatAskSageDiscordAnswer(question: string, result: RagAnswerResult): string {
  const showPromptVersion = process.env.DISCORD_SHOW_PROMPT_VERSION === 'true';
  const citations = result.citations
    .slice(0, 5)
    .map((citation, index) => {
      const title = citation.title ?? citation.source_type;
      return `[${index + 1}] ${title}${citation.source_url ? ` - ${citation.source_url}` : ''}`;
    });

  const content = [
    '# Sage reply',
    `**Question:** ${question.trim()}`,
    '',
    result.answer.trim(),
    '',
    citations.length ? '**Sources**' : '**Sources:** No matching source chunks found.',
    ...citations,
    '',
    showPromptVersion ? `Prompt: \`${SAGEBOT_PROMPT_VERSIONS.answer}\` / \`${SAGEBOT_PERSONALITY_VERSION}\`` : null,
    showPromptVersion ? `Policy score: \`${scoreSageBotPolicyOutput(result.answer, { requireCitation: citations.length > 0 }).score}\`` : null,
    result.answerId ? `Answer ID: \`${result.answerId}\`` : null,
  ].filter(Boolean).join('\n');

  if (content.length <= DISCORD_LIMIT) return content;
  const suffix = result.answerId ? `\n\nAnswer ID: \`${result.answerId}\`` : '';
  return `${content.slice(0, DISCORD_LIMIT - suffix.length - 20).trim()}\n\n...trimmed${suffix}`;
}
