export type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type DiscordEmbedPayload = {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
};

export type DiscordMessagePayload = {
  content?: string;
  embeds?: DiscordEmbedPayload[];
  allowed_mentions?: Record<string, unknown>;
  message_reference?: Record<string, unknown>;
};

export const SAGE_DISCORD_COLORS = {
  sage: 0x35d07f,
  signal: 0xf2c94c,
  answer: 0x50a7ff,
  win: 0xb36bff,
  warning: 0xff6b6b,
} as const;

const FIELD_LIMIT = 1024;
const DESCRIPTION_LIMIT = 3800;

function cleanMarkdownTitle(value: string): string {
  return value
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function clamp(value: string, limit: number): string {
  const clean = value.trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, Math.max(0, limit - 18)).trim()}...`;
}

function stripTopHeading(body: string): { title: string | null; rest: string } {
  const lines = body.trim().split('\n');
  const first = lines[0]?.trim() ?? '';
  if (/^#\s+/.test(first)) {
    return { title: cleanMarkdownTitle(first), rest: lines.slice(1).join('\n').trim() };
  }
  return { title: null, rest: body.trim() };
}

function splitMarkdownSections(body: string): { intro: string; fields: DiscordEmbedField[] } {
  const lines = body.split('\n');
  const introLines: string[] = [];
  const fields: DiscordEmbedField[] = [];
  let current: { name: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const value = current.lines.join('\n').trim();
    if (value) fields.push({ name: current.name, value: clamp(value, FIELD_LIMIT), inline: false });
    current = null;
  };

  for (const line of lines) {
	  const section = line.match(/^\*\*([^:*]{2,48}):\*\*\s*(.*)$/);
    if (section) {
      flush();
      current = { name: cleanMarkdownTitle(section[1]), lines: [section[2] ?? ''].filter(Boolean) };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }
  flush();

  return {
    intro: introLines.join('\n').trim(),
    fields: fields.slice(0, 8),
  };
}

function formatSourceList(sources: string[]): string {
  return sources
    .slice(0, 5)
    .map((source, index) => `${index + 1}. ${source}`)
    .join('\n');
}

export function buildSageContentEmbed(input: {
  title?: string | null;
  body: string;
  variant?: keyof typeof SAGE_DISCORD_COLORS;
  footer?: string | null;
  fallbackIntro?: string;
}): DiscordMessagePayload {
  const { title, rest } = stripTopHeading(input.body);
  const sections = splitMarkdownSections(rest);
  const embedTitle = cleanMarkdownTitle(input.title || title || 'Sage Ideas');
  const description = sections.intro
    ? clamp(sections.intro, DESCRIPTION_LIMIT)
    : clamp(input.fallbackIntro || 'A useful build note from Sage Ideas. Pick one concrete next move and ship it.', DESCRIPTION_LIMIT);

  return {
    embeds: [{
      title: embedTitle,
      description,
      color: SAGE_DISCORD_COLORS[input.variant ?? 'sage'],
      fields: sections.fields.length ? sections.fields : undefined,
      footer: input.footer ? { text: input.footer } : { text: 'Sage Ideas Academy' },
    }],
    allowed_mentions: { parse: [] },
  };
}

export function buildSageAnswerEmbed(input: {
  question: string;
  answer: string;
  sources: string[];
  answerId?: string | null;
}): DiscordMessagePayload {
  const answer = input.answer
    .replace(/^#\s*Sage(?:Bot)?\s+(?:answer|reply)\s*/i, '')
    .replace(/^\*\*Question:\*\*.*$/im, '')
    .replace(/\s*\[\d+\]/g, '')
    .trim();
	  const sourceText = input.sources.length
	    ? formatSourceList(input.sources)
	    : 'No strong source match yet. Treat this as a starting point and ask for a narrower follow-up.';

	  return {
	    embeds: [{
	      title: 'Sprout',
	      description: 'You brought a real blocker. Let’s turn it into a useful next move and a visible artifact.',
      color: SAGE_DISCORD_COLORS.answer,
      fields: [
        { name: 'Here’s the move', value: clamp(answer, FIELD_LIMIT), inline: false },
        { name: 'Next step', value: 'Try the smallest step above, then share the artifact or exact blocker so we can tighten it.', inline: false },
        { name: 'Source check', value: clamp(sourceText, FIELD_LIMIT), inline: false },
      ],
      footer: { text: input.answerId ? `Sprout · ${input.answerId}` : 'Sprout · Sage Ideas Academy' },
    }],
    allowed_mentions: { parse: [] },
  };
}

export type SageConversationIntent = 'casual' | 'thanks' | 'capability' | 'confused' | 'build_question';

function inferConversationIntent(message: string): SageConversationIntent {
  const normalized = message.trim().toLowerCase();
  if (/\b(thanks|thank you|appreciate)\b/.test(normalized)) return 'thanks';
  if (/\bwhat can you do\b|\bhelp with\b/.test(normalized)) return 'capability';
  if (/\b(stuck|confused|lost|not sure where to start)\b/.test(normalized)) return 'confused';
  if (/\b(hey|hello|hi)\b.*\b(what'?s up|how are you)\b/.test(normalized)) return 'casual';
  if (/\b(how|what|why|where|when|should|build|ship|deploy|structure)\b|\?/.test(normalized)) return 'build_question';
  return 'casual';
}

export function buildSageConversationEmbed(input: {
  displayName?: string | null;
  message: string;
  intent?: SageConversationIntent;
}): DiscordMessagePayload {
  const intent = input.intent ?? inferConversationIntent(input.message);
  const displayName = input.displayName?.trim() || 'there';
  const content = {
    casual: {
      description: `I’m good, ${displayName}—glad you’re here. Bring me the thing you’re trying to learn, build, debug, or ship.`,
      fields: [
        { name: 'What I can help with', value: 'Learning paths, code, AI systems, cloud, networking, automation, and practical project decisions.' },
        { name: 'Try me', value: 'Tell me what you are building, what you tried, and the exact blocker.' },
      ],
    },
    thanks: {
      description: `You’ve got it, ${displayName}. Keep the momentum and turn the answer into one visible artifact.`,
      fields: [
        { name: 'Lock it in', value: 'Write the principle from memory and use it once without looking back.' },
        { name: 'Next rep', value: 'Change one constraint and solve the same class of problem again.' },
      ],
    },
    capability: {
      description: 'I’m Sprout, your practical Sage Ideas learning and building partner.',
      fields: [
        { name: 'Learn', value: 'I can explain concepts, quiz your recall, diagnose misconceptions, and route the next lesson.' },
        { name: 'Build', value: 'I can help scope, implement, test, review, and harden useful projects without pretending unproven work is production-ready.' },
      ],
    },
    confused: {
      description: 'No stress. We’ll shrink the problem until the next move is obvious and testable.',
      fields: [
        { name: 'Start here', value: 'Name the outcome you want and show me the smallest artifact or error you have.' },
        { name: 'Then', value: 'We will choose one next action, verify it, and build from evidence.' },
      ],
    },
    build_question: {
      description: 'Let’s turn the question into a build decision and one verifiable next step.',
      fields: [
        { name: 'Context I need', value: 'Goal, user, current artifact, constraints, what you tried, and the failure or decision.' },
        { name: 'What you’ll get', value: 'A concrete recommendation, tradeoffs, a small implementation step, and a way to verify it.' },
      ],
    },
  }[intent];

  return {
    embeds: [{
      title: 'Sprout',
      description: content.description,
      color: SAGE_DISCORD_COLORS.sage,
      fields: content.fields.map((field) => ({ ...field, inline: false })),
      footer: { text: 'Sprout · Sage Ideas Academy' },
    }],
    allowed_mentions: { parse: [] },
  };
}
