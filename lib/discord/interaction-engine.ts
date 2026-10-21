import { buildDiscordContentFactorySlots } from './content-factory';
import { DISCORD_DURABLE_JOB_REGISTRY } from './durable-jobs';

export type DiscordInteractionEngineLane = {
  key: string;
  label: string;
  cadence: 'daily' | 'weekly';
  channel: string;
  draftType: string;
  memberAction: string;
  pointsIntent: 'none' | 'attempt' | 'reviewed' | 'featured';
  captureTarget: 'question' | 'answer' | 'resource' | 'project' | 'win' | 'review' | 'profile_signal' | 'recap';
  proofPath: string[];
  qualityGate: string[];
};

export type DiscordInteractionEngineReport = {
  ok: boolean;
  version: 'discord-interaction-engine-v1';
  generatedAt: string;
  mutationMode: 'local_file_evidence_only';
  laneCount: number;
  dailyLaneCount: number;
  weeklyLaneCount: number;
  channelCoverage: string[];
  captureCoverage: string[];
  pointsCoverage: string[];
  durableJobCoverage: string[];
  contentFactorySlotCount: number;
  approvalGate: {
    noPublicPublish: true;
    adminApprovalRequired: true;
    memberActivityRequiredForProof: true;
  };
  operatingLoop: string[];
  lanes: DiscordInteractionEngineLane[];
  failures: string[];
  releaseMeaning: string;
};

const requiredDailyLaneKeys = [
  'daily-signal',
  'daily-questionnaire',
  'daily-lesson',
  'daily-interview-question',
  'daily-quiz',
  'daily-build-challenge',
  'daily-resource-drop',
];

const requiredWeeklyLaneKeys = [
  'weekly-project-window',
  'weekly-review-queue',
  'weekly-leaderboard',
  'weekly-recap',
];

const requiredDurableJobs = [
  'daily_draft',
  'quiz_generation',
  'questionnaire_generation',
  'lesson_generation',
  'interview_question_generation',
  'challenge_generation',
  'weekly_leaderboard',
  'weekly_leaderboard_prompt',
  'weekly_recap',
  'content_queue_enrichment',
];

const interactionLanes: DiscordInteractionEngineLane[] = [
  {
    key: 'daily-signal',
    label: 'Daily Signal',
    cadence: 'daily',
    channel: 'daily-signal',
    draftType: 'daily_signal',
    memberAction: 'Ship or inspect one useful builder action from the day prompt.',
    pointsIntent: 'attempt',
    captureTarget: 'question',
    proofPath: ['draft', 'admin_approval', 'published_message', 'member_reply', 'content_candidate'],
    qualityGate: ['specific action', 'builder outcome', 'no hype', 'approval before publish'],
  },
  {
    key: 'daily-questionnaire',
    label: 'Builder Questionnaire',
    cadence: 'daily',
    channel: 'the-floor',
    draftType: 'announcement',
    memberAction: 'Answer a structured context prompt: goal, blocker, artifact, decision needed.',
    pointsIntent: 'attempt',
    captureTarget: 'profile_signal',
    proofPath: ['draft', 'admin_approval', 'member_reply', 'member_intelligence_update'],
    qualityGate: ['short enough to answer', 'captures context', 'routes future help', 'no private data forced'],
  },
  {
    key: 'daily-lesson',
    label: 'Mini Lesson',
    cadence: 'daily',
    channel: 'playbooks',
    draftType: 'lesson',
    memberAction: 'Read one reusable principle and reply with where it applies in their current build.',
    pointsIntent: 'attempt',
    captureTarget: 'answer',
    proofPath: ['draft', 'admin_approval', 'published_message', 'reply_candidate', 'rag_candidate'],
    qualityGate: ['one principle', 'one example', 'one application prompt', 'source-safe'],
  },
  {
    key: 'daily-interview-question',
    label: 'Interview Question',
    cadence: 'daily',
    channel: 'quiz-room',
    draftType: 'quiz',
    memberAction: 'Explain a real engineering/product decision in interview-ready language.',
    pointsIntent: 'attempt',
    captureTarget: 'answer',
    proofPath: ['draft', 'admin_approval', 'member_answer', 'helpful_answer_candidate'],
    qualityGate: ['scenario-based', 'tests judgment', 'has rubric', 'not trivia'],
  },
  {
    key: 'daily-quiz',
    label: 'Daily Quiz',
    cadence: 'daily',
    channel: 'quiz-room',
    draftType: 'quiz',
    memberAction: 'Answer one source-grounded quiz and read the explanation.',
    pointsIntent: 'attempt',
    captureTarget: 'answer',
    proofPath: ['generated_quiz', 'quality_gate', 'quiz_attempt', 'points_ledger', 'streak_update'],
    qualityGate: ['four options', 'one correct answer', 'clear explanation', 'anti-farming key'],
  },
  {
    key: 'daily-build-challenge',
    label: 'Build Challenge',
    cadence: 'daily',
    channel: 'build-lab',
    draftType: 'challenge',
    memberAction: 'Submit a small artifact through the challenge/project workflow.',
    pointsIntent: 'reviewed',
    captureTarget: 'project',
    proofPath: ['challenge_draft', 'admin_approval', 'submission', 'admin_review', 'points_ledger'],
    qualityGate: ['buildable today', 'specific deliverable', 'review required for points', 'duplicate guard'],
  },
  {
    key: 'daily-resource-drop',
    label: 'Resource Drop',
    cadence: 'daily',
    channel: 'resources',
    draftType: 'resource_drop',
    memberAction: 'Use, save, or improve a reusable checklist, prompt, template, or tool.',
    pointsIntent: 'none',
    captureTarget: 'resource',
    proofPath: ['draft', 'admin_approval', 'published_message', 'resource_candidate', 'rag_candidate'],
    qualityGate: ['practical resource', 'why it matters', 'how to use it', 'source/provenance'],
  },
  {
    key: 'weekly-project-window',
    label: 'Project Submission Window',
    cadence: 'weekly',
    channel: 'project-submissions',
    draftType: 'challenge',
    memberAction: 'Submit one review-ready project artifact with context and next risk.',
    pointsIntent: 'reviewed',
    captureTarget: 'project',
    proofPath: ['submission', 'admin_review', 'feature_candidate', 'public_proof_candidate'],
    qualityGate: ['artifact required', 'context required', 'privacy review', 'feature only after approval'],
  },
  {
    key: 'weekly-review-queue',
    label: 'Review Queue',
    cadence: 'weekly',
    channel: 'review-queue',
    draftType: 'announcement',
    memberAction: 'Request one focused critique with the exact decision needed.',
    pointsIntent: 'reviewed',
    captureTarget: 'review',
    proofPath: ['review_request', 'admin_or_peer_answer', 'helpful_answer_candidate', 'lesson_candidate'],
    qualityGate: ['specific artifact', 'specific review type', 'decision needed', 'reuse review safely'],
  },
  {
    key: 'weekly-leaderboard',
    label: 'Weekly Leaderboard',
    cadence: 'weekly',
    channel: 'weekly-recap',
    draftType: 'announcement',
    memberAction: 'Recognize useful participation: questions, answers, builds, reviews, wins.',
    pointsIntent: 'featured',
    captureTarget: 'recap',
    proofPath: ['points_ledger', 'leaderboard_snapshot', 'admin_review', 'weekly_recognition'],
    qualityGate: ['anti-farming', 'quality weighted', 'manual reversal possible', 'no spam incentives'],
  },
  {
    key: 'weekly-recap',
    label: 'Weekly Recap',
    cadence: 'weekly',
    channel: 'weekly-recap',
    draftType: 'weekly_recap',
    memberAction: 'Read the week summary and pick one next build/action.',
    pointsIntent: 'none',
    captureTarget: 'recap',
    proofPath: ['leaderboard_snapshot', 'content_queue', 'challenge_recap', 'admin_approval', 'published_message'],
    qualityGate: ['source-backed', 'sanitized member content', 'clear next week focus', 'no fake proof'],
  },
];

function uniqueSorted(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
}

export function buildDiscordInteractionEngineReport(input: { generatedAt?: string } = {}): DiscordInteractionEngineReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const contentFactorySlots = buildDiscordContentFactorySlots(new Date(Date.UTC(2026, 6, 6, 12, 0, 0)), 7);
  const durableJobKeys = DISCORD_DURABLE_JOB_REGISTRY.map((job) => job.jobKey);
  const failures: string[] = [];
  const laneKeys = interactionLanes.map((lane) => lane.key);
  const dailyLanes = interactionLanes.filter((lane) => lane.cadence === 'daily');
  const weeklyLanes = interactionLanes.filter((lane) => lane.cadence === 'weekly');
  const channelCoverage = uniqueSorted(interactionLanes.map((lane) => lane.channel));
  const captureCoverage = uniqueSorted(interactionLanes.map((lane) => lane.captureTarget));
  const pointsCoverage = uniqueSorted(interactionLanes.map((lane) => lane.pointsIntent));
  const durableJobCoverage = requiredDurableJobs.filter((jobKey) => durableJobKeys.includes(jobKey));

  for (const key of requiredDailyLaneKeys) {
    if (!laneKeys.includes(key)) failures.push(`missing_daily_lane:${key}`);
  }
  for (const key of requiredWeeklyLaneKeys) {
    if (!laneKeys.includes(key)) failures.push(`missing_weekly_lane:${key}`);
  }
  for (const jobKey of requiredDurableJobs) {
    if (!durableJobKeys.includes(jobKey)) failures.push(`missing_durable_job:${jobKey}`);
  }
  for (const target of ['question', 'answer', 'resource', 'project', 'review', 'profile_signal', 'recap']) {
    if (!captureCoverage.includes(target)) failures.push(`missing_capture_target:${target}`);
  }
  for (const intent of ['none', 'attempt', 'reviewed', 'featured']) {
    if (!pointsCoverage.includes(intent)) failures.push(`missing_points_intent:${intent}`);
  }
  if (contentFactorySlots.length < 58) failures.push('content_factory_slots_too_thin');
  if (dailyLanes.length < 7) failures.push('daily_lanes_too_thin');
  if (weeklyLanes.length < 4) failures.push('weekly_lanes_too_thin');
  if (!interactionLanes.every((lane) => lane.proofPath.length >= 4)) failures.push('weak_proof_path');
  if (!interactionLanes.every((lane) => lane.qualityGate.length >= 4)) failures.push('weak_quality_gate');
  if (!interactionLanes.every((lane) => lane.memberAction.length >= 40)) failures.push('weak_member_action');

  return {
    ok: failures.length === 0,
    version: 'discord-interaction-engine-v1',
    generatedAt,
    mutationMode: 'local_file_evidence_only',
    laneCount: interactionLanes.length,
    dailyLaneCount: dailyLanes.length,
    weeklyLaneCount: weeklyLanes.length,
    channelCoverage,
    captureCoverage,
    pointsCoverage,
    durableJobCoverage,
    contentFactorySlotCount: contentFactorySlots.length,
    approvalGate: {
      noPublicPublish: true,
      adminApprovalRequired: true,
      memberActivityRequiredForProof: true,
    },
    operatingLoop: [
      'Generate approval-gated daily and weekly drafts.',
      'Admin approves only useful, specific, source-safe drafts.',
      'Sprout posts into the right channel and prompts one concrete member action.',
      'Member replies, quiz attempts, questions, builds, reviews, and wins are captured.',
      'Points are awarded only through idempotent attempts or reviewed submissions.',
      'Useful activity becomes content queue, knowledge candidate, recap, or public proof candidate.',
      'Weekly leaderboard and recap close the loop and set the next week focus.',
    ],
    lanes: interactionLanes,
    failures,
    releaseMeaning: 'This proves the local daily interaction operating design and wiring. It does not publish Discord messages, claim organic engagement, or count proof until real member activity is approved and captured.',
  };
}

export function validateDiscordInteractionEngineReport(report: DiscordInteractionEngineReport): {
  ok: boolean;
  failures: string[];
} {
  const failures = [...report.failures];
  if (report.version !== 'discord-interaction-engine-v1') failures.push('wrong_version');
  if (report.mutationMode !== 'local_file_evidence_only') failures.push('wrong_mutation_mode');
  if (report.laneCount < 11) failures.push('lane_count_too_low');
  if (report.dailyLaneCount < 7) failures.push('daily_lane_count_too_low');
  if (report.weeklyLaneCount < 4) failures.push('weekly_lane_count_too_low');
  if (report.contentFactorySlotCount < 58) failures.push('content_factory_slot_count_too_low');
  if (report.approvalGate.noPublicPublish !== true) failures.push('public_publish_not_blocked');
  if (report.approvalGate.adminApprovalRequired !== true) failures.push('admin_approval_not_required');
  if (report.approvalGate.memberActivityRequiredForProof !== true) failures.push('member_activity_proof_boundary_missing');
  for (const channel of ['the-floor', 'daily-signal', 'quiz-room', 'build-lab', 'playbooks', 'resources', 'weekly-recap']) {
    if (!report.channelCoverage.includes(channel)) failures.push(`missing_channel:${channel}`);
  }
  for (const target of ['question', 'answer', 'resource', 'project', 'review', 'profile_signal', 'recap']) {
    if (!report.captureCoverage.includes(target)) failures.push(`missing_capture:${target}`);
  }
  for (const jobKey of requiredDurableJobs) {
    if (!report.durableJobCoverage.includes(jobKey)) failures.push(`missing_job:${jobKey}`);
  }
  if (!report.releaseMeaning.includes('does not publish Discord messages')) failures.push('publish_boundary_missing');
  return {
    ok: failures.length === 0,
    failures,
  };
}
