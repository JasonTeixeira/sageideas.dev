import { buildSageAnswerEmbed, buildSageContentEmbed, SAGE_DISCORD_COLORS } from './message-formatting';
import {
  SAGEBOT_PERSONALITY_VERSION,
  sageBotAnswerSystemPrompt,
  sageBotDailySignalSystemPrompt,
  scoreSageBotPolicyOutput,
} from './sagebot-personality';

export const SAGEBOT_HUMAN_APPEAL_HARNESS_VERSION = 'sagebot-human-appeal-harness-v1';

type GateStatus = 'passed' | 'blocked';

export type HumanAppealGate = {
  key: string;
  status: GateStatus;
  score: number;
  maxScore: number;
  evidence: string;
  recovery: string;
};

export type HumanAppealCategory = {
  key: string;
  title: string;
  status: GateStatus;
  score: number;
  maxScore: number;
  gates: HumanAppealGate[];
};

export type HumanAppealHarnessInput = {
  generatedAt: string;
  packageJson: any;
  sourceFiles: Record<string, string | null>;
  askSageSmoke: any;
  visualEmbedProof: any;
};

export type HumanAppealHarnessResult = {
  ok: boolean;
  version: typeof SAGEBOT_HUMAN_APPEAL_HARNESS_VERSION;
  generatedAt: string;
  mutationMode: 'local_file_evidence_only';
  releaseMeaning: string;
  status: 'human_appeal_ready' | 'blocked_human_appeal';
  score: number;
  targetScoreRange: '95-99';
  categories: HumanAppealCategory[];
  failures: string[];
  safeAutonomousCommands: string[];
  productionProofCommands: string[];
};

function gate(input: {
  key: string;
  passed: boolean;
  evidence: string;
  recovery: string;
  score?: number;
  maxScore?: number;
}): HumanAppealGate {
  const maxScore = input.maxScore ?? 10;
  return {
    key: input.key,
    status: input.passed ? 'passed' : 'blocked',
    score: input.passed ? (input.score ?? maxScore) : 0,
    maxScore,
    evidence: input.evidence,
    recovery: input.recovery,
  };
}

function category(input: { key: string; title: string; gates: HumanAppealGate[] }): HumanAppealCategory {
  const score = input.gates.reduce((sum, item) => sum + item.score, 0);
  const maxScore = input.gates.reduce((sum, item) => sum + item.maxScore, 0);
  return {
    ...input,
    status: input.gates.every((item) => item.status === 'passed') ? 'passed' : 'blocked',
    score,
    maxScore,
  };
}

function includesAll(value: string | null | undefined, needles: string[]): boolean {
  const text = value ?? '';
  return needles.every((needle) => text.includes(needle));
}

function scriptExists(packageJson: any, scriptName: string): boolean {
  return typeof packageJson?.scripts?.[scriptName] === 'string' && packageJson.scripts[scriptName].length > 0;
}

function hasEmbedFieldNames(payload: any, names: string[]): boolean {
  const fields = payload?.embedPreview?.fields ?? payload?.embed?.fields ?? [];
  const fieldNames = Array.isArray(fields) ? fields.map((field: any) => String(field.name ?? '')) : [];
  return names.every((name) => fieldNames.includes(name));
}

export function buildHumanAppealHarness(input: HumanAppealHarnessInput): HumanAppealHarnessResult {
  const answerPrompt = sageBotAnswerSystemPrompt();
  const dailyPrompt = sageBotDailySignalSystemPrompt();
  const answerEmbed = buildSageAnswerEmbed({
    question: 'How do I make my Discord build more useful?',
    answer: 'Here is the move: ask one specific question, ship one small artifact, then submit it for review with source context [1].',
    sources: ['Sage Ideas operating runbook'],
    answerId: 'human-appeal-sample',
  });
  const contentEmbed = buildSageContentEmbed({
    title: 'Daily Signal',
    variant: 'signal',
    body: [
      'Start with one visible build move.',
      '',
      '**Today\'s move:** Pick one member question and turn it into a useful checklist.',
      '**Why it matters:** Members come back when the server turns confusion into progress.',
      '**Ship check:** Post the checklist, ask for one reply, and capture the next content seed.',
    ].join('\n'),
  });
  const policyScore = scoreSageBotPolicyOutput(
    'Here is the move: use /ask-sage with project context, cite the approved source like [1], then ship the artifact in build-lab.',
    { requireCitation: true },
  );

  const source = input.sourceFiles;
  const askSageSource = source['lib/discord/ask-sage.ts'];
  const commandsSource = source['lib/discord/sage-commands.ts'];
  const mentionSource = source['lib/discord/mention-responder.ts'];
  const restSource = source['lib/discord/sage-rest.ts'];
  const smokeSource = source['scripts/discord/smoke-ask-sage.ts'];

  const categories = [
    category({
      key: 'visual_embed_contract',
      title: 'Visual Embed Contract',
      gates: [
        gate({
          key: 'formatter_exports_cards',
          passed: answerEmbed.embeds?.[0]?.title === 'Sprout'
            && contentEmbed.embeds?.[0]?.title === 'Daily Signal'
            && contentEmbed.embeds?.[0]?.color === SAGE_DISCORD_COLORS.signal
            && hasEmbedFieldNames({ embed: answerEmbed.embeds?.[0] }, ['Here’s the move', 'Next step', 'Source check'])
            && hasEmbedFieldNames({ embed: contentEmbed.embeds?.[0] }, ['Today\'s move', 'Why it matters', 'Ship check']),
          evidence: 'buildSageAnswerEmbed/buildSageContentEmbed produce titled colored fielded cards',
          recovery: 'Fix lib/discord/message-formatting.ts so answers and content drafts render as Discord embeds with title, color, fields, and footer.',
        }),
        gate({
          key: 'discord_rest_supports_payloads',
          passed: includesAll(restSource, ['postMessageToChannelByBaseName', 'buildSageContentEmbed', 'options.embed']),
          evidence: 'sage-rest supports embed payload posting by channel base name',
          recovery: 'Keep postMessageToChannelByBaseName and embed-aware postToChannelByBaseName wired in lib/discord/sage-rest.ts.',
        }),
        gate({
          key: 'member_facing_flows_use_embeds',
          passed: includesAll(commandsSource, [
            'Project Submission:',
            'Review Request:',
            'Captured Content Idea',
            'Question:',
            'Answer Submitted',
            'Daily Signal',
            'Weekly Recap',
            'embeds: result.messagePayload.embeds',
          ]),
          evidence: 'project/review/content/question/answer/daily/weekly/ask-sage flows route through embed payloads',
          recovery: 'Route all member-facing SageForge posts through postToChannelByBaseName(..., { embed: true }) or result.messagePayload.embeds.',
        }),
        gate({
          key: 'mention_replies_use_embeds',
          passed: includesAll(mentionSource, ['...result.messagePayload', 'allowed_mentions', 'message_reference']),
          evidence: 'mention responder replies with the same answer embed payload',
          recovery: 'Update lib/discord/mention-responder.ts so @Sage Ideas replies use result.messagePayload rather than raw markdown content.',
        }),
      ],
    }),
    category({
      key: 'human_voice_contract',
      title: 'Human Voice Contract',
      gates: [
        gate({
          key: 'personality_v2_active',
          passed: SAGEBOT_PERSONALITY_VERSION === 'sagebot-personality-v2',
          evidence: `personality=${SAGEBOT_PERSONALITY_VERSION}`,
          recovery: 'Use the warm mentor voice kernel version, not the old sterile v1 personality.',
        }),
        gate({
          key: 'answer_prompt_is_human_mentor',
          passed: /warm, sharp, practical/.test(answerPrompt)
            && /strong technical mentor/.test(answerPrompt)
            && /not a corporate report writer/.test(answerPrompt),
          evidence: 'answer prompt explicitly requires warm mentor voice and blocks corporate report voice',
          recovery: 'Tighten sageBotAnswerSystemPrompt with human mentor language, concrete next moves, and anti-sterile-report rules.',
        }),
        gate({
          key: 'daily_prompt_is_visual_and_scannable',
          passed: /visually scannable in Discord/.test(dailyPrompt)
            && /\*\*Today's move:\*\*/.test(dailyPrompt)
            && /\*\*Ship check:\*\*/.test(dailyPrompt),
          evidence: 'daily prompt requires labeled sections that become clean embed fields',
          recovery: 'Keep daily signal generation sectioned for Discord embeds: Today\'s move, Why it matters, Build this, Ship check, Reply with.',
        }),
        gate({
          key: 'policy_score_blocks_low_quality',
          passed: policyScore.passed && policyScore.score >= 80,
          evidence: `sample policy score=${policyScore.score}`,
          recovery: 'Fix scoreSageBotPolicyOutput so useful, sourced, builder-oriented answers pass and generic hype fails.',
        }),
      ],
    }),
    category({
      key: 'proof_and_regression_gates',
      title: 'Proof And Regression Gates',
      gates: [
        gate({
          key: 'ask_sage_smoke_proves_embed',
          passed: input.askSageSmoke?.ok === true
            && input.askSageSmoke?.embedPreview?.title === 'Sprout'
            && hasEmbedFieldNames(input.askSageSmoke, ['Here’s the move', 'Next step', 'Source check']),
          evidence: `ask-sage smoke ok=${String(input.askSageSmoke?.ok)} title=${String(input.askSageSmoke?.embedPreview?.title ?? 'missing')}`,
          recovery: 'Run npm run discord:smoke-ask-sage and require embed title, question, answer, and source fields.',
        }),
        gate({
          key: 'live_visual_embed_proof_exists',
          passed: input.visualEmbedProof?.ok === true
            && input.visualEmbedProof?.messageId
            && input.visualEmbedProof?.embed?.title === 'SageBot Visual Proof'
            && hasEmbedFieldNames(input.visualEmbedProof, ['Today\'s move', 'Why it matters', 'Ship check']),
          evidence: `visual proof ok=${String(input.visualEmbedProof?.ok)} messageId=${String(input.visualEmbedProof?.messageId ?? 'missing')}`,
          recovery: 'Post a controlled team-ops visual proof embed and capture docs/evidence/discord/visual-embed-live-proof.json.',
        }),
        gate({
          key: 'smoke_script_blocks_markdown_regression',
          passed: includesAll(smokeSource, ['answerEmbed?.title === \'Sprout\'', 'fieldNames.includes(\'Source check\')'])
            && !String(smokeSource ?? '').includes("content.includes('# SageBot answer')"),
          evidence: 'smoke-ask-sage asserts embed output rather than old markdown header',
          recovery: 'Update scripts/discord/smoke-ask-sage.ts so plain # SageBot answer markdown cannot satisfy the smoke.',
        }),
        gate({
          key: 'package_scripts_include_human_gate',
          passed: scriptExists(input.packageJson, 'discord:human-appeal-harness'),
          evidence: 'discord:human-appeal-harness package script exists',
          recovery: 'Wire npm run discord:human-appeal-harness into package.json and the SageForge institutional loop.',
        }),
      ],
    }),
    category({
      key: 'rag_answer_payload_contract',
      title: 'RAG Answer Payload Contract',
      gates: [
        gate({
          key: 'ask_sage_returns_message_payload',
          passed: includesAll(askSageSource, ['messagePayload: DiscordMessagePayload', 'formatAskSageDiscordMessage', 'buildSageAnswerEmbed']),
          evidence: 'ask-sage returns both legacy formatted text and Discord embed payload',
          recovery: 'Keep askSageFromDiscord returning messagePayload so slash and mention paths share one visual answer contract.',
        }),
        gate({
          key: 'sources_are_visible_in_embed',
          passed: answerEmbed.embeds?.[0]?.fields?.some((field) => field.name === 'Source check' && field.value.includes('Sage Ideas operating runbook')) === true,
          evidence: 'answer embed includes a Source check field',
          recovery: 'Ensure buildSageAnswerEmbed always renders a Source check field for grounded answers.',
        }),
      ],
    }),
  ];

  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);
  const maxScore = categories.reduce((sum, item) => sum + item.maxScore, 0);
  const score = Math.round((totalScore / maxScore) * 100);
  const failures = categories.flatMap((item) => item.gates
    .filter((itemGate) => itemGate.status === 'blocked')
    .map((itemGate) => `${item.key}:${itemGate.key}`));

  return {
    ok: failures.length === 0,
    version: SAGEBOT_HUMAN_APPEAL_HARNESS_VERSION,
    generatedAt: input.generatedAt,
    mutationMode: 'local_file_evidence_only',
    releaseMeaning: 'This harness verifies SageForge visual formatting, human voice, and regression evidence from source files and evidence JSON. It writes local evidence only and does not post, deploy, push, or mutate production.',
    status: failures.length === 0 ? 'human_appeal_ready' : 'blocked_human_appeal',
    score,
    targetScoreRange: '95-99',
    categories,
    failures,
    safeAutonomousCommands: [
      'npm run discord:smoke-ask-sage',
      'npm run discord:human-appeal-harness',
      'npm run loop:sageforge:quality',
    ],
    productionProofCommands: [
      'npm run discord:register',
      'Deploy Vercel/Railway only after approval when runtime code changes.',
      'Post one controlled team-ops visual proof embed after deploy and capture docs/evidence/discord/visual-embed-live-proof.json.',
    ],
  };
}
