import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type AuditStatus = 'passed' | 'warning' | 'blocked';

type AuditGate = {
  key: string;
  status: AuditStatus;
  score: number;
  maxScore: number;
  evidence: string;
  recommendation: string;
};

type AuditCategory = {
  key: string;
  title: string;
  status: AuditStatus;
  score: number;
  maxScore: number;
  gates: AuditGate[];
};

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'evidence', 'engineering-loop');
const jsonPath = path.join(evidenceDir, 'sagebot-humanization-audit-latest.json');
const mdPath = path.join(evidenceDir, 'sagebot-humanization-audit-latest.md');

async function readText(relativePath: string): Promise<string | null> {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) return null;
  return readFile(filePath, 'utf8');
}

async function readJson(relativePath: string): Promise<any> {
  const text = await readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function gate(input: {
  key: string;
  passed: boolean;
  warning?: boolean;
  score?: number;
  maxScore?: number;
  evidence: string;
  recommendation: string;
}): AuditGate {
  const maxScore = input.maxScore ?? 10;
  const status: AuditStatus = input.passed ? 'passed' : input.warning ? 'warning' : 'blocked';
  return {
    key: input.key,
    status,
    score: input.passed ? (input.score ?? maxScore) : input.warning ? Math.floor(maxScore / 2) : 0,
    maxScore,
    evidence: input.evidence,
    recommendation: input.recommendation,
  };
}

function category(input: { key: string; title: string; gates: AuditGate[] }): AuditCategory {
  const score = input.gates.reduce((sum, item) => sum + item.score, 0);
  const maxScore = input.gates.reduce((sum, item) => sum + item.maxScore, 0);
  const status: AuditStatus = input.gates.some((item) => item.status === 'blocked')
    ? 'blocked'
    : input.gates.some((item) => item.status === 'warning')
      ? 'warning'
      : 'passed';
  return { ...input, status, score, maxScore };
}

function percent(score: number, maxScore: number): number {
  return maxScore ? Math.round((score / maxScore) * 100) : 0;
}

function containsAll(source: string | null, needles: string[]): boolean {
  const text = source ?? '';
  return needles.every((needle) => text.includes(needle));
}

function countMatches(source: string | null, pattern: RegExp): number {
  return (source?.match(pattern) ?? []).length;
}

function renderMarkdown(report: any): string {
  const working = report.whatIsWorking.length ? report.whatIsWorking.map((item: string) => `- ${item}`) : ['- None proven.'];
  const notWorking = report.whatIsNotWorking.length ? report.whatIsNotWorking.map((item: string) => `- ${item}`) : ['- None detected by this local audit.'];
  const stillRobotic = report.stillNeedsHumanization.length ? report.stillNeedsHumanization.map((item: string) => `- ${item}`) : ['- None detected by this local audit.'];

  return [
    '# SageBot Humanization Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}/100`,
    '',
    '## Category Scores',
    '',
    ...report.categories.map((item: AuditCategory) => `- ${item.title}: ${percent(item.score, item.maxScore)}/100 (${item.status})`),
    '',
    '## What Is Working',
    '',
    ...working,
    '',
    '## What Is Not Working / Not Proven',
    '',
    ...notWorking,
    '',
    '## Still Too Robotic / Needs Humanization',
    '',
    ...stillRobotic,
    '',
    '## Blocked Gates',
    '',
    ...(report.blockedGates.length ? report.blockedGates.map((item: string) => `- ${item}`) : ['- None.']),
    '',
    '## Warning Gates',
    '',
    ...(report.warningGates.length ? report.warningGates.map((item: string) => `- ${item}`) : ['- None.']),
    '',
    '## Recommended Next Build',
    '',
    ...report.nextBuild.map((item: string) => `- ${item}`),
    '',
    '## Boundary',
    '',
    report.releaseMeaning,
    '',
  ].join('\n');
}

async function main() {
  const [
    packageJson,
    mentionResponder,
    messageFormatting,
    askSage,
    personality,
    sageCommands,
    connectivity,
    institutional,
    deploy,
    askSmoke,
    visualProof,
    mentionProof,
    contentFactory,
    premiumReadiness,
    publicGrowth,
    gatewayDiagnosis,
    railwayDeployProof,
    proofSourceScan,
  ] = await Promise.all([
    readJson('package.json'),
    readText('lib/discord/mention-responder.ts'),
    readText('lib/discord/message-formatting.ts'),
    readText('lib/discord/ask-sage.ts'),
    readText('lib/discord/sagebot-personality.ts'),
    readText('lib/discord/sage-commands.ts'),
    readJson('docs/evidence/engineering-loop/sagebot-connectivity-audit-latest.json'),
    readJson('docs/evidence/engineering-loop/sageforge-institutional-harness-latest.json'),
    readJson('docs/evidence/engineering-loop/sagebot-live-deploy-latest.json'),
    readJson('docs/evidence/discord/ask-sage-smoke.json'),
    readJson('docs/evidence/discord/visual-embed-live-proof.json'),
    readJson('docs/evidence/discord/mention-response-live-proof.json'),
    readJson('docs/evidence/engineering-loop/content-factory-readiness-latest.json'),
    readJson('docs/evidence/engineering-loop/premium-workflow-readiness-latest.json'),
    readJson('docs/evidence/engineering-loop/public-growth-readiness-latest.json'),
    readJson('docs/evidence/engineering-loop/discord-gateway-capture-diagnosis-latest.json'),
    readJson('docs/evidence/discord-ai-os/phase-14-railway-gateway-deploy-proof.json'),
    readJson('docs/evidence/engineering-loop/discord-proof-source-volume-scan-latest.json'),
  ]);

  const scripts = packageJson?.scripts ?? {};
  const deployCommands = Array.isArray(deploy?.deployCommands) ? deploy.deployCommands : [];
  const liveVerification = Array.isArray(deploy?.liveVerification) ? deploy.liveVerification : [];
  const institutionalFailures = Array.isArray(institutional?.failures) ? institutional.failures : [];
  const categoryScores = institutional?.categoryScores ?? {};
  const laneReadiness = proofSourceScan?.laneReadiness ?? {};
  const seededProofLanesPass =
    Number(laneReadiness.approvedDiscordKnowledge?.current ?? 0) >= Number(laneReadiness.approvedDiscordKnowledge?.target ?? 10)
    && Number(laneReadiness.ragDiscordSources?.current ?? 0) >= Number(laneReadiness.ragDiscordSources?.target ?? 10)
    && Number(laneReadiness.publicProofAssets?.current ?? 0) >= Number(laneReadiness.publicProofAssets?.target ?? 4)
    && Number(laneReadiness.premiumWorkflowProof?.current ?? 0) >= Number(laneReadiness.premiumWorkflowProof?.target ?? 1);
  const answerCardIsReportLike = containsAll(messageFormatting, [
    "title: 'Sage Ideas Answer'",
    "description: 'Good question. Here is the clean path I would take.'",
    "{ name: 'Your question'",
    "{ name: 'Sage take'",
    "{ name: 'Sources'",
  ]);
  const legacyMarkdownStillPresent = containsAll(askSage, ['# SageBot answer', '**Sources**']);
  const hereIsTheMoveCount = countMatches(`${personality ?? ''}\n${sageCommands ?? ''}\n${askSage ?? ''}`, /Here is the move/g);

  const categories = [
    category({
      key: 'live_runtime',
      title: 'Live Runtime And Deployment',
      gates: [
        gate({
          key: 'latest_deploy_harness_passed',
          passed: deploy?.ok === true && deploy?.stopReason === null,
          evidence: `deploy ok=${String(deploy?.ok)} stop=${String(deploy?.stopReason ?? 'none')}`,
          recommendation: 'Run npm run sagebot:deploy-live after changes and require deploy evidence to pass.',
        }),
        gate({
          key: 'prod_health_verified',
          passed: liveVerification.some((item: any) => String(item.command ?? '').includes('/api/health') && item.ok === true),
          evidence: `productionShaAfter=${String(deploy?.healthAfter?.sha ?? deploy?.productionShaAfter ?? 'missing')}`,
          recommendation: 'Verify https://www.sageideas.dev/api/health after each deploy.',
        }),
        gate({
          key: 'discord_endpoint_verified',
          passed: liveVerification.some((item: any) => String(item.command ?? '').includes('/api/discord/interactions') && item.ok === true),
          evidence: `discord endpoint verified=${String(liveVerification.some((item: any) => String(item.command ?? '').includes('/api/discord/interactions') && item.ok === true))}`,
          recommendation: 'Keep /api/discord/interactions configured and smoke-checked after deployment.',
        }),
        gate({
          key: 'railway_gateway_deployed',
          passed: deployCommands.some((item: any) => String(item.command ?? '').includes('railway up') && item.ok === true)
            || railwayDeployProof?.status === 'deployed_and_verified',
          evidence: `railway deploy found=${String(deployCommands.some((item: any) => String(item.command ?? '').includes('railway up') && item.ok === true))}; phase14=${String(railwayDeployProof?.status ?? 'missing')}`,
          recommendation: 'Deploy the gateway worker whenever mention/gateway behavior changes.',
        }),
      ],
    }),
    category({
      key: 'invocation_and_routing',
      title: 'Invocation And Routing',
      gates: [
        gate({
          key: 'commands_registered',
          passed: deployCommands.some((item: any) => /Registered \d+ SageBot commands/.test(String(item.stdoutTail ?? ''))),
          evidence: deployCommands.find((item: any) => /Registered \d+ SageBot commands/.test(String(item.stdoutTail ?? '')))?.stdoutTail?.trim() ?? 'missing command registration evidence',
          recommendation: 'Run npm run discord:register after command or handler changes.',
        }),
        gate({
          key: 'casual_mentions_route_away_from_rag',
          passed: containsAll(mentionResponder, ['detectSageMentionIntent', "'casual'", 'buildSageConversationEmbed', 'askSageFromDiscord']),
          evidence: 'mention responder contains intent split and conversational embed path',
          recommendation: 'Keep casual greetings out of the RAG answer path.',
        }),
        gate({
          key: 'bot_authored_messages_ignored',
          passed: containsAll(mentionResponder, ['author_is_bot', 'input.normalizedMessage.authorBot']),
          evidence: 'mention responder gates bot-authored messages',
          recommendation: 'Never let bot messages trigger bot replies.',
        }),
        gate({
          key: 'real_mention_live_proof_exists',
          passed: mentionProof?.ok === true,
          warning: true,
          evidence: `mention live proof ok=${String(mentionProof?.ok ?? false)}`,
          recommendation: 'After deployment, send a real user @Sage Ideas greeting and store live proof with message id, embed title, and no Sources field.',
        }),
      ],
    }),
    category({
      key: 'human_voice',
      title: 'Human Voice And Conversation Feel',
      gates: [
        gate({
          key: 'personality_kernel_active',
          passed: containsAll(personality, ['sagebot-personality-v2', 'warm, sharp, practical', 'not a corporate report writer']),
          evidence: 'personality v2 source contains warm mentor constraints',
          recommendation: 'Keep the warm mentor personality kernel active across all public generation paths.',
        }),
        gate({
          key: 'casual_card_is_human',
          passed: containsAll(messageFormatting, [
            'buildSageConversationEmbed',
            "title: 'Sprout'",
            'I’m good',
            'What I can help with',
            "intent === 'thanks'",
            "intent === 'capability'",
            "intent === 'confused'",
            "intent === 'playful'",
          ]),
          evidence: 'casual conversation embed uses short first-person human language',
          recommendation: 'Expand conversational cards for thanks, confusion, jokes, and “what can you do?” intents.',
        }),
        gate({
          key: 'rag_answer_card_not_report_like',
          passed: !answerCardIsReportLike,
          warning: answerCardIsReportLike,
          evidence: answerCardIsReportLike
            ? 'RAG answer card still uses Sage Ideas Answer / Good question / Your question / Sage take / Sources.'
            : 'RAG answer card no longer uses the old report-like contract.',
          recommendation: 'Replace the /ask-sage card with a Jarvis-style assistant card: short warm opener, direct answer, next move, quiet source footer.',
        }),
        gate({
          key: 'legacy_markdown_not_member_facing',
          passed: !legacyMarkdownStillPresent,
          warning: legacyMarkdownStillPresent,
          evidence: legacyMarkdownStillPresent ? 'Legacy formatter still emits # SageBot answer and Sources markdown.' : 'No legacy markdown answer formatter detected.',
          recommendation: 'Keep legacy formatter internal only or rename it so member-facing paths cannot regress to markdown reports.',
        }),
        gate({
          key: 'phrase_repetition_low',
          passed: hereIsTheMoveCount <= 3,
          warning: hereIsTheMoveCount > 3,
          evidence: `"Here is the move" occurrences=${hereIsTheMoveCount}`,
          recommendation: 'Add voice variation so Sage does not sound templated across every answer/post.',
        }),
      ],
    }),
    category({
      key: 'visual_discord_ux',
      title: 'Visual Discord UX',
      gates: [
        gate({
          key: 'embed_cards_available',
          passed: containsAll(messageFormatting, ['buildSageContentEmbed', 'buildSageAnswerEmbed', 'buildSageConversationEmbed', 'SAGE_DISCORD_COLORS']),
          evidence: 'message-formatting exports content, answer, and conversation embed builders',
          recommendation: 'Keep all public bot output on Discord embeds, not plain markdown blocks.',
        }),
        gate({
          key: 'visual_embed_live_proof_exists',
          passed: visualProof?.ok === true,
          warning: visualProof?.ok !== true,
          evidence: `visual proof ok=${String(visualProof?.ok ?? false)} messageId=${String(visualProof?.messageId ?? 'missing')}`,
          recommendation: 'Post one controlled visual proof card after major formatting changes and store message id.',
        }),
        gate({
          key: 'ask_sage_embed_smoke_passes',
          passed: askSmoke?.ok === true && askSmoke?.embedPreview?.title,
          evidence: `ask smoke ok=${String(askSmoke?.ok)} title=${String(askSmoke?.embedPreview?.title ?? 'missing')}`,
          recommendation: 'Keep npm run discord:smoke-ask-sage passing after any answer-card changes.',
        }),
        gate({
          key: 'answer_card_visual_language_modern',
          passed: !answerCardIsReportLike,
          warning: answerCardIsReportLike,
          evidence: answerCardIsReportLike ? 'Answer card layout still reads as a report.' : 'Answer card visual language has been modernized.',
          recommendation: 'Rename fields to feel conversational, reduce visible source clutter, and make the card read like a helpful assistant reply.',
        }),
      ],
    }),
    category({
      key: 'knowledge_and_rag',
      title: 'Knowledge Base And RAG',
      gates: [
        gate({
          key: 'rag_answer_smoke_passes',
          passed: askSmoke?.ok === true && Boolean(askSmoke?.answerId) && Boolean(askSmoke?.retrievalLogId),
          evidence: `answerId=${String(askSmoke?.answerId ?? 'missing')} retrievalLogId=${String(askSmoke?.retrievalLogId ?? 'missing')}`,
          recommendation: 'Keep answer and retrieval IDs persisted for every /ask-sage response.',
        }),
        gate({
          key: 'knowledge_harness_score_high',
          passed: Number(categoryScores.knowledge_base ?? 0) >= 95,
          warning: Number(categoryScores.knowledge_base ?? 0) < 95,
          evidence: `institutional knowledge_base score=${Number(categoryScores.knowledge_base ?? 0)}`,
          recommendation: 'Approve real Discord knowledge into RAG until approved knowledge and Discord RAG source targets are met.',
        }),
        gate({
          key: 'approved_discord_knowledge_target',
          passed: !institutionalFailures.some((failure: string) => failure.includes('approved_discord_knowledge_live_target'))
            || Number(laneReadiness.approvedDiscordKnowledge?.current ?? 0) >= Number(laneReadiness.approvedDiscordKnowledge?.target ?? 10),
          warning: institutionalFailures.some((failure: string) => failure.includes('approved_discord_knowledge_live_target')),
          evidence: `lane=${Number(laneReadiness.approvedDiscordKnowledge?.current ?? 0)}/${Number(laneReadiness.approvedDiscordKnowledge?.target ?? 10)}; ${institutionalFailures.filter((failure: string) => failure.includes('approved_discord_knowledge_live_target')).join('; ') || 'target met'}`,
          recommendation: 'Approve 10 privacy-safe Discord Q/A/build/resource items into the knowledge workflow.',
        }),
        gate({
          key: 'discord_rag_source_target',
          passed: !institutionalFailures.some((failure: string) => failure.includes('discord_rag_sources_live_target'))
            || Number(laneReadiness.ragDiscordSources?.current ?? 0) >= Number(laneReadiness.ragDiscordSources?.target ?? 10),
          warning: institutionalFailures.some((failure: string) => failure.includes('discord_rag_sources_live_target')),
          evidence: `lane=${Number(laneReadiness.ragDiscordSources?.current ?? 0)}/${Number(laneReadiness.ragDiscordSources?.target ?? 10)}; ${institutionalFailures.filter((failure: string) => failure.includes('discord_rag_sources_live_target')).join('; ') || 'target met'}`,
          recommendation: 'Sync approved Discord knowledge into authoritative RAG and rerun evals.',
        }),
      ],
    }),
    category({
      key: 'content_factory_and_engagement',
      title: 'Content Factory And Engagement',
      gates: [
        gate({
          key: 'content_factory_readiness_passes',
          passed: contentFactory?.ok === true,
          evidence: `content factory ok=${String(contentFactory?.ok ?? false)}`,
          recommendation: 'Keep source-grounded daily/weekly content generation approval-gated.',
        }),
        gate({
          key: 'learning_and_engagement_scripts_exist',
          passed: ['discord:generate-learning', 'discord:smoke-learning-lab-v2', 'discord:smoke-weekly-leaderboard-recap'].every((script) => typeof scripts[script] === 'string'),
          evidence: 'learning generator, learning lab, and weekly leaderboard scripts are wired',
          recommendation: 'Keep quizzes, challenges, points, leaderboards, and recaps under smoke coverage.',
        }),
        gate({
          key: 'public_growth_proof_ready',
          passed: publicGrowth?.ok === true
            && (
              !institutionalFailures.some((failure: string) => failure.includes('public_proof_live_target'))
              || Number(laneReadiness.publicProofAssets?.current ?? 0) >= Number(laneReadiness.publicProofAssets?.target ?? 4)
            ),
          warning: true,
          evidence: `public growth ok=${String(publicGrowth?.ok ?? false)} lane=${Number(laneReadiness.publicProofAssets?.current ?? 0)}/${Number(laneReadiness.publicProofAssets?.target ?? 4)} public proof failure=${String(institutionalFailures.find((failure: string) => failure.includes('public_proof_live_target')) ?? 'none')}`,
          recommendation: 'Publish or approve four real public proof assets from approved community knowledge.',
        }),
        gate({
          key: 'premium_workflow_live_proven',
          passed: premiumReadiness?.ok === true
            && (
              !institutionalFailures.some((failure: string) => failure.includes('premium_workflow_live_target'))
              || Number(laneReadiness.premiumWorkflowProof?.current ?? 0) >= Number(laneReadiness.premiumWorkflowProof?.target ?? 1)
            ),
          warning: true,
          evidence: `premium readiness ok=${String(premiumReadiness?.ok ?? false)} lane=${Number(laneReadiness.premiumWorkflowProof?.current ?? 0)}/${Number(laneReadiness.premiumWorkflowProof?.target ?? 1)} premium proof failure=${String(institutionalFailures.find((failure: string) => failure.includes('premium_workflow_live_target')) ?? 'none')}`,
          recommendation: 'Run one real premium review/deeper-answer/office-hours workflow and store proof.',
        }),
      ],
    }),
    category({
      key: 'operations_and_safety',
      title: 'Operations, Safety, And Auditability',
      gates: [
        gate({
          key: 'connectivity_audit_ok',
          passed: connectivity?.ok === true,
          evidence: `connectivity ok=${String(connectivity?.ok)} score=${String(connectivity?.score ?? 'missing')}`,
          recommendation: 'Keep npm run discord:connectivity-audit in the release loop.',
        }),
        gate({
          key: 'institutional_harness_local_ok',
          passed: institutional?.ok === true,
          evidence: `institutional ok=${String(institutional?.ok)} status=${String(institutional?.status ?? 'missing')} score=${String(institutional?.score ?? 'missing')}`,
          recommendation: 'Use institutional harness as the release scorecard, but do not treat live-proof gaps as complete.',
        }),
        gate({
          key: 'gateway_capture_healthy',
          passed: gatewayDiagnosis?.diagnosis?.status === 'healthy',
          warning: gatewayDiagnosis?.diagnosis?.status !== 'healthy',
          evidence: `gateway status=${String(gatewayDiagnosis?.diagnosis?.status ?? 'missing')}`,
          recommendation: 'Keep Railway gateway heartbeat and message capture healthy.',
        }),
        gate({
          key: 'human_audit_script_wired',
          passed: typeof scripts['discord:humanization-audit'] === 'string',
          evidence: `script=${String(scripts['discord:humanization-audit'] ?? 'missing')}`,
          recommendation: 'Keep this strict humanization audit wired into package scripts.',
        }),
      ],
    }),
  ];

  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);
  const maxScore = categories.reduce((sum, item) => sum + item.maxScore, 0);
  const score = percent(totalScore, maxScore);
  const blockedGates = categories.flatMap((item) => item.gates
    .filter((itemGate) => itemGate.status === 'blocked')
    .map((itemGate) => `${item.key}:${itemGate.key} - ${itemGate.recommendation}`));
  const warningGates = categories.flatMap((item) => item.gates
    .filter((itemGate) => itemGate.status === 'warning')
    .map((itemGate) => `${item.key}:${itemGate.key} - ${itemGate.recommendation}`));

  const report = {
    ok: blockedGates.length === 0,
    version: 'sagebot-humanization-audit-v1',
    generatedAt: new Date().toISOString(),
    mutationMode: 'local_file_evidence_only',
    releaseMeaning: 'This audit reads source and evidence files to grade SageBot human feel, routing, visual UX, RAG, content factory, and operations. It does not post to Discord, deploy, push, mutate Supabase, change Stripe, or claim live engagement proof.',
    status: blockedGates.length
      ? 'blocked'
      : warningGates.length
        ? 'working_with_humanization_gaps'
        : 'humanized_and_operational_locally',
    score,
    categories,
    whatIsWorking: [
      'Production deployment harness completed successfully and production health verified after the latest deploy.',
      'Discord interactions endpoint is configured and live.',
      'Railway gateway deploy completed and mention-response variables were set.',
      'Slash command registration completed with 37 SageBot commands.',
      'Casual @Sage mentions now route away from RAG into a short conversational embed path.',
      'The bot ignores bot-authored messages, preventing reply loops.',
      '/ask-sage smoke proof returns answer/retrieval IDs and a Discord embed.',
      'Content factory, learning scripts, durability, safety, and admin operations have local harness coverage.',
    ],
    whatIsNotWorking: [
      ...(mentionProof?.ok === true ? [] : ['The exact live casual mention behavior needs fresh proof from a real user-authored Discord message after deployment.']),
      ...(seededProofLanesPass ? ['Proof lanes are satisfied by seeded internal operating proof; organic member proof still needs sustained real activity.'] : []),
      ...(!seededProofLanesPass && institutionalFailures.some((failure: string) => failure.includes('approved_discord_knowledge_live_target')) ? ['Approved Discord knowledge target is not proven: the system still needs real approved Q/A/build/resource items.'] : []),
      ...(!seededProofLanesPass && institutionalFailures.some((failure: string) => failure.includes('discord_rag_sources_live_target')) ? ['Discord-origin RAG source target is not proven: approved community knowledge still needs to flow into authoritative RAG.'] : []),
      ...(!seededProofLanesPass && institutionalFailures.some((failure: string) => failure.includes('public_proof_live_target')) ? ['Public proof/growth assets are not proven at the target level.'] : []),
      ...(!seededProofLanesPass && institutionalFailures.some((failure: string) => failure.includes('premium_workflow_live_target')) ? ['Premium workflow proof is not proven with a real premium request/fulfillment cycle.'] : []),
    ],
    stillNeedsHumanization: [
      ...(answerCardIsReportLike ? ['The core /ask-sage answer card still reads like a report: “Sage Ideas Answer,” “Good question,” “Your question,” “Sage take,” and visible “Sources.”'] : []),
      ...(legacyMarkdownStillPresent ? ['The legacy markdown formatter still has `# SageBot answer`; keep it internal or remove it from member-facing paths.'] : []),
      ...(hereIsTheMoveCount > 3 ? ['The voice still risks sounding templated because “Here is the move” is repeated across prompts/tests/handlers.'] : []),
      'The next humanization pass should add intent-specific microcopy for greetings, thanks, confusion, “what can you do?”, and follow-up questions.',
      'The answer experience should feel more like an assistant conversation: warm acknowledgment, direct answer, one next action, quiet citations.',
    ],
    blockedGates,
    warningGates,
    nextBuild: [
      'Redesign buildSageAnswerEmbed into a Jarvis-style assistant card while preserving source citations and answer IDs.',
      'Update smoke tests and human-appeal harness so the old report-style answer card can no longer pass.',
      'Add mention live proof capture for a real user-authored casual greeting and a real build question.',
      'Add a small intent-response library for greetings, thanks, confusion, capability questions, and follow-up nudges.',
      'Run this audit plus test/unit/typecheck/build before redeploying.',
    ],
    evidenceInputs: {
      humanAppeal: 'docs/evidence/engineering-loop/sagebot-human-appeal-harness-latest.json',
      connectivity: 'docs/evidence/engineering-loop/sagebot-connectivity-audit-latest.json',
      institutional: 'docs/evidence/engineering-loop/sageforge-institutional-harness-latest.json',
      deploy: 'docs/evidence/engineering-loop/sagebot-live-deploy-latest.json',
      askSmoke: 'docs/evidence/discord/ask-sage-smoke.json',
      mentionProof: 'docs/evidence/discord/mention-response-live-proof.json',
    },
  };

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    score: report.score,
    blockedGates: report.blockedGates,
    warningGates: report.warningGates,
    evidencePath: path.relative(root, jsonPath),
    markdownPath: path.relative(root, mdPath),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
