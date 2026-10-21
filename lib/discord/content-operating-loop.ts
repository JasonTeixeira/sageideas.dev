import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const SAGEBOT_CONTENT_OPERATING_LOOP_VERSION = 'sagebot-content-operating-loop-v1';

export const SAGEBOT_CONTENT_OPERATING_LOOP_AUTHORIZATION =
  'I authorize the SageBot content operating loop to run safe local engineering passes, content quality audits, unit/build gates, draft-generation proof, and approved deployment gates. Do not publish Discord posts, approve private member knowledge, charge Stripe, push git, delete live resources, or mutate unrelated production systems without separate explicit approval.';

export type ContentOperatingPhase = {
  key: string;
  title: string;
  objective: string;
  targetScore: number;
  safeLocalCommands: string[];
  deployCommands: string[];
  evidence: string[];
  requiredSignals: string[];
  stopConditions: string[];
};

export type ContentOperatingLoopReport = {
  ok: boolean;
  version: typeof SAGEBOT_CONTENT_OPERATING_LOOP_VERSION;
  generatedAt: string;
  mode: 'plan' | 'local' | 'deploy';
  mutationMode: string;
  authorizationPhrase: typeof SAGEBOT_CONTENT_OPERATING_LOOP_AUTHORIZATION;
  score: number;
  targetScoreRange: '95-99';
  phases: Array<ContentOperatingPhase & {
    score: number;
    status: 'passed' | 'blocked';
    missingEvidence: string[];
    missingSignals: string[];
  }>;
  failures: string[];
  safeAutonomousCommands: string[];
  deployCommands: string[];
  nextRecommendedPhase: string | null;
  releaseMeaning: string;
};

export const contentOperatingPhases: ContentOperatingPhase[] = [
  {
    key: 'admin_content_control_center',
    title: 'Admin Content Control Center',
    objective: 'Admins can review, edit, approve, reject, publish, and audit every content draft from one place.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:content-factory-readiness',
      'npm run discord:evaluate-content',
      'npm run test:unit -- --test-name-pattern="discord content"',
    ],
    deployCommands: [],
    evidence: [
      'docs/evidence/engineering-loop/content-factory-readiness-latest.json',
      'docs/evidence/discord/content-quality-run.json',
    ],
    requiredSignals: [
      'app/admin/discord/page.tsx:data-testid="discord-content-factory-readiness"',
      'lib/discord/content-approval.ts:approve',
      'lib/discord/content-approval.ts:reject',
      'lib/discord/content-approval.ts:reviewer_user_id',
      'lib/discord/content-approval.ts:reviewer_email',
    ],
    stopConditions: [
      'Admin actions do not log actor/result.',
      'Drafts can be published without approval.',
      'Dashboard reads invented metrics instead of live DB/evidence.',
    ],
  },
  {
    key: 'sprout_post_formatting',
    title: 'Sprout Post Formatting And Human Voice',
    objective: 'Every public-facing Sprout post is warm, scannable, Discord-native, and blocked from cold report-style output.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:smoke-ask-sage',
      'npm run discord:human-appeal-harness',
      'npm run discord:humanization-audit',
    ],
    deployCommands: ['npm run sagebot:deploy-live', 'npm run discord:register'],
    evidence: [
      'docs/evidence/discord/ask-sage-smoke.json',
      'docs/evidence/engineering-loop/sagebot-human-appeal-harness-latest.json',
      'docs/evidence/engineering-loop/sagebot-humanization-audit-latest.json',
    ],
    requiredSignals: [
      'lib/discord/message-formatting.ts:buildSageContentEmbed',
      'lib/discord/message-formatting.ts:SAGE_DISCORD_COLORS',
      'lib/discord/sagebot-personality.ts:not a corporate report writer',
      'lib/discord/content-factory.ts:operatingContract',
    ],
    stopConditions: [
      'Raw markdown is posted instead of embed/card payloads.',
      'Generic hype or corporate report tone passes quality gates.',
      'Sources are dumped into casual replies where they are not useful.',
    ],
  },
  {
    key: 'quiz_engine_v2',
    title: 'Quiz Engine V2',
    objective: 'Daily quizzes are source-grounded, level-aware, scored once, explained clearly, and linked to the leaderboard.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:smoke-learning-generator',
      'npm run discord:smoke-quiz-scoring',
      'npm run test:unit -- --test-name-pattern="discord quiz"',
    ],
    deployCommands: ['npm run discord:register'],
    evidence: [
      'docs/evidence/discord/learning-generator-smoke.json',
    ],
    requiredSignals: [
      'lib/discord/learning-lab-v2.ts:quiz',
      'lib/discord/quiz-challenge-generator.ts:quiz',
      'lib/discord/engagement.ts:actionKey',
      'lib/discord/sage-commands.ts:quiz',
    ],
    stopConditions: [
      'Duplicate attempts can farm points.',
      'Quiz answers are ambiguous or lack explanation.',
      'Generated quizzes are not grounded in approved source/context.',
    ],
  },
  {
    key: 'challenge_lab_v2',
    title: 'Challenge And Lab Engine V2',
    objective: 'Challenges drive real builds, structured submissions, admin review, featured wins, and content/RAG candidates.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:smoke-learning-generator',
      'npm run discord:smoke-challenge-lab',
      'npm run test:unit -- --test-name-pattern="discord challenge"',
    ],
    deployCommands: ['npm run discord:register'],
    evidence: [
      'docs/evidence/discord/learning-generator-smoke.json',
    ],
    requiredSignals: [
      'lib/discord/learning-lab-v2.ts:challenge',
      'lib/discord/sage-commands.ts:submit-challenge',
      'lib/discord/sage-commands.ts:submit-project',
      'lib/discord/engagement.ts:project_submission',
    ],
    stopConditions: [
      'Challenge points are awarded before review.',
      'Submissions can be duplicated for farming.',
      'Featured projects do not feed the content queue.',
    ],
  },
  {
    key: 'member_intelligence_nudges',
    title: 'Member Intelligence And Nudge Engine',
    objective: 'Sprout tracks each member path, level, activity, streak, next best action, and sends capped helpful nudges.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:smoke-member-intelligence',
      'npm run discord:nudge-approved-onboarding',
      'npm run test:unit -- --test-name-pattern="discord member intelligence"',
    ],
    deployCommands: [],
    evidence: [
      'docs/evidence/discord/phase-1-approved-member-nudge.json',
    ],
    requiredSignals: [
      'lib/discord/member-intelligence.ts:nextBestAction',
      'lib/discord/onboarding-nudge.ts:recently_nudged',
      'lib/discord/analytics.ts:upsertDiscordMember',
      'scripts/discord/rebuild-member-intelligence.ts',
    ],
    stopConditions: [
      'Nudges can spam the same member.',
      'Profiles store unnecessary private data.',
      'Approved members have no visible next best action.',
    ],
  },
  {
    key: 'leaderboard_rewards',
    title: 'Leaderboard And Rewards Integrity',
    objective: 'Points reward useful participation with anti-farming rules, reversal/audit paths, weekly snapshots, and member recognition.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:smoke-quiz-scoring',
      'npm run discord:smoke-weekly-leaderboard-recap',
      'npm run test:unit -- --test-name-pattern="leaderboard"',
    ],
    deployCommands: [],
    evidence: [
      'docs/evidence/discord/weekly-leaderboard-recap-smoke.json',
    ],
    requiredSignals: [
      'lib/discord/engagement.ts:points',
      'lib/discord/weekly-automation.ts:leaderboard',
      'lib/discord/sage-commands.ts:leaderboard',
      'lib/discord/sage-commands.ts:award',
    ],
    stopConditions: [
      'Points lack idempotency keys.',
      'Admin cannot reverse or audit bad point awards.',
      'Leaderboard rewards noise instead of useful participation.',
    ],
  },
  {
    key: 'content_to_rag_loop',
    title: 'Approved Knowledge To RAG Loop',
    objective: 'Useful member activity becomes reviewed knowledge, then approved RAG/source material, then future content.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:knowledge-review-queue',
      'npm run rag:smoke-discord-authoritative-sync',
      'npm run rag:smoke-retrieval',
      'npm run rag:smoke-answer',
    ],
    deployCommands: [],
    evidence: [
      'docs/evidence/engineering-loop/discord-knowledge-review-queue-latest.json',
      'docs/evidence/rag/discord-authoritative-sync-smoke.json',
      'docs/evidence/rag/retrieval-smoke.json',
      'docs/evidence/rag/answer-smoke.json',
    ],
    requiredSignals: [
      'lib/discord/knowledge-candidates.ts:approved',
      'lib/discord/content-queue-automation.ts:source_message_id',
      'lib/rag/retrieval.ts',
      'lib/rag/source-normalizer.ts',
    ],
    stopConditions: [
      'Raw unapproved chatter enters authoritative RAG.',
      'Approved knowledge has no provenance/source link.',
      'RAG answers make factual claims without citations.',
    ],
  },
  {
    key: 'daily_weekly_operations',
    title: 'Daily And Weekly Job Operations',
    objective: 'Daily/weekly jobs create useful drafts, publish only after approval, expose failures, and never duplicate posts.',
    targetScore: 95,
    safeLocalCommands: [
      'npm run discord:content-engine-proof',
      'npm run discord:content-factory',
      'npm run discord:evaluate-content',
      'npm run discord:durable-jobs-readiness',
    ],
    deployCommands: ['vercel deploy --prod --yes'],
    evidence: [
      'docs/evidence/discord-ai-os/phase-22-content-factory-run.json',
      'docs/evidence/discord/content-quality-run.json',
      'docs/evidence/engineering-loop/durable-jobs-readiness-latest.json',
    ],
    requiredSignals: [
      'app/api/cron/discord/content-factory/route.ts:noPublicPublish',
      'app/api/cron/discord/content-factory/route.ts:adminApprovalRequired',
      'lib/discord/content-factory.ts:factory_key',
      'supabase/migrations/0113_discord_content_factory_idempotency.sql',
    ],
    stopConditions: [
      'Cron route can publish without admin approval.',
      'Duplicate runs create duplicate drafts/posts.',
      'Failed jobs disappear without dashboard/evidence.',
    ],
  },
];

function readText(root: string, relativePath: string): string | null {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, 'utf8');
}

function evidenceExists(root: string, relativePath: string): boolean {
  return existsSync(path.join(root, relativePath));
}

function signalExists(root: string, signal: string): boolean {
  const [file, ...needleParts] = signal.split(':');
  const needle = needleParts.join(':');
  const text = readText(root, file);
  return Boolean(text && (!needle || text.includes(needle)));
}

export function buildContentOperatingLoopReport(input: {
  root?: string;
  generatedAt: string;
  mode?: 'plan' | 'local' | 'deploy';
}): ContentOperatingLoopReport {
  const root = input.root ?? process.cwd();
  const mode = input.mode ?? 'plan';
  const phases = contentOperatingPhases.map((phase) => {
    const missingEvidence = phase.evidence.filter((item) => !evidenceExists(root, item));
    const missingSignals = phase.requiredSignals.filter((item) => !signalExists(root, item));
    const evidenceScore = Math.round(((phase.evidence.length - missingEvidence.length) / Math.max(1, phase.evidence.length)) * 45);
    const signalScore = Math.round(((phase.requiredSignals.length - missingSignals.length) / Math.max(1, phase.requiredSignals.length)) * 45);
    const commandScore = phase.safeLocalCommands.length ? 10 : 0;
    const score = evidenceScore + signalScore + commandScore;
    return {
      ...phase,
      score,
      status: score >= phase.targetScore ? 'passed' as const : 'blocked' as const,
      missingEvidence,
      missingSignals,
    };
  });
  const score = Math.round(phases.reduce((sum, phase) => sum + phase.score, 0) / Math.max(1, phases.length));
  const failures = phases.flatMap((phase) => [
    ...phase.missingEvidence.map((item) => `${phase.key}: missing evidence ${item}`),
    ...phase.missingSignals.map((item) => `${phase.key}: missing signal ${item}`),
  ]);
  const safeAutonomousCommands = [
    'npm run sagebot:content-os-loop:plan',
    'npm run sagebot:content-os-loop:local',
    'npm run discord:content-engine-proof',
    'npm run discord:evaluate-content',
    'npm run test:unit',
    'npm run build',
  ];
  const deployCommands = [
    'npm run sagebot:content-os-loop:deploy',
    'vercel deploy --prod --yes',
    'npm run sagebot:deploy-live',
    'npm run discord:register',
  ];

  return {
    ok: failures.length === 0 && score >= 95,
    version: SAGEBOT_CONTENT_OPERATING_LOOP_VERSION,
    generatedAt: input.generatedAt,
    mode,
    mutationMode: mode === 'deploy'
      ? 'deploy_gates_allowed_no_auto_publish_no_git_push'
      : 'local_audit_and_evidence_only',
    authorizationPhrase: SAGEBOT_CONTENT_OPERATING_LOOP_AUTHORIZATION,
    score,
    targetScoreRange: '95-99',
    phases,
    failures,
    safeAutonomousCommands,
    deployCommands,
    nextRecommendedPhase: phases.find((phase) => phase.status === 'blocked')?.key ?? null,
    releaseMeaning: 'This harness proves engineering readiness for the content operating system. It does not claim organic community traction until real members participate, admins approve knowledge, and approved posts produce live engagement evidence.',
  };
}

export function validateContentOperatingLoopReport(report: ContentOperatingLoopReport): {
  ok: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  if (report.version !== SAGEBOT_CONTENT_OPERATING_LOOP_VERSION) failures.push('wrong_version');
  if (report.targetScoreRange !== '95-99') failures.push('wrong_target_range');
  if (!report.authorizationPhrase.includes('Do not publish Discord posts')) failures.push('missing_publish_boundary');
  if (!report.authorizationPhrase.includes('push git')) failures.push('missing_git_push_boundary');
  if (!report.safeAutonomousCommands.includes('npm run test:unit')) failures.push('missing_unit_gate');
  if (!report.safeAutonomousCommands.includes('npm run build')) failures.push('missing_build_gate');
  if (!report.safeAutonomousCommands.includes('npm run discord:evaluate-content')) failures.push('missing_content_eval_gate');
  if (report.phases.length < 8) failures.push('phase_count_too_low');
  for (const key of [
    'admin_content_control_center',
    'sprout_post_formatting',
    'quiz_engine_v2',
    'challenge_lab_v2',
    'member_intelligence_nudges',
    'leaderboard_rewards',
    'content_to_rag_loop',
    'daily_weekly_operations',
  ]) {
    if (!report.phases.some((phase) => phase.key === key)) failures.push(`missing_phase:${key}`);
  }
  if (!report.phases.every((phase) => phase.targetScore >= 95)) failures.push('phase_target_below_95');
  if (!report.phases.every((phase) => phase.stopConditions.length >= 3)) failures.push('phase_stop_conditions_too_thin');
  return {
    ok: failures.length === 0,
    failures,
  };
}
