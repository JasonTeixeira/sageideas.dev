import {
  dailyAiTools,
  dailyBuildPrompts,
  dailyQuestions,
  pickDaily,
  sageLevelOptions,
  sagePathOptions,
  weeklyCadence,
  type SagePathKey,
} from './sage-content';
import {
  applyDiscordRoleRouting,
  getRecentChannelMessages,
  postToChannelByBaseName,
  roleIdsByName,
} from './sage-rest';
import { createDiscordPremiumCheckout } from './premium';
import { getDiscordMemberRouting, recordDiscordEvent, recordDiscordScheduledRun, upsertDiscordMember } from './analytics';
import { askSageFromDiscord } from './ask-sage';
import { postDiscordInteractionFollowup } from './followup';
import { synthesizeSproutVoice } from './voice';
import { answerPremiumQuestion, createOfficeHoursQueueItem, createPremiumReviewRequest } from './premium-workflows';
import { classifyDiscordAbuse, sanitizeDiscordOutboundText } from './security-privacy';
import {
  answerDailyQuiz,
  answerDiscordQuestion,
  askDiscordQuestion,
  awardDiscordPoints,
  captureContentQueueItem,
  completeOnboardingStep,
  getContentQueue,
  getDailyChallengeFromStore,
  getDailyContentPlan,
  getDailyQuizFromStore,
  getLeaderboard,
  getMemberPoints,
  getOnboardingChecklist,
  getOpenQuestions,
  getPendingApplications,
  getRecentAnswers,
  getWeeklyChallengeRecap,
  isApprovedDiscordMember,
  manuallyAwardDiscordPoints,
  markDiscordAnswerHelpful,
  onboardingSteps,
  type OnboardingStepKey,
  reviewMemberApplication,
  submitMemberApplication,
  submitDailyChallenge,
  submitProjectToBuildLab,
} from './engagement';
import { approveDiscordMember } from './onboarding';

const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;
const RESPONSE_TYPE_UPDATE_MESSAGE = 7;
const EPHEMERAL_FLAG = 64;

type DiscordOption = {
  name: string;
  value?: string | boolean;
  options?: DiscordOption[];
};

export type DiscordInteractionPayload = {
  application_id?: string;
  token?: string;
  type?: number;
  data?: {
    name?: string;
    custom_id?: string;
    values?: string[];
    options?: DiscordOption[];
  };
  member?: {
    user?: { id: string; username?: string };
    roles?: string[];
  };
  user?: { id: string; username?: string };
  channel_id?: string;
};

type InteractionResponse = {
  type: number;
  data?: Record<string, unknown>;
};

function optionValue(payload: DiscordInteractionPayload, name: string): string {
  const option = payload.data?.options?.find((item) => item.name === name);
  return String(option?.value ?? '').trim();
}

function optionBool(payload: DiscordInteractionPayload, name: string): boolean {
  const option = payload.data?.options?.find((item) => item.name === name);
  return option?.value === true;
}

function normalizedTagList(value?: string | null): string[] {
  return String(value ?? '')
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase().replace(/^#/, ''))
    .map((item) => item.replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 8);
}

function formatTagLine(tags: string[]): string | null {
  if (!tags.length) return null;
  return `**Tags:** ${tags.map((tag) => `\`${tag}\``).join(' ')}`;
}

function userId(payload: DiscordInteractionPayload): string | null {
  return payload.member?.user?.id ?? payload.user?.id ?? null;
}

function username(payload: DiscordInteractionPayload): string {
  return payload.member?.user?.username ?? payload.user?.username ?? 'member';
}

function ephemeral(content: string, extra?: Record<string, unknown>): InteractionResponse {
  return {
    type: RESPONSE_TYPE_CHANNEL_MESSAGE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
      ...(extra ?? {}),
    },
  };
}

function publicMessage(content: string): InteractionResponse {
  return {
    type: RESPONSE_TYPE_CHANNEL_MESSAGE,
    data: { content },
  };
}

export function isDeferredSageCommand(payload: DiscordInteractionPayload): boolean {
  return payload.data?.name === 'ask-sage'
    || payload.data?.name === 'premium-ask'
    || payload.data?.name === 'speak'
    || payload.data?.name === 'voice-summary';
}

async function awardDiscordPointsFallback(
  discordUserId: string,
  discordUsername: string,
  points: number,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await awardDiscordPoints({
    discordUserId,
    username: discordUsername,
    points,
    reason,
    source: 'question_fallback',
    metadata,
  });
}

async function isReviewer(payload: DiscordInteractionPayload): Promise<boolean> {
  const memberRoles = payload.member?.roles ?? [];
  if (!memberRoles.length) return false;
  const reviewerRoleIds = await roleIdsByName(['Founder', 'Admin', 'Moderator']);
  return memberRoles.some((roleId) => reviewerRoleIds.has(roleId));
}

async function requireApproved(payload: DiscordInteractionPayload): Promise<InteractionResponse | null> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const approved = await isApprovedDiscordMember(id);
  if (approved) return null;
  return ephemeral('You need approval before using member commands. Read `start-here`, complete the Discord application, and wait for manual approval first.');
}

export const sageCommandDefinitions = [
  {
    name: 'apply',
    description: 'Apply for Sage Ideas Academy access after reading and accepting the rules.',
    options: [
	      { name: 'goal', description: 'What do you want to learn or build here?', type: 3, required: true },
	      { name: 'experience', description: 'Your current skill level and background', type: 3, required: true },
	      { name: 'build', description: 'The first thing you want to build or improve', type: 3, required: true },
	      { name: 'rules', description: 'Confirm you read and accept the rules in start-here', type: 5, required: true },
	      {
	        name: 'path',
	        description: 'Primary learning path you want to follow',
	        type: 3,
	        required: false,
	        choices: sagePathOptions.map((option) => ({ name: option.label, value: option.key })),
	      },
	      {
	        name: 'level',
	        description: 'Your current builder level',
	        type: 3,
	        required: false,
	        choices: sageLevelOptions.map((option) => ({ name: option.label, value: option.key })),
	      },
	      { name: 'timezone', description: 'Your timezone for office hours and accountability', type: 3, required: false },
	      { name: 'time_budget', description: 'Weekly time you can realistically commit', type: 3, required: false },
	      {
	        name: 'support',
	        description: 'What kind of support would help most?',
	        type: 3,
	        required: false,
	        choices: [
	          { name: 'Questions and unblockers', value: 'questions' },
	          { name: 'Project review', value: 'review' },
	          { name: 'Accountability', value: 'accountability' },
	          { name: 'Premium critique', value: 'premium_curious' },
	        ],
	      },
	      { name: 'portfolio', description: 'Optional site, GitHub, LinkedIn, or current project link', type: 3, required: false },
	      { name: 'source', description: 'How did you hear about the community?', type: 3, required: false },
	    ],
	  },
  {
    name: 'approve',
    description: 'Approve a pending member application and grant Academy Member access.',
    options: [
      { name: 'user', description: 'Discord user to approve', type: 6, required: true },
      { name: 'note', description: 'Optional internal review note', type: 3, required: false },
    ],
  },
  {
    name: 'reject',
    description: 'Reject a pending member application.',
    options: [
      { name: 'user', description: 'Discord user to reject', type: 6, required: true },
      { name: 'note', description: 'Optional internal review note', type: 3, required: false },
    ],
  },
  {
    name: 'pending',
    description: 'Show pending member applications for review.',
  },
  {
    name: 'onboard',
    description: 'Start Sage Ideas Academy onboarding with path and level selectors.',
  },
  {
    name: 'choose-path',
    description: 'Choose or update your Sage Ideas Academy learning path.',
    options: [
      {
        name: 'path',
        description: 'Primary learning path',
        type: 3,
        required: true,
        choices: sagePathOptions.map((option) => ({ name: option.label, value: option.key })),
      },
    ],
  },
  {
    name: 'submit-project',
    description: 'Submit a project into the Build Lab pipeline.',
    options: [
      { name: 'title', description: 'Project title', type: 3, required: true },
      { name: 'path', description: 'Learning path', type: 3, required: true },
      { name: 'goal', description: 'What this project should accomplish', type: 3, required: true },
      { name: 'link', description: 'Optional repo, demo, screenshot, or doc link', type: 3, required: false },
    ],
  },
  {
    name: 'request-review',
    description: 'Request code, design, AI, SEO, cloud, or architecture review.',
    options: [
      {
        name: 'type',
        description: 'Review type',
        type: 3,
        required: true,
        choices: [
          { name: 'Design', value: 'design' },
          { name: 'Code', value: 'code' },
          { name: 'AI workflow', value: 'ai' },
          { name: 'Architecture', value: 'architecture' },
          { name: 'SEO/content', value: 'seo' },
          { name: 'Cloud/devops', value: 'cloud' },
        ],
      },
      { name: 'summary', description: 'What should be reviewed?', type: 3, required: true },
      { name: 'link', description: 'Optional link or screenshot', type: 3, required: false },
    ],
  },
  {
    name: 'premium-review',
    description: 'Submit a premium priority review request for a concrete artifact.',
    options: [
      {
        name: 'type',
        description: 'Review type',
        type: 3,
        required: true,
        choices: [
          { name: 'Design', value: 'design' },
          { name: 'Code', value: 'code' },
          { name: 'AI workflow', value: 'ai' },
          { name: 'Architecture', value: 'architecture' },
          { name: 'SEO/content', value: 'seo' },
          { name: 'Cloud/devops', value: 'cloud' },
          { name: 'Growth', value: 'growth' },
          { name: 'General', value: 'general' },
        ],
      },
      { name: 'summary', description: 'What should be reviewed, and what outcome do you want?', type: 3, required: true },
      { name: 'link', description: 'Artifact link, repo, page, doc, screenshot, or loom', type: 3, required: false },
    ],
  },
  {
    name: 'capture-content',
    description: 'Capture a question, lesson, win, or project moment into the content engine.',
    options: [
      { name: 'idea', description: 'Content-worthy question, lesson, win, or angle', type: 3, required: true },
      { name: 'source', description: 'Optional source/context', type: 3, required: false },
    ],
  },
  {
    name: 'daily-prompt',
    description: 'Post or preview today’s build prompt, AI tool, and discussion question.',
    options: [
      {
        name: 'mode',
        description: 'Preview privately or post publicly',
        type: 3,
        required: false,
        choices: [
          { name: 'Preview', value: 'preview' },
          { name: 'Post', value: 'post' },
        ],
      },
    ],
  },
  {
    name: 'ask',
    description: 'Ask a structured member question in the questions channel and earn points.',
    options: [
      { name: 'question', description: 'The question you need answered', type: 3, required: true },
      { name: 'context', description: 'Goal, blocker, attempted solution, or link context', type: 3, required: false },
    ],
  },
  {
    name: 'ask-sage',
    description: 'Ask SageBot for a private RAG-backed answer from the Sage Ideas knowledge base.',
    options: [
      { name: 'question', description: 'The question SageBot should answer from the knowledge base', type: 3, required: true },
      { name: 'context', description: 'Optional goal, blocker, or project context', type: 3, required: false },
    ],
  },
  {
    name: 'premium-ask',
    description: 'Ask a deeper premium RAG-backed question with implementation steps and risks.',
    options: [
      { name: 'question', description: 'The deeper question SageBot should answer', type: 3, required: true },
      { name: 'context', description: 'Optional project, code, business, or blocker context', type: 3, required: false },
    ],
  },
  {
    name: 'speak',
    description: 'Ask Sprout to turn a short message into a voice note.',
    options: [
      { name: 'text', description: 'Short text for Sprout to speak', type: 3, required: true },
    ],
  },
  {
    name: 'voice-summary',
    description: 'Ask Sprout to turn a concise recap into a voice note.',
    options: [
      { name: 'text', description: 'Concise recap or next-step summary', type: 3, required: true },
    ],
  },
  {
    name: 'answer',
    description: 'Answer a tracked question and earn helpful participation points.',
    options: [
      { name: 'question_id', description: 'Question id from /ask or the questions post', type: 3, required: true },
      { name: 'answer', description: 'Your useful answer', type: 3, required: true },
    ],
  },
  {
    name: 'mark-helpful',
    description: 'Mark an answer helpful and award the answerer a quality bonus.',
    options: [
      { name: 'answer_id', description: 'Answer id from /answer', type: 3, required: true },
    ],
  },
  {
    name: 'award',
    description: 'Admin/mod manual point award for high-quality contribution.',
    options: [
      { name: 'user', description: 'Member to award', type: 6, required: true },
      { name: 'points', description: 'Points to award, positive or negative', type: 4, required: true },
      { name: 'reason', description: 'Why points are being adjusted', type: 3, required: true },
    ],
  },
  {
    name: 'profile',
    description: 'Show your participation profile, points, rank, streak, and checklist.',
  },
  {
    name: 'rewards',
    description: 'Show how points translate into status, access, and rewards.',
  },
  {
    name: 'weekly-winners',
    description: 'Show weekly builders, helpers, and open question opportunities.',
  },
  {
    name: 'weekly-recap',
    description: 'Generate a lightweight weekly recap from build, wins, and content channels.',
    options: [
      {
        name: 'mode',
        description: 'Preview privately or post to the showcase channel',
        type: 3,
        required: false,
        choices: [
          { name: 'Preview', value: 'preview' },
          { name: 'Post', value: 'post' },
        ],
      },
    ],
  },
  {
    name: 'resource',
    description: 'Get the right Sage Ideas resource channel for a need.',
    options: [{ name: 'need', description: 'What do you need help finding?', type: 3, required: true }],
  },
  {
    name: 'office-hours',
    description: 'Get the live-room format and submit an office-hours question.',
    options: [{ name: 'question', description: 'Optional office-hours question', type: 3, required: false }],
  },
  {
    name: 'report',
    description: 'Privately route a moderation, spam, safety, or quality issue to Team Ops.',
    options: [{ name: 'issue', description: 'What should moderators review?', type: 3, required: true }],
  },
  {
    name: 'premium',
    description: 'Get the premium membership checkout link and unlock Premium Member access.',
  },
  {
    name: 'daily',
    description: 'Get today’s useful prompt, quiz, and build challenge.',
  },
  {
    name: 'checklist',
    description: 'Show your first-week onboarding checklist.',
  },
  {
    name: 'complete-step',
    description: 'Manually mark a first-week onboarding step complete.',
    options: [
      {
        name: 'step',
        description: 'Checklist step',
        type: 3,
        required: true,
        choices: [
          ['Intro posted', 'intro'],
          ['Path selected', 'path'],
          ['Daily signal completed', 'daily'],
          ['Challenge submitted', 'challenge'],
          ['Project submitted', 'project'],
          ['Review requested', 'review'],
          ['Content captured', 'capture'],
          ['Win posted', 'win'],
        ].map(([name, value]) => ({ name, value })),
      },
    ],
  },
  {
    name: 'quiz',
    description: 'Answer today’s quiz and earn points.',
    options: [{ name: 'answer', description: 'Your answer, copied from one of the quiz options', type: 3, required: false }],
  },
  {
    name: 'challenge',
    description: 'Get today’s build challenge and deliverable.',
  },
  {
    name: 'submit-challenge',
    description: 'Submit today’s challenge deliverable and earn points.',
    options: [
      { name: 'summary', description: 'What you shipped or produced', type: 3, required: true },
      { name: 'link', description: 'Optional link, screenshot, repo, or doc', type: 3, required: false },
    ],
  },
  {
    name: 'points',
    description: 'See your points, rank, and streak.',
  },
  {
    name: 'rank',
    description: 'See your current community rank.',
  },
  {
    name: 'leaderboard',
    description: 'Show the top Sage Ideas builders by points.',
  },
  {
    name: 'streak',
    description: 'See your current and longest activity streak.',
  },
  {
    name: 'weekly',
    description: 'Preview the weekly recap, leaderboard, and content queue.',
  },
  {
    name: 'content-queue',
    description: 'Preview the captured ideas that should become posts, resources, or lessons.',
  },
];

function onboardingComponents() {
  return [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'sage_onboard_path',
          placeholder: 'Choose your primary path',
          min_values: 1,
          max_values: 1,
          options: sagePathOptions.map((option) => ({
            label: option.label,
            value: option.key,
            description: option.description.slice(0, 100),
          })),
        },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'sage_onboard_level',
          placeholder: 'Choose your current level',
          min_values: 1,
          max_values: 1,
          options: sageLevelOptions.map((option) => ({
            label: option.label,
            value: option.key,
            description: option.description.slice(0, 100),
          })),
        },
      ],
    },
  ];
}

async function handleOnboard(): Promise<InteractionResponse> {
  return ephemeral(
    [
	      '**Sage Ideas Academy Onboarding**',
	      'Choose your primary path and current level below. SageBot will assign your role and point you to the right starting lane.',
	      '',
	      '**Server map**',
	      '`daily-signal` is the daily prompt, quiz, and challenge. `questions` is the main human help room. `ask-sage` is bot/RAG help. `build-lab` is for specs and shipping updates. `review-queue` is for critique. `content-queue` captures reusable ideas. `live-room` is office hours. `resources` is the library. `wins-showcase` is proof and progress. `premium` is deeper review.',
	      '',
	      'After that, ask your first useful question with `/ask` or post your first build context in `questions`.',
	    ].join('\n'),
	    { components: onboardingComponents() },
	  );
}

async function handleApply(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const rulesAccepted = optionBool(payload, 'rules');
	  const goal = optionValue(payload, 'goal');
	  const experience = optionValue(payload, 'experience');
	  const intendedBuild = optionValue(payload, 'build');
	  const pathKey = optionValue(payload, 'path');
	  const levelKey = optionValue(payload, 'level');
	  const timezone = optionValue(payload, 'timezone');
	  const weeklyTimeBudget = optionValue(payload, 'time_budget');
	  const preferredSupport = optionValue(payload, 'support');
	  const portfolioUrl = optionValue(payload, 'portfolio');
	  const referralSource = optionValue(payload, 'source');

	  const result = await submitMemberApplication({
	    discordUserId: id,
	    username: username(payload),
	    goal,
	    experience,
	    intendedBuild,
	    pathKey: pathKey || null,
	    levelKey: levelKey || null,
	    timezone: timezone || null,
	    weeklyTimeBudget: weeklyTimeBudget || null,
	    primaryGoal: goal,
	    preferredSupport: preferredSupport || null,
	    portfolioUrl: portfolioUrl || null,
	    referralSource: referralSource || null,
	    rulesAccepted,
	  });

  if (!result.ok) {
    if (result.reason === 'rules_not_accepted') return ephemeral('You must accept the rules to apply. Read `start-here`, then confirm rules acceptance in the Discord application or `/apply` fallback.');
    if (result.reason === 'already_pending') return ephemeral('You already have a pending application. A moderator will review it.');
    return ephemeral(`Application could not be submitted: ${result.reason ?? 'unknown error'}`);
  }

  await postToChannelByBaseName('team-ops', [
    '# New member application',
    `**Applicant:** ${sanitizeDiscordOutboundText(username(payload), 120)} (${id})`,
	    `**Goal:** ${sanitizeDiscordOutboundText(goal)}`,
	    `**Experience:** ${sanitizeDiscordOutboundText(experience)}`,
	    `**First build:** ${sanitizeDiscordOutboundText(intendedBuild)}`,
	    pathKey ? `**Path:** ${pathKey}` : null,
	    levelKey ? `**Level:** ${levelKey}` : null,
	    timezone ? `**Timezone:** ${sanitizeDiscordOutboundText(timezone, 120)}` : null,
	    weeklyTimeBudget ? `**Time budget:** ${sanitizeDiscordOutboundText(weeklyTimeBudget, 120)}` : null,
	    preferredSupport ? `**Support:** ${preferredSupport}` : null,
	    portfolioUrl ? `**Portfolio/current project:** ${sanitizeDiscordOutboundText(portfolioUrl, 300)}` : null,
	    referralSource ? `**Source:** ${sanitizeDiscordOutboundText(referralSource, 300)}` : null,
	    '',
	    `Approve with \`/approve user:${id}\` or reject with \`/reject user:${id}\`.`,
	  ].filter(Boolean).join('\n'));

  await recordDiscordEvent({
    eventType: 'member_application_submitted',
    commandName: 'apply',
    discordUserId: id,
    discordUsername: username(payload),
    channelBaseName: 'start-here',
	    metadata: {
	      rules_accepted: rulesAccepted,
	      path: pathKey || null,
	      level: levelKey || null,
	      support: preferredSupport || null,
	    },
	  });

  return ephemeral('Application submitted. A moderator will review it before you get full member access.');
}

async function handleApprove(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  if (!(await isReviewer(payload))) return ephemeral('Only Founder, Admin, or Moderator can approve applications.');
  const reviewerId = userId(payload);
  const targetId = optionValue(payload, 'user');
  const note = optionValue(payload, 'note');
  if (!reviewerId || !targetId) return ephemeral('I could not resolve the reviewer or target user.');

  const result = await reviewMemberApplication({
    discordUserId: targetId,
    status: 'approved',
    reviewerDiscordUserId: reviewerId,
    reviewerUsername: username(payload),
    note: note || null,
  });
  if (!result.ok) return ephemeral(`Could not approve: ${result.reason ?? 'unknown error'}`);

	  await approveDiscordMember({
	    discordUserId: targetId,
	    username: result.application?.username ?? targetId,
	    reviewer: username(payload),
	    commandName: 'approve',
	    application: result.application ?? null,
	  });
  return ephemeral(`Approved <@${targetId}> and granted Academy Member access.`);
}

async function handleReject(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  if (!(await isReviewer(payload))) return ephemeral('Only Founder, Admin, or Moderator can reject applications.');
  const reviewerId = userId(payload);
  const targetId = optionValue(payload, 'user');
  const note = optionValue(payload, 'note');
  if (!reviewerId || !targetId) return ephemeral('I could not resolve the reviewer or target user.');

  const result = await reviewMemberApplication({
    discordUserId: targetId,
    status: 'rejected',
    reviewerDiscordUserId: reviewerId,
    reviewerUsername: username(payload),
    note: note || null,
  });
  if (!result.ok) return ephemeral(`Could not reject: ${result.reason ?? 'unknown error'}`);

  await postToChannelByBaseName('team-ops', `Rejected <@\u200b${targetId}> application. Reviewer: ${sanitizeDiscordOutboundText(username(payload), 120)}. ${note ? `Note: ${sanitizeDiscordOutboundText(note)}` : ''}`);
  await recordDiscordEvent({
    eventType: 'member_application_rejected',
    commandName: 'reject',
    discordUserId: targetId,
    discordUsername: targetId,
    channelBaseName: 'team-ops',
    metadata: { reviewer: username(payload), note: note || null },
  });
  return ephemeral(`Rejected <@${targetId}>.`);
}

async function handlePending(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  if (!(await isReviewer(payload))) return ephemeral('Only Founder, Admin, or Moderator can view pending applications.');
  const pending = await getPendingApplications(10);
  return ephemeral([
    '# Pending applications',
    ...(pending.length
      ? pending.map((item, index) => [
        `${index + 1}. **${item.username ?? item.discordUserId}** (${item.discordUserId})`,
	        `Goal: ${item.goal}`,
	        `Experience: ${item.experience}`,
	        `Build: ${item.intendedBuild}`,
	        `Path/level: ${item.pathKey ?? '-'} / ${item.levelKey ?? '-'}`,
	        `Support/time: ${item.preferredSupport ?? '-'} / ${item.weeklyTimeBudget ?? '-'}`,
	      ].join('\n'))
      : ['No pending applications.']),
  ].join('\n\n'));
}

async function handleChoosePath(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  const pathKey = optionValue(payload, 'path') as SagePathKey;
  const path = sagePathOptions.find((option) => option.key === pathKey);
  if (!id || !path) return ephemeral('I could not resolve that path. Try `/onboard`.');
  const current = await getDiscordMemberRouting(id);
  const plan = await applyDiscordRoleRouting(id, {
    currentPathKey: current.pathKey,
    currentLevelKey: current.levelKey,
    nextPathKey: path.key,
  });
  await upsertDiscordMember({ discordUserId: id, username: username(payload), pathKey: path.key });
  await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'path', metadata: { path: path.key, removed_roles: plan.rolesToRemove, added_roles: plan.rolesToAdd } });
  return ephemeral(`Path set to **${path.label}**. Start in \`${plan.channel ?? path.channel}\`, then post your first project spec there.`);
}

async function handleSubmitProject(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const title = optionValue(payload, 'title');
  const path = optionValue(payload, 'path');
  const goal = optionValue(payload, 'goal');
  const link = optionValue(payload, 'link');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  const result = await submitProjectToBuildLab({
    discordUserId: id,
    username: username(payload),
    title,
    pathKey: path || null,
    goal,
    link: link || null,
    tags,
  });
  const content = [
    `# New project submission: ${sanitizeDiscordOutboundText(title)}`,
    `**Builder:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
    `**Project ID:** \`${result.id}\``,
    result.contentQueueId ? `**Content queue ID:** \`${result.contentQueueId}\`` : null,
    `**Path:** ${sanitizeDiscordOutboundText(path, 120)}`,
    formatTagLine(tags),
    `**Goal:** ${sanitizeDiscordOutboundText(goal)}`,
    link ? `**Link:** ${sanitizeDiscordOutboundText(link, 300)}` : null,
    '',
    '**Next step:** turn this into acceptance criteria, then route review requests to design/code/AI/architecture as needed.',
  ]
    .filter(Boolean)
    .join('\n');
  await postToChannelByBaseName('build-lab', content, {
    embed: true,
    title: `Project Submission: ${sanitizeDiscordOutboundText(title, 120)}`,
    variant: 'sage',
    footer: 'Sage Ideas build lab',
  });
  return ephemeral(`Project submitted to \`build-lab\` and queued for the content engine. Project ID: \`${result.id}\`.`);
}

async function handleRequestReview(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const type = optionValue(payload, 'type');
  const summary = optionValue(payload, 'summary');
  const link = optionValue(payload, 'link');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  const target = 'review-queue';
  await postToChannelByBaseName(
    target,
    [`# Review request: ${type}`, `**Member:** ${sanitizeDiscordOutboundText(username(payload), 120)}`, formatTagLine(tags), `**Summary:** ${sanitizeDiscordOutboundText(summary)}`, link ? `**Link:** ${sanitizeDiscordOutboundText(link, 300)}` : null]
      .filter(Boolean)
      .join('\n'),
    {
      embed: true,
      title: `Review Request: ${sanitizeDiscordOutboundText(type, 120)}`,
      variant: 'warning',
      footer: 'Sage Ideas review queue',
    },
  );
  const id = userId(payload);
  if (id) await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'review', metadata: { type, tags } });
  return ephemeral(`Review request routed to \`${target}\`.`);
}

async function handlePremiumReview(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const type = optionValue(payload, 'type') || 'general';
  const summary = optionValue(payload, 'summary');
  const link = optionValue(payload, 'link');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  const result = await createPremiumReviewRequest({
    discordUserId: id,
    username: username(payload),
    reviewType: type,
    summary,
    link: link || null,
  });
  await postToChannelByBaseName(
    'premium',
    [
      '# Premium review request',
      `**Member:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
      `**Type:** ${type}`,
      `**Priority:** ${result.priority}`,
      `**Request ID:** \`${result.id}\``,
      formatTagLine(tags),
      `**Summary:** ${sanitizeDiscordOutboundText(summary)}`,
      link ? `**Link:** ${sanitizeDiscordOutboundText(link, 300)}` : null,
    ].filter(Boolean).join('\n'),
    {
      embed: true,
      title: 'Premium Review Request',
      variant: 'win',
      footer: 'Sage Ideas premium',
    },
  );
  await recordDiscordEvent({
    eventType: 'premium_review_requested',
    commandName: 'premium-review',
    discordUserId: id,
    discordUsername: username(payload),
    channelBaseName: 'premium',
    metadata: { request_id: result.id, type, priority: result.priority, tags },
  });
  return ephemeral(`Premium review queued. Request ID: \`${result.id}\`. Priority: **${result.priority}**.`);
}

async function handleCaptureContent(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const idea = optionValue(payload, 'idea');
  const source = optionValue(payload, 'source');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  await captureContentQueueItem({
    source: 'slash_command',
    idea,
    discordUserId: userId(payload),
    username: username(payload),
    channelBaseName: 'content-queue',
    angle: source || null,
    priority: 60,
    metadata: { tags },
  });
  await postToChannelByBaseName(
    'content-queue',
    [`# Captured content idea`, `**Captured by:** ${sanitizeDiscordOutboundText(username(payload), 120)}`, formatTagLine(tags), `**Idea:** ${sanitizeDiscordOutboundText(idea)}`, source ? `**Source:** ${sanitizeDiscordOutboundText(source)}` : null]
      .filter(Boolean)
      .join('\n'),
    {
      embed: true,
      title: 'Captured Content Idea',
      variant: 'signal',
      footer: 'Sage Ideas content queue',
    },
  );
  const id = userId(payload);
  if (id) await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'capture' });
  return ephemeral('Captured in `content-queue` for the content engine.');
}

async function handleAsk(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const question = optionValue(payload, 'question');
  const context = optionValue(payload, 'context');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  let result: { id: string };
  let persistent = true;
  try {
    result = await askDiscordQuestion({
      discordUserId: id,
      username: username(payload),
      question,
      context: context || null,
    });
  } catch (err) {
    persistent = false;
    result = { id: `q-${Date.now()}` };
    await awardDiscordPointsFallback(id, username(payload), 5, 'question_asked_fallback', { error: err instanceof Error ? err.message : String(err) });
  }
  await postToChannelByBaseName('questions', [
    `# Question: ${sanitizeDiscordOutboundText(question)}`,
    `**Asked by:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
    `**Question ID:** \`${result.id}\``,
    formatTagLine(tags),
    context ? `**Context:** ${sanitizeDiscordOutboundText(context)}` : null,
    '',
    `Answer with \`/answer question_id:${result.id} answer:<your answer>\`. Helpful answers can be marked with \`/mark-helpful\`.`,
  ].filter(Boolean).join('\n'), {
    embed: true,
    title: `Question: ${sanitizeDiscordOutboundText(question, 120)}`,
    variant: 'answer',
    footer: 'Sage Ideas questions',
  });
  await captureContentQueueItem({
    source: 'question',
    idea: question,
    discordUserId: id,
    username: username(payload),
    channelBaseName: 'questions',
    angle: context || null,
    priority: 65,
    metadata: { question_id: result.id, tags },
  });
  return ephemeral(`Question posted to \`questions\`. Awarded **5** points. Question ID: \`${result.id}\`${persistent ? '.' : '. Persistent question tables are not migrated yet, so this is temporarily tracked through Discord/content queue only.'}`);
}

async function handleAskSage(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const question = optionValue(payload, 'question');
  const context = optionValue(payload, 'context');
  const result = await askSageFromDiscord({
    question,
    context: context || null,
    discordUserId: id,
    username: username(payload),
  });
  await captureContentQueueItem({
    source: 'ask_sage',
    idea: question,
    discordUserId: id,
    username: username(payload),
    channelBaseName: 'questions',
    angle: context || 'RAG-backed member question',
    priority: 72,
    metadata: {
      rag_answer_id: result.answerId,
      rag_retrieval_log_id: result.retrievalLogId,
      citation_count: result.citations.length,
      model: result.model,
    },
  });
  await awardDiscordPoints({
    discordUserId: id,
    username: username(payload),
    points: 3,
    reason: 'ask_sage_question',
    source: 'ask_sage',
    metadata: { rag_answer_id: result.answerId, citation_count: result.citations.length },
  });
  await recordDiscordEvent({
    eventType: 'ask_sage_answered',
    commandName: 'ask-sage',
    discordUserId: id,
    discordUsername: username(payload),
    channelBaseName: 'questions',
    metadata: {
      rag_answer_id: result.answerId,
      rag_retrieval_log_id: result.retrievalLogId,
      citation_count: result.citations.length,
      model: result.model,
    },
  });
  return ephemeral('SageBot answered your question. Awarded **3** points for asking something useful.', {
    embeds: result.messagePayload.embeds,
  });
}

async function handlePremiumAsk(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const question = optionValue(payload, 'question');
  const context = optionValue(payload, 'context');
  const result = await answerPremiumQuestion({
    discordUserId: id,
    username: username(payload),
    question,
    context: context || null,
  });
  await recordDiscordEvent({
    eventType: 'premium_answer_created',
    commandName: 'premium-ask',
    discordUserId: id,
    discordUsername: username(payload),
    channelBaseName: 'premium',
    metadata: {
      request_id: result.id,
      rag_answer_id: result.answerId,
      retrieval_log_id: result.retrievalLogId,
      model: result.model,
    },
  });
  return ephemeral([
    '# Premium SageBot answer',
    `**Question:** ${sanitizeDiscordOutboundText(question)}`,
    '',
    result.answer,
    '',
    `Premium answer ID: \`${result.id}\``,
  ].join('\n').slice(0, 1900));
}

async function handleAnswer(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const questionId = optionValue(payload, 'question_id');
  const answer = optionValue(payload, 'answer');
  let result: { id: string };
  let persistent = true;
  try {
    result = await answerDiscordQuestion({
      questionId,
      discordUserId: id,
      username: username(payload),
      answer,
    });
  } catch (err) {
    persistent = false;
    result = { id: `a-${Date.now()}` };
    await awardDiscordPointsFallback(id, username(payload), 10, 'question_answered_fallback', { question_id: questionId, error: err instanceof Error ? err.message : String(err) });
  }
  await postToChannelByBaseName('questions', [
    `# Answer submitted`,
    `**Question ID:** \`${questionId}\``,
    `**Answer ID:** \`${result.id}\``,
    `**Answered by:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
    `**Answer:** ${sanitizeDiscordOutboundText(answer)}`,
    '',
    `If this helped, a moderator or question owner can mark it with \`/mark-helpful answer_id:${result.id}\`.`,
  ].join('\n'), {
    embed: true,
    title: 'Answer Submitted',
    variant: 'sage',
    footer: 'Sage Ideas questions',
  });
  return ephemeral(`Answer recorded. Awarded **10** points. Answer ID: \`${result.id}\`${persistent ? '.' : '. Persistent answer tables are not migrated yet, so this is temporarily tracked through Discord only.'}`);
}

async function handleMarkHelpful(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  if (!(await isReviewer(payload))) return ephemeral('Only Founder, Admin, or Moderator can mark answers helpful in this MVP.');
  const reviewerId = userId(payload);
  const answerId = optionValue(payload, 'answer_id');
  if (!reviewerId || !answerId) return ephemeral('I could not resolve the reviewer or answer.');
  const result = await markDiscordAnswerHelpful({
    answerId,
    reviewerDiscordUserId: reviewerId,
    reviewerUsername: username(payload),
  });
  if (!result.ok) return ephemeral(`Could not mark helpful: ${result.reason ?? 'unknown error'}`);
  await postToChannelByBaseName('questions', `Marked answer \`${answerId}\` helpful. <@\u200b${result.answererDiscordUserId}> earned a **15 point** quality bonus.`);
  return ephemeral(`Marked answer \`${answerId}\` helpful and awarded the quality bonus.`);
}

async function handleAward(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  if (!(await isReviewer(payload))) return ephemeral('Only Founder, Admin, or Moderator can award manual points.');
  const reviewerId = userId(payload);
  const targetId = optionValue(payload, 'user');
  const points = Number(optionValue(payload, 'points'));
  const reason = optionValue(payload, 'reason');
  if (!reviewerId || !targetId || !Number.isFinite(points) || !reason) return ephemeral('Missing user, points, or reason.');
  await manuallyAwardDiscordPoints({
    discordUserId: targetId,
    username: targetId,
    points,
    reason,
    awardedByDiscordUserId: reviewerId,
    awardedByUsername: username(payload),
  });
  await postToChannelByBaseName('team-ops', `Manual point adjustment: <@\u200b${targetId}> ${points > 0 ? '+' : ''}${points} pts. Reason: ${sanitizeDiscordOutboundText(reason)}. Reviewer: ${sanitizeDiscordOutboundText(username(payload), 120)}.`);
  return ephemeral(`Awarded ${points > 0 ? '+' : ''}${points} points to <@${targetId}>.`);
}

async function handleDailyPrompt(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const mode = optionValue(payload, 'mode') || 'preview';
  const content = await buildDailySignalContent(new Date());
  if (mode === 'post') {
    await postDailySignal('slash-command');
    return ephemeral('Posted today’s Daily Signal to `daily-signal`.');
  }
  return ephemeral(content);
}

async function handleWeeklyRecap(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const mode = optionValue(payload, 'mode') || 'preview';
  const content = await buildWeeklyRecapContent();
  if (mode === 'post') {
    await postWeeklyRecap('slash-command');
    return ephemeral('Posted the weekly recap to `wins-showcase`.');
  }
  return ephemeral(content);
}

export async function buildDailySignalContent(now = new Date()): Promise<string> {
  const [quiz, challenge, plan] = await Promise.all([
    getDailyQuizFromStore(now),
    getDailyChallengeFromStore(now),
    getDailyContentPlan(now),
  ]);
  const buildPrompt = plan?.prompt ?? pickDaily(dailyBuildPrompts, now);
  return [
    '# Daily Signal',
    plan?.theme ? `**Theme:** ${plan.theme}` : null,
    `**Build prompt:** ${buildPrompt}`,
    `**AI tool/pattern:** ${pickDaily(dailyAiTools, now)}`,
    `**Question:** ${pickDaily(dailyQuestions, now)}`,
    '',
    `**Quiz:** ${quiz.prompt}`,
    `Options: ${quiz.options.join(' / ')}`,
    '',
    `**Challenge:** ${challenge.title}`,
    `${challenge.prompt}`,
    `Deliverable: ${challenge.deliverable}`,
  ].filter(Boolean).join('\n');
}

export async function buildWeeklyRecapContent(): Promise<string> {
  const [ships, wins, contentIdeas, leaderboard, queue, challengeRecap, openQuestions] = await Promise.all([
    getRecentChannelMessages('wins-showcase', 20),
    getRecentChannelMessages('build-lab', 20),
    getRecentChannelMessages('questions', 20),
    getLeaderboard(5),
    getContentQueue(5),
    getWeeklyChallengeRecap(5),
    getOpenQuestions(5),
  ]);
  return [
    '# Weekly Recap',
    '**Cadence**',
    ...weeklyCadence.map((item) => `- ${item}`),
    '',
    `**Signals captured:** ${contentIdeas.filter((message) => !message.author?.bot).length}`,
    `**Ships posted:** ${ships.filter((message) => !message.author?.bot).length}`,
    `**Wins posted:** ${wins.filter((message) => !message.author?.bot).length}`,
    '',
    '**Leaderboard**',
    ...(leaderboard.length ? leaderboard.map((row, index) => `${index + 1}. ${row.username} — ${row.points} pts`) : ['No points recorded yet.']),
    '',
    '**Challenge recap**',
    `Submissions this week: ${challengeRecap.count}`,
    ...(challengeRecap.submissions.length
      ? challengeRecap.submissions.map((item) => `- ${item.username}: ${item.summary}${item.link ? ` (${item.link})` : ''}`)
      : ['No challenge submissions captured yet.']),
    '',
    '**Content queue**',
    ...(queue.length ? queue.map((item) => `- ${item.idea} (${item.source})`) : ['No captured ideas waiting.']),
    '',
    '**Open questions**',
    ...(openQuestions.length ? openQuestions.map((item) => `- ${item.question} (${item.id})`) : ['No open tracked questions.']),
    '',
    '**Next action:** pick one project to spec, one artifact to ship, and one lesson to capture into content.',
  ].join('\n');
}

export async function postDailySignal(source: string): Promise<string | null> {
  const content = await buildDailySignalContent(new Date());
  const messageId = await postToChannelByBaseName('daily-signal', content, {
    embed: true,
    title: 'Daily Signal',
    variant: 'signal',
    footer: 'Sage Ideas daily build rhythm',
  });
  await recordDiscordScheduledRun({
    runKey: `daily-signal-${new Date().toISOString().slice(0, 10)}`,
    kind: 'daily_signal',
    status: messageId ? 'posted' : 'failed',
    messageId,
    metadata: { source },
  });
  await recordDiscordEvent({
    eventType: 'daily_signal_posted',
    commandName: source,
    channelBaseName: 'daily-signal',
    metadata: { message_id: messageId },
  });
  return messageId;
}

export async function postWeeklyRecap(source: string): Promise<string | null> {
  const content = await buildWeeklyRecapContent();
  const messageId = await postToChannelByBaseName('wins-showcase', content, {
    embed: true,
    title: 'Weekly Recap',
    variant: 'win',
    footer: 'Sage Ideas weekly proof loop',
  });
  await recordDiscordScheduledRun({
    runKey: `weekly-recap-${weekKey(new Date())}`,
    kind: 'weekly_recap',
    status: messageId ? 'posted' : 'failed',
    messageId,
    metadata: { source },
  });
  await recordDiscordEvent({
    eventType: 'weekly_recap_posted',
    commandName: source,
    channelBaseName: 'wins-showcase',
    metadata: { message_id: messageId },
  });
  return messageId;
}

function weekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function handleResource(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const need = optionValue(payload, 'need').toLowerCase();
  const target = need.includes('question') || need.includes('help') || need.includes('stuck') ? 'questions' : 'resources';
  return ephemeral(`Start in \`${target}\`. If you do not find it, capture the gap with \`/capture-content\` so it becomes a resource drop.`);
}

async function handleOfficeHours(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const question = optionValue(payload, 'question');
  if (question) {
    const id = userId(payload);
    if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
    const queued = await createOfficeHoursQueueItem({
      discordUserId: id,
      username: username(payload),
      question,
    });
    await postToChannelByBaseName(
      queued.premiumMember ? 'premium' : 'live-room',
      [
        '# Office-hours queue',
        `**Member:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
        `**Queue ID:** \`${queued.id}\``,
        `**Priority:** ${queued.priority}`,
        `**Question:** ${sanitizeDiscordOutboundText(question)}`,
      ].join('\n'),
    );
    await recordDiscordEvent({
      eventType: 'office_hours_question_queued',
      commandName: 'office-hours',
      discordUserId: id,
      discordUsername: username(payload),
      channelBaseName: queued.premiumMember ? 'premium' : 'live-room',
      metadata: { queue_id: queued.id, priority: queued.priority, premium: queued.premiumMember },
    });
    return ephemeral(`Office-hours question queued. Queue ID: \`${queued.id}\`. Priority: **${queued.priority}**.`);
  }
  return ephemeral('Use `live-room` for the office-hours queue. Strong questions include context, project, blocker, link/screenshot, and desired feedback.');
}

async function handleReport(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const issue = optionValue(payload, 'issue');
  const abuse = classifyDiscordAbuse(issue);
  await postToChannelByBaseName(
    'team-ops',
    [
      '# Member report',
      `**Reporter:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
      `**Category:** ${abuse.category}`,
      `**Abuse score:** ${abuse.abuseScore}`,
      abuse.reasons.length ? `**Signals:** ${abuse.reasons.join(', ')}` : null,
      `**Issue:** ${sanitizeDiscordOutboundText(issue)}`,
    ].filter(Boolean).join('\n'),
  );
  await recordDiscordEvent({
    eventType: 'member_report_submitted',
    commandName: 'report',
    discordUserId: userId(payload),
    discordUsername: username(payload),
    channelBaseName: 'team-ops',
    metadata: { abuse_category: abuse.category, abuse_score: abuse.abuseScore, abuse_reasons: abuse.reasons },
  });
  return ephemeral('Report sent to the moderation queue. Thank you for keeping the room useful.');
}

async function handlePremium(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const checkout = await createDiscordPremiumCheckout({ discordUserId: id, username: username(payload) });
  if (!checkout.ok) {
    return ephemeral('Premium checkout is not configured yet. Missing Stripe secret or premium price id.');
  }
  return ephemeral('Premium membership checkout is ready.', {
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: 'Open checkout',
            url: checkout.url,
          },
        ],
      },
    ],
  });
}

async function handleDaily(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (id) await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'daily' });
  return ephemeral(await buildDailySignalContent(new Date()));
}

async function handleChecklist(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const checklist = await getOnboardingChecklist(id);
  const complete = checklist.filter((step) => step.completed).length;
  return ephemeral([
    '# First-week checklist',
    `${complete}/${checklist.length} complete`,
    '',
    ...checklist.map((step) => `${step.completed ? '[x]' : '[ ]'} **${step.label}** - ${step.command}`),
  ].join('\n'));
}

async function handleCompleteStep(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  const step = optionValue(payload, 'step') as OnboardingStepKey;
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  if (!onboardingSteps.some((item) => item.key === step)) return ephemeral('I could not resolve that checklist step.');
  await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: step, metadata: { source: 'manual_command' } });
  return handleChecklist(payload);
}

async function handleQuiz(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  const quiz = await getDailyQuizFromStore();
  const answer = optionValue(payload, 'answer');
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  if (!answer) {
    return ephemeral([
      `**Today’s quiz:** ${quiz.prompt}`,
      '',
      ...quiz.options.map((option) => `- ${option}`),
      '',
      'Run `/quiz answer:<option>` to submit.',
    ].join('\n'));
  }
  const result = await answerDailyQuiz({ discordUserId: id, username: username(payload), answer });
  if (result.alreadyAttempted) {
    return ephemeral([
      'Quiz already completed.',
      `Answer: **${result.quiz.correctAnswer}**`,
      result.quiz.explanation,
      'Points awarded: **0**',
    ].join('\n'));
  }
  return ephemeral([
    result.correct ? 'Correct.' : 'Not quite.',
    `Answer: **${result.quiz.correctAnswer}**`,
    result.quiz.explanation,
    `Points awarded: **${result.points}**`,
  ].join('\n'));
}

async function handleChallenge(): Promise<InteractionResponse> {
  const challenge = await getDailyChallengeFromStore();
  return ephemeral([
    `**${challenge.title}**`,
    challenge.prompt,
    '',
    `Deliverable: ${challenge.deliverable}`,
    `Points: ${challenge.points}`,
    '',
    'Submit with `/submit-challenge` when you have the artifact.',
  ].join('\n'));
}

async function handleSubmitChallenge(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const summary = optionValue(payload, 'summary');
  const link = optionValue(payload, 'link');
  const tags = normalizedTagList(optionValue(payload, 'tags'));
  const result = await submitDailyChallenge({ discordUserId: id, username: username(payload), summary, link });
  if (result.alreadySubmitted) {
    return ephemeral(`You already submitted today’s challenge. Submission ID: \`${result.id ?? 'existing'}\`. No extra points awarded.`);
  }
  await captureContentQueueItem({
    source: 'challenge_submission',
    idea: `${result.challenge.title}: ${summary}`,
    discordUserId: id,
    username: username(payload),
    channelBaseName: 'build-lab',
    priority: 70,
    metadata: { challenge_key: result.challenge.key, submission_id: result.id, link: link || null, status: 'pending_review', tags },
  });
  await postToChannelByBaseName(
    'build-lab',
    [
      `# Challenge submission pending review: ${sanitizeDiscordOutboundText(result.challenge.title)}`,
      `**Member:** ${sanitizeDiscordOutboundText(username(payload), 120)}`,
      `**Submission ID:** \`${result.id}\``,
      formatTagLine(tags),
      `**Summary:** ${sanitizeDiscordOutboundText(summary)}`,
      link ? `**Link:** ${sanitizeDiscordOutboundText(link, 300)}` : null,
      '',
      'Points are awarded after admin approval. Featured submissions move to `wins-showcase`.',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return ephemeral(`Challenge submitted for review. Submission ID: \`${result.id}\`. Points award after approval.`);
}

async function handlePoints(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const points = await getMemberPoints(id);
  return ephemeral([
    `**Points:** ${points.total}`,
    `**Rank:** ${points.rank ? `#${points.rank}` : 'unranked'}`,
    `**Current streak:** ${points.streak} day(s)`,
    `**Longest streak:** ${points.longestStreak} day(s)`,
  ].join('\n'));
}

async function handleProfile(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  if (!id) return ephemeral('I could not resolve your Discord user. Try again inside the server.');
  const [points, checklist] = await Promise.all([getMemberPoints(id), getOnboardingChecklist(id)]);
  const complete = checklist.filter((step) => step.completed).length;
  return ephemeral([
    '# Builder profile',
    `**Member:** ${username(payload)}`,
    `**Points:** ${points.total}`,
    `**Rank:** ${points.rank ? `#${points.rank}` : 'unranked'}`,
    `**Current streak:** ${points.streak} day(s)`,
    `**First-week checklist:** ${complete}/${checklist.length}`,
  ].join('\n'));
}

async function handleRewards(): Promise<InteractionResponse> {
  return ephemeral([
    '# Rewards and reputation',
    '**What earns points**',
    '- Good structured question: 5 pts',
    '- Useful answer: 10 pts',
    '- Helpful answer bonus: 15 pts',
    '- Daily quiz: 2-10 pts',
    '- Daily challenge: 15-25 pts',
    '- Project/spec submission: tracked toward onboarding',
    '- Manual admin award: for top builds, reviews, resources, and wins',
    '',
    '**What points unlock**',
    '- Weekly leaderboard visibility',
    '- Contributor/Mentor consideration',
    '- Priority review opportunities',
    '- Member spotlights',
    '- Premium credits or deeper teardown rewards when available',
    '',
    'Noise does not count. Useful artifacts, helpful answers, and consistent shipping do.',
  ].join('\n'));
}

async function handleWeeklyWinners(): Promise<InteractionResponse> {
  const [leaders, openQuestions, answers] = await Promise.all([
    getLeaderboard(10),
    getOpenQuestions(5),
    getRecentAnswers(5),
  ]);
  return publicMessage([
    '# Weekly builders and helpers',
    '**Leaderboard**',
    ...(leaders.length ? leaders.map((row, index) => `${index + 1}. **${row.username}** - ${row.points} pts`) : ['No points recorded yet.']),
    '',
    '**Recent answers**',
    ...(answers.length ? answers.map((row) => `- ${row.username ?? 'member'}: ${row.helpful ? '[helpful] ' : ''}${row.answer.slice(0, 120)}`) : ['No answers recorded yet.']),
    '',
    '**Open questions to help with**',
    ...(openQuestions.length ? openQuestions.map((row) => `- ${row.question} (\`${row.id}\`)`) : ['No open tracked questions.']),
  ].join('\n'));
}

async function handleLeaderboard(): Promise<InteractionResponse> {
  const rows = await getLeaderboard(10);
  return publicMessage([
    '# Sage Ideas Leaderboard',
    ...(rows.length ? rows.map((row, index) => `${index + 1}. **${row.username}** — ${row.points} pts`) : ['No points recorded yet.']),
  ].join('\n'));
}

async function handleWeekly(): Promise<InteractionResponse> {
  const [recap, queue] = await Promise.all([buildWeeklyRecapContent(), getContentQueue(5)]);
  return ephemeral([
    recap,
    '',
    '**Content queue**',
    ...(queue.length ? queue.map((item, index) => `${index + 1}. ${item.idea} (${item.source})`) : ['No captured content ideas yet.']),
  ].join('\n'));
}

async function handleContentQueue(): Promise<InteractionResponse> {
  const queue = await getContentQueue(10);
  return ephemeral([
    '# Content Queue',
    ...(queue.length ? queue.map((item, index) => `${index + 1}. ${item.idea}${item.username ? ` — ${item.username}` : ''}`) : ['No captured content ideas yet.']),
  ].join('\n'));
}

export async function handleSageCommand(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const name = payload.data?.name;
  try {
    await recordDiscordEvent({
      eventType: 'command_invoked',
      commandName: name ?? null,
      discordUserId: userId(payload),
      discordUsername: username(payload),
      metadata: { channel_id: payload.channel_id ?? null },
    });
    switch (name) {
      case 'apply':
        return handleApply(payload);
      case 'approve':
        return handleApprove(payload);
      case 'reject':
        return handleReject(payload);
      case 'pending':
        return handlePending(payload);
      case 'onboard':
        return (await requireApproved(payload)) ?? handleOnboard();
      case 'choose-path':
        return (await requireApproved(payload)) ?? handleChoosePath(payload);
      case 'submit-project':
        return (await requireApproved(payload)) ?? handleSubmitProject(payload);
      case 'request-review':
        return (await requireApproved(payload)) ?? handleRequestReview(payload);
      case 'premium-review':
        return (await requireApproved(payload)) ?? handlePremiumReview(payload);
      case 'capture-content':
        return (await requireApproved(payload)) ?? handleCaptureContent(payload);
      case 'ask':
        return (await requireApproved(payload)) ?? handleAsk(payload);
      case 'ask-sage':
        return (await requireApproved(payload)) ?? handleAskSage(payload);
      case 'premium-ask':
        return (await requireApproved(payload)) ?? handlePremiumAsk(payload);
      case 'answer':
        return (await requireApproved(payload)) ?? handleAnswer(payload);
      case 'mark-helpful':
        return (await requireApproved(payload)) ?? handleMarkHelpful(payload);
      case 'award':
        return (await requireApproved(payload)) ?? handleAward(payload);
      case 'profile':
        return (await requireApproved(payload)) ?? handleProfile(payload);
      case 'rewards':
        return (await requireApproved(payload)) ?? handleRewards();
      case 'weekly-winners':
        return (await requireApproved(payload)) ?? handleWeeklyWinners();
      case 'daily-prompt':
        return (await requireApproved(payload)) ?? handleDailyPrompt(payload);
      case 'weekly-recap':
        return (await requireApproved(payload)) ?? handleWeeklyRecap(payload);
      case 'resource':
        return (await requireApproved(payload)) ?? handleResource(payload);
      case 'office-hours':
        return (await requireApproved(payload)) ?? handleOfficeHours(payload);
      case 'report':
        return handleReport(payload);
      case 'premium':
        return (await requireApproved(payload)) ?? handlePremium(payload);
      case 'daily':
        return (await requireApproved(payload)) ?? handleDaily(payload);
      case 'checklist':
        return (await requireApproved(payload)) ?? handleChecklist(payload);
      case 'complete-step':
        return (await requireApproved(payload)) ?? handleCompleteStep(payload);
      case 'quiz':
        return (await requireApproved(payload)) ?? handleQuiz(payload);
      case 'challenge':
        return (await requireApproved(payload)) ?? handleChallenge();
      case 'submit-challenge':
        return (await requireApproved(payload)) ?? handleSubmitChallenge(payload);
      case 'points':
      case 'rank':
      case 'streak':
        return (await requireApproved(payload)) ?? handlePoints(payload);
      case 'leaderboard':
        return (await requireApproved(payload)) ?? handleLeaderboard();
      case 'weekly':
        return (await requireApproved(payload)) ?? handleWeekly();
      case 'content-queue':
        return (await requireApproved(payload)) ?? handleContentQueue();
      default:
        return ephemeral('Unknown SageBot command.');
    }
  } catch (err) {
    await recordDiscordEvent({
      eventType: 'command_failed',
      commandName: name ?? null,
      discordUserId: userId(payload),
      discordUsername: username(payload),
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return ephemeral([
      'SageBot hit an internal error before it could finish that command.',
      'The failure was logged for admin review. Try again in a minute, or use `questions` if this is urgent.',
    ].join('\n'));
  }
}

export async function handleDeferredSageCommand(payload: DiscordInteractionPayload): Promise<void> {
  const applicationId = payload.application_id;
  const token = payload.token;
  if (!applicationId || !token) {
    await recordDiscordEvent({
      eventType: 'command_failed',
      commandName: payload.data?.name ?? null,
      discordUserId: userId(payload),
      discordUsername: username(payload),
      metadata: { error: 'missing_discord_interaction_followup_token' },
    });
    return;
  }

  try {
    if (payload.data?.name === 'speak' || payload.data?.name === 'voice-summary') {
      const approvedGate = await requireApproved(payload);
      if (approvedGate) {
        await postDiscordInteractionFollowup({
          applicationId,
          token,
          content: String(approvedGate.data?.content ?? 'Approval is required before using voice commands.'),
          ephemeral: true,
        });
        return;
      }
      const text = optionValue(payload, 'text');
      const voice = await synthesizeSproutVoice({
        text,
        filename: payload.data.name === 'voice-summary' ? 'sprout-summary.mp3' : 'sprout.mp3',
      });
      if (!voice.ok) {
        await postDiscordInteractionFollowup({
          applicationId,
          token,
          content: `Sprout voice is not ready on this runtime: ${voice.message}`,
          ephemeral: true,
        });
        return;
      }
      await postDiscordInteractionFollowup({
        applicationId,
        token,
        content: payload.data.name === 'voice-summary' ? 'Here’s the voice summary.' : 'Sprout, out loud.',
        ephemeral: true,
        attachment: { filename: voice.filename, bytes: voice.bytes, contentType: voice.mimeType },
      });
      return;
    }
    const response = await handleSageCommand(payload);
    await postDiscordInteractionFollowup({
      applicationId,
      token,
      content: String(response.data?.content ?? 'SageBot finished, but no answer content was returned.'),
      ephemeral: response.data?.flags === EPHEMERAL_FLAG,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordDiscordEvent({
      eventType: 'command_failed',
      commandName: payload.data?.name ?? null,
      discordUserId: userId(payload),
      discordUsername: username(payload),
      metadata: { error: message, deferred: true },
    });
    await postDiscordInteractionFollowup({
      applicationId,
      token,
      content: `SageBot could not answer that yet: ${message.slice(0, 1400)}`,
      ephemeral: true,
    });
  }
}

export async function handleSageComponent(payload: DiscordInteractionPayload): Promise<InteractionResponse> {
  const id = userId(payload);
  const customId = payload.data?.custom_id;
  const value = payload.data?.values?.[0];
  if (!id || !customId || !value) return ephemeral('I could not read that selection.');
  const approvedGate = await requireApproved(payload);
  if (approvedGate) return approvedGate;

  if (customId === 'sage_onboard_path') {
    const current = await getDiscordMemberRouting(id);
    const plan = await applyDiscordRoleRouting(id, {
      currentPathKey: current.pathKey,
      currentLevelKey: current.levelKey,
      nextPathKey: value,
    });
    const path = sagePathOptions.find((option) => option.key === value);
    await upsertDiscordMember({ discordUserId: id, username: username(payload), pathKey: value });
    await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'path', metadata: { path: value, removed_roles: plan.rolesToRemove, added_roles: plan.rolesToAdd } });
    await recordDiscordEvent({
      eventType: 'onboarding_path_selected',
      commandName: 'onboard',
      discordUserId: id,
      discordUsername: username(payload),
      metadata: { path_key: value },
    });
    return {
      type: RESPONSE_TYPE_UPDATE_MESSAGE,
      data: {
        content: `Path saved: **${path?.label ?? value}**. Start in \`${plan.channel ?? 'build-lab'}\` and post your first project.`,
        components: onboardingComponents(),
      },
    };
  }

  if (customId === 'sage_onboard_level') {
    const current = await getDiscordMemberRouting(id);
    const plan = await applyDiscordRoleRouting(id, {
      currentPathKey: current.pathKey,
      currentLevelKey: current.levelKey,
      nextLevelKey: value,
    });
    const level = sageLevelOptions.find((option) => option.key === value);
    await upsertDiscordMember({ discordUserId: id, username: username(payload), levelKey: value });
    await completeOnboardingStep({ discordUserId: id, username: username(payload), stepKey: 'path', metadata: { level: value, removed_roles: plan.rolesToRemove, added_roles: plan.rolesToAdd } });
    await recordDiscordEvent({
      eventType: 'onboarding_level_selected',
      commandName: 'onboard',
      discordUserId: id,
      discordUsername: username(payload),
      metadata: { level_key: value, role: plan.levelRole, removed_roles: plan.rolesToRemove, added_roles: plan.rolesToAdd },
    });
    return {
      type: RESPONSE_TYPE_UPDATE_MESSAGE,
      data: {
        content: `Level saved: **${level?.label ?? value}**. Role assigned: **${plan.levelRole ?? 'Academy Member'}**.`,
        components: onboardingComponents(),
      },
    };
  }

  return publicMessage('Selection received.');
}
