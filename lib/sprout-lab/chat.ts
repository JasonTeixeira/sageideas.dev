import { askSageFromDiscord } from '@/lib/discord/ask-sage';

export type SproutLabCitation = {
  title: string;
  sourceType: string;
  sourceUrl: string | null;
};

export type SproutLabReply = {
  ok: true;
  mode: 'rag';
  answer: string;
  displayAnswer: string;
  normalizedQuestion: string;
  answerId: string | null;
  citations: SproutLabCitation[];
  sourceCount: number;
  debug: Record<string, unknown>;
} | {
  ok: false;
  mode: 'error';
  answer: string;
  displayAnswer: string;
  normalizedQuestion: string;
  answerId: null;
  citations: SproutLabCitation[];
  sourceCount: 0;
  debug: Record<string, unknown>;
};

const MAX_MESSAGE_CHARS = 900;

export function assertSproutLabEnabled(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.SPROUT_LAB_ENABLED === 'true') return;
  throw new Error('Sprout Lab is local-only unless SPROUT_LAB_ENABLED=true.');
}

export function normalizeSproutLabMessage(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Message must be text.');
  const message = value.replace(/\s+/g, ' ').trim();
  if (message.length < 2) throw new Error('Give Sprout at least a few words.');
  if (message.length > MAX_MESSAGE_CHARS) {
    throw new Error(`Keep the lab message under ${MAX_MESSAGE_CHARS} characters.`);
  }
  return message;
}

export function compactSproutAnswer(answer: string): string {
  const cleaned = answer
    .replace(/^#\s*Sage(?:Bot)?\s+(?:reply|answer)\s*/i, '')
    .replace(/\n?\*\*(Sources?|Reference):?\*\*[\s\S]*$/i, '')
    .replace(/\n?Sources?:[\s\S]*$/i, '')
    .replace(/\n?Reference:[\s\S]*$/i, '')
    .replace(/\s*\[\d+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length <= 1200) return cleaned;
  return `${cleaned.slice(0, 1180).trim()}...`;
}

function friendlyFailure(message: string): string {
  return [
    'I could not finish the full answer path from the lab.',
    '',
    'That is useful, not bad: this means the lab caught a real runtime gap before we pushed the behavior into Discord.',
    '',
    `What failed: ${message}`,
  ].join('\n');
}

export async function buildSproutLabReply(message: string): Promise<SproutLabReply> {
  const normalizedMessage = normalizeSproutLabMessage(message);
  assertSproutLabEnabled();

  try {
    const result = await askSageFromDiscord({
      question: normalizedMessage,
      context: 'Local Sprout Lab voice/personality test. Answer warmly, concretely, and briefly.',
      username: 'Local Operator',
    });

    const citations = result.citations.slice(0, 5).map((citation) => ({
      title: citation.title ?? citation.source_type,
      sourceType: citation.source_type,
      sourceUrl: citation.source_url ?? null,
    }));

    return {
      ok: true,
      mode: 'rag',
      answer: result.answer,
      displayAnswer: compactSproutAnswer(result.answer),
      normalizedQuestion: result.normalizedQuestion,
      answerId: result.answerId ?? null,
      citations,
      sourceCount: citations.length,
      debug: {
        promptMode: 'askSageFromDiscord',
        retrievalPersisted: true,
        formattedPayloadType: result.messagePayload.embeds?.length ? 'discord_embed' : 'content',
      },
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      mode: 'error',
      answer: friendlyFailure(messageText),
      displayAnswer: friendlyFailure(messageText),
      normalizedQuestion: normalizedMessage,
      answerId: null,
      citations: [],
      sourceCount: 0,
      debug: {
        promptMode: 'askSageFromDiscord',
        failure: messageText,
      },
    };
  }
}
