import type { SupabaseClient } from '@supabase/supabase-js';
import { createDiscordContentDraft } from './content-approval';
import { evaluateDiscordContentDraft } from './content-quality';
import { recordDiscordEvent } from './analytics';
import {
  SAGEBOT_PERSONALITY_VERSION,
  SAGEBOT_PROMPT_VERSIONS,
  scoreSageBotPolicyOutput,
} from './sagebot-personality';
import { leanDiscordChannels } from './sage-content';

export const DISCORD_CONTENT_FACTORY_VERSION = 'discord-content-factory-v1';
export const DISCORD_CONTENT_FACTORY_PROMPT_VERSION = 'sagebot_content_factory_v1';

export type DiscordContentFactorySlot = {
  key: string;
  dayOffset: number;
  targetChannelBaseName: string;
  draftType: 'daily_signal' | 'quiz' | 'challenge' | 'resource_drop' | 'weekly_recap' | 'lesson' | 'announcement';
  title: string;
  topic: string;
  objective: string;
  actionLabel: string;
  deliverable: string;
};

export type DiscordContentFactoryOperatingContract = {
  cadence: 'daily' | 'weekly';
  adminAction: 'review_then_approve_or_reject';
  expectedMemberResponse: string;
  proofPromotionPath: Array<'member_reply' | 'admin_review' | 'content_queue_candidate' | 'rag_candidate' | 'public_proof_candidate' | 'weekly_recap_input'>;
  proofLaneTargets: Array<'approved_discord_knowledge' | 'rag_discord_sources' | 'public_proof_assets' | 'premium_workflow_proof'>;
  collectionInstruction: string;
  requiredEvidenceBeforeProof: string[];
  pointsEligibleAfterReview: boolean;
};

export type DiscordContentFactoryResult = {
  ok: boolean;
  runKey: string;
  version: string;
  dryRun: boolean;
  sourcePolicy: {
    sourceKind: 'editorial_seed';
    operatingProofEligible: false;
    requiresApprovedSourceBeforePublicProof: true;
  };
  channelValidation: ReturnType<typeof validateDiscordContentFactoryChannels>;
  created: number;
  planned: number;
  skipped: number;
  failed: number;
  drafts: Array<{
    factoryKey: string;
    draftId: string | null;
    status: 'created' | 'planned' | 'skipped' | 'failed';
    title: string;
    targetChannelBaseName: string;
    draftType: DiscordContentFactorySlot['draftType'];
    topic: string;
    dayOffset: number;
    qualityScore: number | null;
    operatingContract: DiscordContentFactoryOperatingContract | null;
    error: string | null;
  }>;
};

const weeklyTopics = [
  {
    label: 'Approval-gated AI apps',
    build: 'Map one AI feature with input, output, approval step, failure state, and owner.',
    question: 'Where should a human approve the result before it reaches a user?',
    resource: 'A one-page checklist for blocking bad AI output before public posting.',
  },
  {
    label: 'Websites that convert from proof',
    build: 'Turn one shipped artifact into a proof block with claim, screenshot/link, and next action.',
    question: 'What proof would make a buyer trust the system faster?',
    resource: 'A before/after audit rubric for a high-trust service page.',
  },
  {
    label: 'Content engines from real questions',
    build: 'Convert one repeated question into a reusable answer, resource, and draft post.',
    question: 'What question keeps coming up that should become a durable asset?',
    resource: 'A source-first content workflow: capture, approve, draft, evaluate, publish, sync.',
  },
  {
    label: 'Cloud and automation reliability',
    build: 'Document one scheduled job with idempotency key, retry rule, dead letter, and dashboard signal.',
    question: 'What failure should become visible instead of silent?',
    resource: 'A durable-job checklist for cron, workers, retries, and admin recovery.',
  },
  {
    label: 'Review-driven building',
    build: 'Submit one small artifact for critique with goal, user, what changed, and what feels weak.',
    question: 'What specific review would make your current build stronger?',
    resource: 'A review template that produces useful critique instead of vague feedback.',
  },
  {
    label: 'Growth loops and public proof',
    build: 'Turn one internal win into a privacy-safe public proof draft.',
    question: 'What can be shared publicly without exposing private member details?',
    resource: 'A public-proof checklist: source, permission, privacy, quality, CTA, metric.',
  },
  {
    label: 'Weekly synthesis',
    build: 'Pick the strongest question, build, resource, and lesson from the week.',
    question: 'What should become next week’s challenge or resource drop?',
    resource: 'A weekly recap structure: signal, challenge, useful answer, resource, next build.',
  },
];

export function buildDiscordContentFactorySlots(startDate = new Date(), days = 7): DiscordContentFactorySlot[] {
  const slots: DiscordContentFactorySlot[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + offset);
    const topic = weeklyTopics[date.getUTCDay()];
    const dateKey = date.toISOString().slice(0, 10);
    slots.push(
      {
        key: `${dateKey}:daily-signal`,
        dayOffset: offset,
        targetChannelBaseName: 'daily-signal',
        draftType: 'daily_signal',
        title: `Daily Signal - ${topic.label}`,
        topic: topic.label,
        objective: 'Give members one specific builder action for today.',
        actionLabel: 'Build prompt',
        deliverable: topic.build,
      },
      {
        key: `${dateKey}:daily-question`,
        dayOffset: offset,
        targetChannelBaseName: 'the-floor',
        draftType: 'announcement',
        title: `Daily Question - ${topic.label}`,
        topic: topic.label,
        objective: 'Create a useful discussion that can become future source material.',
        actionLabel: 'Question',
        deliverable: topic.question,
      },
      {
        key: `${dateKey}:daily-lesson`,
        dayOffset: offset,
        targetChannelBaseName: 'playbooks',
        draftType: 'lesson',
        title: `Mini Playbook - ${topic.label}`,
        topic: topic.label,
        objective: 'Teach one reusable principle and ask members to apply it to a current build.',
        actionLabel: 'Apply it',
        deliverable: `${topic.resource} Explain where you used it and what changed.`,
      },
      {
        key: `${dateKey}:daily-quiz`,
        dayOffset: offset,
        targetChannelBaseName: 'quiz-room',
        draftType: 'quiz',
        title: `Retrieval Check - ${topic.label}`,
        topic: topic.label,
        objective: 'Create one scenario-based retrieval prompt with a clear explanation after the attempt.',
        actionLabel: 'Question',
        deliverable: topic.question,
      },
      {
        key: `${dateKey}:daily-challenge`,
        dayOffset: offset,
        targetChannelBaseName: 'challenges',
        draftType: 'challenge',
        title: `Daily Challenge - ${topic.label}`,
        topic: topic.label,
        objective: 'Turn the lesson into one small artifact that can be reviewed instead of self-attested.',
        actionLabel: 'Deliverable',
        deliverable: topic.build,
      },
      {
        key: `${dateKey}:build-lab`,
        dayOffset: offset,
        targetChannelBaseName: 'build-lab',
        draftType: 'challenge',
        title: `Build Lab - ${topic.label}`,
        topic: topic.label,
        objective: 'Create one reviewable artifact members can ship or submit.',
        actionLabel: 'Challenge',
        deliverable: topic.build,
      },
      {
        key: `${dateKey}:resource-drop`,
        dayOffset: offset,
        targetChannelBaseName: 'resources',
        draftType: 'resource_drop',
        title: `Resource Drop - ${topic.label}`,
        topic: topic.label,
        objective: 'Give members one reusable checklist or template.',
        actionLabel: 'Resource',
        deliverable: topic.resource,
      },
    );
  }

  const weekKey = startDate.toISOString().slice(0, 10);
  slots.push(
    {
      key: `${weekKey}:weekly-announcement`,
      dayOffset: 0,
      targetChannelBaseName: 'the-floor',
      draftType: 'announcement',
      title: 'Weekly Launch - what to build, ask, and submit',
      topic: 'Weekly operating rhythm',
      objective: 'Give approved members a clear weekly map without adding more channels.',
      actionLabel: 'This week',
      deliverable: 'Post the weekly theme, main challenge, live-room reminder, and what counts for points.',
    },
    {
      key: `${weekKey}:intro-prompt`,
      dayOffset: 0,
      targetChannelBaseName: 'the-floor',
      draftType: 'announcement',
      title: 'Intro Prompt - make your first ask useful',
      topic: 'Member activation',
      objective: 'Convert newly approved members into routed, useful participants.',
      actionLabel: 'Intro',
      deliverable: 'Share your path, level, current build, blocker, and one thing you want feedback on this week.',
    },
    {
      key: `${weekKey}:project-submissions`,
      dayOffset: 2,
      targetChannelBaseName: 'project-submissions',
      draftType: 'challenge',
      title: 'Project Submission Window - ship one artifact',
      topic: 'Project proof',
      objective: 'Move members from discussion into reviewable work.',
      actionLabel: 'Submission',
      deliverable: 'Submit one link, screenshot, repo, doc, or demo with goal, user, what changed, and next risk.',
    },
    {
      key: `${weekKey}:review-queue`,
      dayOffset: 3,
      targetChannelBaseName: 'review-queue',
      draftType: 'announcement',
      title: 'Review Queue - request specific critique',
      topic: 'Review-driven building',
      objective: 'Teach members to ask for critique that improves the artifact.',
      actionLabel: 'Review request',
      deliverable: 'Ask for one specific review: copy, UX, code, architecture, AI behavior, SEO, cloud, or growth.',
    },
    {
      key: `${weekKey}:content-queue`,
      dayOffset: 4,
      targetChannelBaseName: 'saved-answers',
      draftType: 'lesson',
      title: 'Saved Answer - turn a question into a durable asset',
      topic: 'Content engine from real activity',
      objective: 'Capture reusable lessons from questions, answers, builds, and reviews.',
      actionLabel: 'Content candidate',
      deliverable: 'Nominate one question, answer, build, resource gap, or repeated confusion that should become a resource.',
    },
    {
      key: `${weekKey}:office-hours`,
      dayOffset: 4,
      targetChannelBaseName: 'office-hours',
      draftType: 'announcement',
      title: 'Office Hours Queue - bring the real blocker',
      topic: 'Live help',
      objective: 'Prepare live sessions around concrete member blockers.',
      actionLabel: 'Queue item',
      deliverable: 'Post the artifact, blocker, decision needed, and what would make the session useful.',
    },
    {
      key: `${weekKey}:accountability`,
      dayOffset: 5,
      targetChannelBaseName: 'challenges',
      draftType: 'announcement',
      title: 'Accountability Check - what shipped this week',
      topic: 'Shipping rhythm',
      objective: 'Create a weekly habit around committed work and visible progress.',
      actionLabel: 'Check-in',
      deliverable: 'Post what you committed to, what shipped, what slipped, and the smallest next action.',
    },
    {
      key: `${weekKey}:weekly-recap`,
      dayOffset: 6,
      targetChannelBaseName: 'weekly-recap',
      draftType: 'weekly_recap',
      title: 'Weekly Recap - builds, questions, wins, and next challenge',
      topic: 'Weekly synthesis',
      objective: 'Summarize the operating loop and point members at the next useful action.',
      actionLabel: 'Weekly recap',
      deliverable: 'Select one useful question, one build prompt, one resource, one win, and one next-week challenge.',
    },
    {
      key: `${weekKey}:live-room`,
      dayOffset: 5,
      targetChannelBaseName: 'live-room',
      draftType: 'announcement',
      title: 'Live Room - prepare one decision for the session',
      topic: 'Live implementation support',
      objective: 'Make the live session useful by collecting concrete artifacts and decisions in advance.',
      actionLabel: 'Prepare',
      deliverable: 'Bring one artifact, the blocker, what you tried, and the exact decision you want help making.',
    },
  );

  return slots;
}

export function buildDiscordContentFactoryBody(slot: DiscordContentFactorySlot, date = new Date()): string {
  const dateKey = date.toISOString().slice(0, 10);
  const contract = buildDiscordContentFactoryOperatingContract(slot);
  return [
    `# ${slot.title}`,
    `**Theme:** ${slot.topic}`,
    `**Purpose:** ${slot.objective}`,
    `**${slot.actionLabel}:** ${slot.deliverable}`,
    '**How to participate:** Reply with your artifact, blocker, or decision. Good replies can become approved resources, RAG knowledge, or public proof after review.',
    `**Proof lane:** This prompt is designed to collect ${contract.proofLaneTargets.join(', ')} evidence after admin review.`,
    `**Review note:** ${contract.collectionInstruction}`,
    '**Quality bar:** Be specific. Include context, what you tried, what failed, and the next decision you need help with.',
    `**Deliverable:** Post one concrete artifact or answer by the end of ${dateKey}.`,
  ].join('\n\n');
}

export function buildDiscordContentFactoryOperatingContract(
  slot: DiscordContentFactorySlot,
): DiscordContentFactoryOperatingContract {
  const cadence = slot.key.includes(':weekly-') || slot.key.includes(':intro-') || slot.key.includes(':project-')
    || slot.key.includes(':review-') || slot.key.includes(':content-') || slot.key.includes(':office-')
    || slot.key.includes(':accountability')
    ? 'weekly'
    : 'daily';
  const byChannel: Record<string, Pick<DiscordContentFactoryOperatingContract, 'expectedMemberResponse' | 'proofPromotionPath' | 'pointsEligibleAfterReview'>> = {
    'daily-signal': {
      expectedMemberResponse: 'One concrete build action, answer, artifact, or blocker tied to the daily prompt.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    'the-floor': {
      expectedMemberResponse: 'A specific question with context, attempted solution, blocker, and desired decision.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    'build-lab': {
      expectedMemberResponse: 'A small build artifact, spec, screenshot, repo, or implementation update.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'public_proof_candidate'],
      pointsEligibleAfterReview: true,
    },
    resources: {
      expectedMemberResponse: 'A reusable checklist, template, link, or tool with why it is useful.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    'playbooks': {
      expectedMemberResponse: 'One concrete application of the playbook plus the result, failure, or missing step.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    'quiz-room': {
      expectedMemberResponse: 'One scenario answer followed by a correction or explanation after the attempt.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    challenges: {
      expectedMemberResponse: 'A reviewable challenge artifact submitted through the idempotent review workflow.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'public_proof_candidate'],
      pointsEligibleAfterReview: true,
    },
    'saved-answers': {
      expectedMemberResponse: 'A correction, practical application, or freshness concern for an approved answer.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: false,
    },
    'live-room': {
      expectedMemberResponse: 'A live-session artifact, blocker, attempted solution, and exact decision needed.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'weekly_recap_input'],
      pointsEligibleAfterReview: false,
    },
    'weekly-recap': {
      expectedMemberResponse: 'A reviewed win, correction, next action, or useful contribution from the completed week.',
      proofPromotionPath: ['member_reply', 'admin_review', 'public_proof_candidate', 'weekly_recap_input'],
      pointsEligibleAfterReview: true,
    },
    announcements: {
      expectedMemberResponse: 'Member acknowledgement, commitment, or reply that identifies what they will build this week.',
      proofPromotionPath: ['member_reply', 'admin_review', 'weekly_recap_input'],
      pointsEligibleAfterReview: false,
    },
    introductions: {
      expectedMemberResponse: 'Path, level, current build, blocker, and first useful help request.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate'],
      pointsEligibleAfterReview: false,
    },
    'project-submissions': {
      expectedMemberResponse: 'A submitted artifact with goal, target user, changed work, proof link, and next risk.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'public_proof_candidate', 'weekly_recap_input'],
      pointsEligibleAfterReview: true,
    },
    'review-queue': {
      expectedMemberResponse: 'A focused critique request naming the artifact, review type, and decision needed.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate'],
      pointsEligibleAfterReview: true,
    },
    'content-queue': {
      expectedMemberResponse: 'A candidate question, answer, resource gap, review lesson, build, or win worth turning into durable content.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'rag_candidate', 'public_proof_candidate'],
      pointsEligibleAfterReview: true,
    },
    'office-hours': {
      expectedMemberResponse: 'A blocker, artifact, question, and decision that would make the live session useful.',
      proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate', 'weekly_recap_input'],
      pointsEligibleAfterReview: false,
    },
    accountability: {
      expectedMemberResponse: 'What was committed, what shipped, what slipped, and the next smallest action.',
      proofPromotionPath: ['member_reply', 'admin_review', 'weekly_recap_input', 'public_proof_candidate'],
      pointsEligibleAfterReview: true,
    },
    'wins-showcase': {
      expectedMemberResponse: 'A finished ship, useful answer, win, or before/after with permission-safe proof.',
      proofPromotionPath: ['member_reply', 'admin_review', 'public_proof_candidate', 'weekly_recap_input'],
      pointsEligibleAfterReview: true,
    },
  };
  const channelContract = byChannel[slot.targetChannelBaseName] ?? {
    expectedMemberResponse: 'A concrete reply that can be reviewed by an admin before reuse.',
    proofPromotionPath: ['member_reply', 'admin_review', 'content_queue_candidate'],
    pointsEligibleAfterReview: false,
  };
  const proofLaneTargets: DiscordContentFactoryOperatingContract['proofLaneTargets'] = [];
  if (channelContract.proofPromotionPath.includes('rag_candidate')) {
    proofLaneTargets.push('approved_discord_knowledge', 'rag_discord_sources');
  }
  if (channelContract.proofPromotionPath.includes('public_proof_candidate')) {
    proofLaneTargets.push('public_proof_assets');
  }
  if (slot.targetChannelBaseName === 'office-hours') {
    proofLaneTargets.push('premium_workflow_proof');
  }
  const fallbackProofLaneTargets: DiscordContentFactoryOperatingContract['proofLaneTargets'] = ['approved_discord_knowledge'];
  const uniqueProofLaneTargets = [...new Set(proofLaneTargets.length ? proofLaneTargets : fallbackProofLaneTargets)];
  const collectionInstruction = uniqueProofLaneTargets.includes('premium_workflow_proof')
    ? 'Capture the request, authorization state, SLA status, and fulfilled outcome before counting this as premium proof.'
    : uniqueProofLaneTargets.includes('public_proof_assets')
      ? 'Capture the member source, privacy status, approval decision, and publish/UTM status before counting this as public proof.'
      : 'Capture the member source, approval decision, privacy status, reusable summary, and RAG-safe status before counting this as knowledge.';
  return {
    cadence,
    adminAction: 'review_then_approve_or_reject',
    expectedMemberResponse: channelContract.expectedMemberResponse,
    proofPromotionPath: channelContract.proofPromotionPath,
    proofLaneTargets: uniqueProofLaneTargets,
    collectionInstruction,
    requiredEvidenceBeforeProof: [
      'approved draft id',
      'published Discord message id',
      'member response or submission id',
      'admin approval actor and timestamp',
      'privacy review result',
      'proof lane target',
      'operator attestation',
    ],
    pointsEligibleAfterReview: channelContract.pointsEligibleAfterReview,
  };
}

export function validateDiscordContentFactoryChannels(slots: DiscordContentFactorySlot[]): {
  ok: boolean;
  unknownChannels: string[];
  blockedChannels: Array<{ channel: string; reason: string }>;
  knownChannelCount: number;
  targetableChannelCount: number;
} {
  const knownChannels = new Map(leanDiscordChannels.map((channel) => [channel.name, channel]));
  const unknownChannels = [...new Set(slots
    .map((slot) => slot.targetChannelBaseName)
    .filter((channel) => !knownChannels.has(channel)))]
    .sort();
  const blockedChannels = [...new Set(slots.map((slot) => slot.targetChannelBaseName))]
    .map((channelName) => {
      const channel = knownChannels.get(channelName);
      if (!channel) return null;
      if (channel.visibility === 'pre_approval') {
        return { channel: channelName, reason: 'pre_approval_channel' };
      }
      if (channel.visibility === 'staff_private') {
        return { channel: channelName, reason: 'staff_private_channel' };
      }
      if (channel.visibility === 'premium_members') {
        return { channel: channelName, reason: 'premium_requires_separate_workflow' };
      }
      return null;
    })
    .filter((item): item is { channel: string; reason: string } => Boolean(item))
    .sort((a, b) => a.channel.localeCompare(b.channel));
  const targetableChannelCount = leanDiscordChannels
    .filter((channel) => !['pre_approval', 'staff_private', 'premium_members'].includes(channel.visibility))
    .length;
  return {
    ok: unknownChannels.length === 0 && blockedChannels.length === 0,
    unknownChannels,
    blockedChannels,
    knownChannelCount: knownChannels.size,
    targetableChannelCount,
  };
}

export function evaluateDiscordContentFactorySlot(
  slot: DiscordContentFactorySlot,
  input: { startDate?: Date } = {},
): {
  factoryKey: string;
  title: string;
  targetChannelBaseName: string;
  body: string;
  qualityScore: number;
  contentQualityScore: number;
  policyScore: number;
  contentQualityPassed: boolean;
  policyPassed: boolean;
  contentQualityReasons: string[];
  policyReasons: string[];
  reasons: string[];
  operatingContract: DiscordContentFactoryOperatingContract;
} {
  const startDate = input.startDate ?? new Date();
  const date = new Date(startDate);
  date.setUTCDate(date.getUTCDate() + slot.dayOffset);
  const factoryKey = `${DISCORD_CONTENT_FACTORY_VERSION}:${slot.key}`;
  const body = buildDiscordContentFactoryBody(slot, date);
  const contentQuality = evaluateDiscordContentDraft({
    id: factoryKey,
    draft_type: slot.draftType,
    title: slot.title,
    body,
    target_channel_base_name: slot.targetChannelBaseName,
  });
  const policy = scoreSageBotPolicyOutput(body, { maxLength: 2200 });
  const qualityScore = Math.min(contentQuality.score, policy.score);
  const reasons = [...contentQuality.reasons, ...policy.reasons];
  const operatingContract = buildDiscordContentFactoryOperatingContract(slot);
  return {
    factoryKey,
    title: slot.title,
    targetChannelBaseName: slot.targetChannelBaseName,
    body,
    qualityScore,
    contentQualityScore: contentQuality.score,
    policyScore: policy.score,
    contentQualityPassed: contentQuality.passed,
    policyPassed: policy.passed,
    contentQualityReasons: contentQuality.reasons,
    policyReasons: policy.reasons,
    reasons,
    operatingContract,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

async function findContentFactoryDraftByKey(sb: SupabaseClient<any>, factoryKey: string): Promise<{
  id: string;
  quality_score: number | null;
} | null> {
  const { data, error } = await sb
    .from('discord_content_drafts')
    .select('id, quality_score')
    .contains('metadata', { factory_key: factoryKey })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: String(data.id), quality_score: data.quality_score == null ? null : Number(data.quality_score) } : null;
}

export async function runDiscordContentFactory(
  sb: SupabaseClient<any>,
  input: {
    startDate?: Date;
    days?: number;
    force?: boolean;
    dryRun?: boolean;
    runKey?: string;
    now?: Date;
  } = {},
): Promise<DiscordContentFactoryResult> {
  const startDate = input.startDate ?? new Date();
  const now = input.now ?? new Date();
  const days = Math.max(1, Math.min(28, input.days ?? 7));
  const runKey = input.runKey ?? `content-factory-${startDate.toISOString().slice(0, 10)}-${now.toISOString().replace(/[:.]/g, '-')}`;
  const slots = buildDiscordContentFactorySlots(startDate, days);
  const channelValidation = validateDiscordContentFactoryChannels(slots);
  if (!channelValidation.ok) {
    const blocked = channelValidation.blockedChannels.map((item) => `${item.channel}:${item.reason}`);
    throw new Error(`Content factory targets invalid channels: ${[...channelValidation.unknownChannels, ...blocked].join(', ')}`);
  }
  const drafts: DiscordContentFactoryResult['drafts'] = [];
  const dryRun = Boolean(input.dryRun);

  for (const slot of slots) {
    const planned = evaluateDiscordContentFactorySlot(slot, { startDate });
    const factoryKey = planned.factoryKey;
    try {
      if (!planned.contentQualityPassed || !planned.policyPassed || planned.qualityScore < 80) {
        throw new Error(`Content factory slot failed quality gate: ${planned.reasons.join('; ') || `score ${planned.qualityScore}`}`);
      }

      if (dryRun) {
        drafts.push({
          factoryKey,
          draftId: null,
          status: 'planned',
          title: planned.title,
          targetChannelBaseName: planned.targetChannelBaseName,
          draftType: slot.draftType,
          topic: slot.topic,
          dayOffset: slot.dayOffset,
          qualityScore: planned.qualityScore,
          operatingContract: planned.operatingContract,
          error: null,
        });
        continue;
      }

      if (!input.force) {
        const existing = await findContentFactoryDraftByKey(sb, factoryKey);
        if (existing?.id) {
          drafts.push({
            factoryKey,
            draftId: String(existing.id),
            status: 'skipped',
            title: slot.title,
            targetChannelBaseName: slot.targetChannelBaseName,
            draftType: slot.draftType,
            topic: slot.topic,
            dayOffset: slot.dayOffset,
            qualityScore: Number(existing.quality_score ?? 0),
            operatingContract: planned.operatingContract,
            error: null,
          });
          continue;
        }
      }

      const draft = await createDiscordContentDraft({
        draftType: slot.draftType,
        targetChannelBaseName: slot.targetChannelBaseName,
        title: slot.title,
        body: planned.body,
        promptVersion: DISCORD_CONTENT_FACTORY_PROMPT_VERSION,
        qualityScore: planned.qualityScore,
        status: 'pending_approval',
        metadata: {
          source: DISCORD_CONTENT_FACTORY_VERSION,
          source_kind: 'editorial_seed',
          operating_proof_eligible: false,
          requires_approved_source_before_public_proof: true,
          factory_key: factoryKey,
          run_key: runKey,
          requires_admin_approval: true,
          publish_allowed_before_approval: false,
          topic: slot.topic,
          slot,
          policy_score: planned.policyScore,
          policy_passed: planned.policyPassed,
          policy_reasons: planned.policyReasons,
          content_quality_score: planned.contentQualityScore,
          content_quality_passed: planned.contentQualityPassed,
          content_quality_reasons: planned.contentQualityReasons,
          operating_contract: planned.operatingContract,
          content_factory_dry_run: false,
          personality_version: SAGEBOT_PERSONALITY_VERSION,
          prompt_versions: SAGEBOT_PROMPT_VERSIONS,
        },
      }, sb);

      drafts.push({
        factoryKey,
        draftId: draft.id,
        status: 'created',
        title: slot.title,
        targetChannelBaseName: slot.targetChannelBaseName,
        draftType: slot.draftType,
        topic: slot.topic,
        dayOffset: slot.dayOffset,
        qualityScore: planned.qualityScore,
        operatingContract: planned.operatingContract,
        error: null,
      });
    } catch (error) {
      if (!input.force && isUniqueViolation(error)) {
        const existing = await findContentFactoryDraftByKey(sb, factoryKey);
        if (existing?.id) {
          drafts.push({
            factoryKey,
            draftId: existing.id,
            status: 'skipped',
            title: slot.title,
            targetChannelBaseName: slot.targetChannelBaseName,
            draftType: slot.draftType,
            topic: slot.topic,
            dayOffset: slot.dayOffset,
            qualityScore: existing.quality_score,
            operatingContract: planned.operatingContract,
            error: null,
          });
          continue;
        }
      }
      drafts.push({
        factoryKey,
        draftId: null,
        status: 'failed',
        title: slot.title,
        targetChannelBaseName: slot.targetChannelBaseName,
        draftType: slot.draftType,
        topic: slot.topic,
        dayOffset: slot.dayOffset,
        qualityScore: null,
        operatingContract: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const created = drafts.filter((draft) => draft.status === 'created').length;
  const planned = drafts.filter((draft) => draft.status === 'planned').length;
  const skipped = drafts.filter((draft) => draft.status === 'skipped').length;
  const failed = drafts.filter((draft) => draft.status === 'failed').length;
  if (!dryRun) {
    await recordDiscordEvent({
      eventType: failed ? 'content_factory_run_blocked' : 'content_factory_run_completed',
      commandName: 'content_factory',
      metadata: {
        run_key: runKey,
        version: DISCORD_CONTENT_FACTORY_VERSION,
        created,
        planned,
        skipped,
        failed,
        days,
      },
    });
  }

  return {
    ok: failed === 0,
    runKey,
    version: DISCORD_CONTENT_FACTORY_VERSION,
    dryRun,
    sourcePolicy: {
      sourceKind: 'editorial_seed',
      operatingProofEligible: false,
      requiresApprovedSourceBeforePublicProof: true,
    },
    channelValidation,
    created,
    planned,
    skipped,
    failed,
    drafts,
  };
}
