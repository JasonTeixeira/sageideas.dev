export type SagePathKey =
  | 'ai_apps'
  | 'full_stack'
  | 'web_design'
  | 'cloud_devops'
  | 'agents_automation'
  | 'seo_content'
  | 'ads_growth'
  | 'architecture';

export type SageLevelKey = 'starting' | 'learning' | 'shipping' | 'architecting' | 'mentoring';

export const sagePathOptions: Array<{
  key: SagePathKey;
  label: string;
  description: string;
  role: string;
  channel: string;
}> = [
  {
    key: 'ai_apps',
    label: 'AI Apps',
    description: 'Build AI-native apps and SaaS products.',
    role: 'AI Engineer',
    channel: 'build-lab',
  },
  {
    key: 'full_stack',
    label: 'Full-Stack Development',
    description: 'Ship real apps with auth, data, APIs, tests, and deployment.',
    role: 'Builder',
    channel: 'build-lab',
  },
  {
    key: 'web_design',
    label: 'Websites + Design',
    description: 'Build premium sites, UI systems, and conversion pages.',
    role: 'Web Builder',
    channel: 'build-lab',
  },
  {
    key: 'cloud_devops',
    label: 'Cloud + DevOps',
    description: 'Deploy, monitor, and operate reliable systems.',
    role: 'Cloud Builder',
    channel: 'build-lab',
  },
  {
    key: 'agents_automation',
    label: 'AI Agents + Automation',
    description: 'Build workflow automations, agents, and internal systems.',
    role: 'AI Engineer',
    channel: 'build-lab',
  },
  {
    key: 'seo_content',
    label: 'SEO + Content Engine',
    description: 'Build search, publishing, newsletter, and content systems.',
    role: 'Content Builder',
    channel: 'the-floor',
  },
  {
    key: 'ads_growth',
    label: 'Ads + Growth',
    description: 'Build offers, funnels, landing pages, and acquisition loops.',
    role: 'Growth Builder',
    channel: 'the-floor',
  },
  {
    key: 'architecture',
    label: 'Architecture + Systems',
    description: 'Design APIs, data models, auth, reliability, and tradeoffs.',
    role: 'Builder',
    channel: 'build-lab',
  },
];

export type SageChannelVisibility = 'pre_approval' | 'approved_members' | 'premium_members' | 'staff_private';
export type SageChannelPostingMode = 'read_only' | 'bot_led' | 'member_led' | 'structured_submissions' | 'staff_only';
export type SageChannelCadence = 'static' | 'daily' | 'weekly' | 'as_needed' | 'live';
export type SageChannelProofLane =
  | 'onboarding'
  | 'approved_discord_knowledge'
  | 'rag_discord_sources'
  | 'public_proof_assets'
  | 'premium_workflow_proof'
  | 'operating_admin';

export type SageDiscordChannel = {
  name: string;
  purpose: string;
  category: 'entry' | 'academy' | 'engagement' | 'learning' | 'proof' | 'premium' | 'ops';
  visibility: SageChannelVisibility;
  postingMode: SageChannelPostingMode;
  cadence: SageChannelCadence;
  owner: 'admin' | 'sagebot' | 'members' | 'premium' | 'staff';
  primaryMemberAction: string;
  botJobs: string[];
  proofLanes: SageChannelProofLane[];
  pinnedAssets: string[];
  antiSprawlRule: string;
};

const channelTemplates: SageDiscordChannel[] = [
  {
    name: 'start-here',
    purpose: 'Read-only welcome, rules, onboarding instructions, and first action.',
    category: 'entry',
    visibility: 'pre_approval',
    postingMode: 'read_only',
    cadence: 'static',
    owner: 'admin',
    primaryMemberAction: 'Read rules, apply through Discord native application, then run onboarding after approval.',
    botJobs: ['approval_reset_notice', 'onboarding_status_hint'],
    proofLanes: ['onboarding'],
    pinnedAssets: ['rules', 'quality bar', 'how to get access', 'first-week checklist'],
    antiSprawlRule: 'Keep all pre-approval instructions here; do not create extra welcome, rules, or FAQ channels.',
  },
  {
    name: 'academy-roadmap',
    purpose: 'Read-only Academy map explaining paths, levels, projects, points, premium, and weekly operating rhythm.',
    category: 'academy',
    visibility: 'approved_members',
    postingMode: 'read_only',
    cadence: 'static',
    owner: 'admin',
    primaryMemberAction: 'Pick a path, understand the weekly rhythm, and move into questions or build-lab.',
    botJobs: ['roadmap_refresh', 'weekly_rhythm_sync'],
    proofLanes: ['onboarding'],
    pinnedAssets: ['path map', 'level map', 'points model', 'weekly rhythm'],
    antiSprawlRule: 'Use this as the single map instead of path-specific channel sprawl.',
  },
  {
    name: 'introductions',
    purpose: 'Member introductions after approval: goal, skill level, current build, and what help they want first.',
    category: 'entry',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'as_needed',
    owner: 'members',
    primaryMemberAction: 'Post path, level, current build, blocker, and what feedback would help first.',
    botJobs: ['intro_prompt', 'member_profile_seed', 'onboarding_completion_check'],
    proofLanes: ['onboarding', 'approved_discord_knowledge'],
    pinnedAssets: ['intro template', 'good intro example', 'next actions after intro'],
    antiSprawlRule: 'Do not split intros by path; route path context through roles and profile metadata.',
  },
  {
    name: 'announcements',
    purpose: 'Read-only Academy updates, challenge launches, live sessions, releases, and important operating notices.',
    category: 'engagement',
    visibility: 'approved_members',
    postingMode: 'read_only',
    cadence: 'weekly',
    owner: 'admin',
    primaryMemberAction: 'Read the weekly launch and follow the linked channel action.',
    botJobs: ['weekly_launch_draft', 'challenge_launch_draft', 'live_session_notice'],
    proofLanes: ['public_proof_assets'],
    pinnedAssets: ['current week', 'challenge rules', 'live schedule'],
    antiSprawlRule: 'Only announcements with a clear action go here; discussion moves to the linked channel.',
  },
  {
    name: 'daily-signal',
    purpose: 'Bot-posted daily build prompt, AI pattern, and discussion question.',
    category: 'engagement',
    visibility: 'approved_members',
    postingMode: 'bot_led',
    cadence: 'daily',
    owner: 'sagebot',
    primaryMemberAction: 'Take one specific daily build action and reply with a concrete artifact or blocker.',
    botJobs: ['daily_signal_draft', 'daily_signal_publish_after_approval', 'content_factory_daily_signal'],
    proofLanes: ['approved_discord_knowledge', 'public_proof_assets'],
    pinnedAssets: ['daily signal format', 'what counts as a useful reply'],
    antiSprawlRule: 'Keep daily prompts consolidated here; do not create separate daily question/resource/tool channels.',
  },
  {
    name: 'questions',
    purpose: 'Main member questions, answers, accepted/helpful replies, and unanswered-question tracking.',
    category: 'learning',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'daily',
    owner: 'members',
    primaryMemberAction: 'Ask with goal, attempt, blocker, artifact link, and what answer would unblock you.',
    botJobs: ['message_classifier', 'question_answer_linking', 'helpful_answer_candidate', 'content_queue_candidate'],
    proofLanes: ['approved_discord_knowledge', 'rag_discord_sources'],
    pinnedAssets: ['question template', 'answer quality bar', 'accepted-answer policy'],
    antiSprawlRule: 'All general questions start here; create threads for depth instead of new question channels.',
  },
  {
    name: 'ask-sage',
    purpose: 'Dedicated SageBot and RAG question lane for bot-assisted help.',
    category: 'learning',
    visibility: 'approved_members',
    postingMode: 'bot_led',
    cadence: 'as_needed',
    owner: 'sagebot',
    primaryMemberAction: 'Ask SageBot for sourced help, then move unresolved or personal review needs to questions or review-queue.',
    botJobs: ['ask_sage', 'rag_retrieval_trace', 'answer_quality_logging'],
    proofLanes: ['rag_discord_sources'],
    pinnedAssets: ['how to ask SageBot', 'citation policy', 'unsupported answer policy'],
    antiSprawlRule: 'Keep bot Q&A here so normal human discussion remains readable.',
  },
  {
    name: 'lesson-discussion',
    purpose: 'Lesson/module discussion so curriculum questions do not get buried in general Q&A.',
    category: 'academy',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'as_needed',
    owner: 'members',
    primaryMemberAction: 'Ask lesson-specific questions with course, lesson, attempt, and unclear step.',
    botJobs: ['lesson_question_classifier', 'curriculum_gap_candidate'],
    proofLanes: ['approved_discord_knowledge', 'rag_discord_sources'],
    pinnedAssets: ['lesson question template', 'course feedback template'],
    antiSprawlRule: 'Do not create per-course channels until volume proves one lesson lane is overloaded.',
  },
  {
    name: 'build-lab',
    purpose: 'Project specs, shipping updates, technical questions, and general build work.',
    category: 'learning',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'daily',
    owner: 'members',
    primaryMemberAction: 'Share a build update with goal, current artifact, next decision, and requested feedback.',
    botJobs: ['project_candidate_detection', 'build_update_digest', 'challenge_submission_hint'],
    proofLanes: ['approved_discord_knowledge', 'public_proof_assets'],
    pinnedAssets: ['build update template', 'smallest shippable artifact checklist'],
    antiSprawlRule: 'Use threads for tech-specific depth instead of separate AI, web, cloud, SEO, and growth channels.',
  },
  {
    name: 'project-submissions',
    purpose: 'Structured project drops for review, progress tracking, points, and showcase candidates.',
    category: 'proof',
    visibility: 'approved_members',
    postingMode: 'structured_submissions',
    cadence: 'weekly',
    owner: 'members',
    primaryMemberAction: 'Submit one artifact with goal, user, link or screenshot, what changed, and next risk.',
    botJobs: ['submit_project', 'project_review_status', 'points_after_admin_approval', 'showcase_candidate'],
    proofLanes: ['approved_discord_knowledge', 'public_proof_assets'],
    pinnedAssets: ['project submission template', 'review rubric', 'points policy'],
    antiSprawlRule: 'Keep project drops here; build chatter stays in build-lab instead of creating per-project channels.',
  },
  {
    name: 'review-queue',
    purpose: 'Design, code, AI, SEO, cloud, and architecture review requests.',
    category: 'learning',
    visibility: 'approved_members',
    postingMode: 'structured_submissions',
    cadence: 'weekly',
    owner: 'members',
    primaryMemberAction: 'Request one specific critique type and include the artifact, goal, risk, and deadline.',
    botJobs: ['request_review', 'review_triage', 'review_points_after_completion', 'teaching_material_candidate'],
    proofLanes: ['approved_discord_knowledge', 'public_proof_assets'],
    pinnedAssets: ['review request template', 'critique quality bar', 'review statuses'],
    antiSprawlRule: 'Use one review queue with typed requests instead of many review-specific channels.',
  },
  {
    name: 'content-queue',
    purpose: 'Captured questions, content ideas, resource gaps, and approved draft inputs.',
    category: 'proof',
    visibility: 'approved_members',
    postingMode: 'structured_submissions',
    cadence: 'weekly',
    owner: 'members',
    primaryMemberAction: 'Nominate a question, answer, resource gap, build, or confusion that should become durable content.',
    botJobs: ['capture_content', 'content_queue_scoring', 'admin_approval_workflow', 'rag_candidate_after_approval'],
    proofLanes: ['approved_discord_knowledge', 'rag_discord_sources', 'public_proof_assets'],
    pinnedAssets: ['content candidate template', 'source-first rule', 'approval workflow'],
    antiSprawlRule: 'This is the only content intake lane; drafts and publishing stay approval-gated.',
  },
  {
    name: 'live-room',
    purpose: 'Office-hours queue, live session notes, and replay follow-up.',
    category: 'engagement',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'live',
    owner: 'admin',
    primaryMemberAction: 'Use during live sessions for notes, links, and follow-up actions.',
    botJobs: ['live_session_notes', 'replay_followup_candidate'],
    proofLanes: ['approved_discord_knowledge', 'public_proof_assets'],
    pinnedAssets: ['live session format', 'session notes template'],
    antiSprawlRule: 'Keep live-session chat here; office-hours planning stays in office-hours.',
  },
  {
    name: 'office-hours',
    purpose: 'Office-hours schedule, agenda, submitted questions, session notes, and replay links.',
    category: 'engagement',
    visibility: 'approved_members',
    postingMode: 'structured_submissions',
    cadence: 'weekly',
    owner: 'admin',
    primaryMemberAction: 'Queue one blocker with artifact, decision needed, and what would make the session useful.',
    botJobs: ['office_hours_queue', 'agenda_builder', 'weekly_recap_input'],
    proofLanes: ['approved_discord_knowledge', 'premium_workflow_proof'],
    pinnedAssets: ['office-hours schedule', 'queue template', 'replay archive policy'],
    antiSprawlRule: 'Do not create separate event channels; use one queue plus live-room for the session.',
  },
  {
    name: 'accountability',
    purpose: 'Weekly goals, check-ins, shipping commitments, and progress nudges.',
    category: 'engagement',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'weekly',
    owner: 'members',
    primaryMemberAction: 'Post commitment, shipped result, what slipped, and smallest next action.',
    botJobs: ['weekly_checkin_prompt', 'streak_update', 'stuck_member_nudge'],
    proofLanes: ['approved_discord_knowledge'],
    pinnedAssets: ['weekly check-in template', 'streak and points rules'],
    antiSprawlRule: 'Keep goals and check-ins here; wins move to wins-showcase after they are shipped.',
  },
  {
    name: 'resources',
    purpose: 'Templates, stack guides, reading lists, prompts, and useful tools.',
    category: 'academy',
    visibility: 'approved_members',
    postingMode: 'read_only',
    cadence: 'weekly',
    owner: 'admin',
    primaryMemberAction: 'Use approved resources, then ask implementation questions in questions or build-lab.',
    botJobs: ['resource_drop_draft', 'approved_resource_sync', 'rag_source_candidate'],
    proofLanes: ['rag_discord_sources'],
    pinnedAssets: ['resource index', 'template library', 'request a resource path'],
    antiSprawlRule: 'Keep approved resources centralized; requests go to content-queue, not new resource channels.',
  },
  {
    name: 'wins-showcase',
    purpose: 'Finished ships, member wins, proof screenshots, and weekly recap inputs.',
    category: 'proof',
    visibility: 'approved_members',
    postingMode: 'member_led',
    cadence: 'weekly',
    owner: 'members',
    primaryMemberAction: 'Share finished work, measurable progress, screenshots, or lessons learned.',
    botJobs: ['weekly_wins_prompt', 'leaderboard_recap', 'public_proof_candidate'],
    proofLanes: ['public_proof_assets'],
    pinnedAssets: ['win template', 'privacy-safe showcase policy', 'weekly recap format'],
    antiSprawlRule: 'Only finished or meaningfully progressed work goes here; drafts stay in build-lab.',
  },
  {
    name: 'premium',
    purpose: 'Premium member critique, advanced drops, replays, and deeper help.',
    category: 'premium',
    visibility: 'premium_members',
    postingMode: 'member_led',
    cadence: 'as_needed',
    owner: 'premium',
    primaryMemberAction: 'Ask for deeper implementation help or priority critique tied to a concrete artifact.',
    botJobs: ['premium_ask', 'premium_deeper_answer', 'premium_sla_tracking'],
    proofLanes: ['premium_workflow_proof'],
    pinnedAssets: ['premium promise', 'premium ask template', 'SLA expectation'],
    antiSprawlRule: 'Keep premium general help here; formal teardown requests go to premium-reviews.',
  },
  {
    name: 'premium-reviews',
    purpose: 'Premium-only structured reviews, deeper teardowns, and priority critique queue.',
    category: 'premium',
    visibility: 'premium_members',
    postingMode: 'structured_submissions',
    cadence: 'weekly',
    owner: 'premium',
    primaryMemberAction: 'Submit artifact, review type, desired depth, deadline, and decision you need made.',
    botJobs: ['premium_review_request', 'premium_review_quality_gate', 'premium_content_candidate'],
    proofLanes: ['premium_workflow_proof', 'approved_discord_knowledge'],
    pinnedAssets: ['premium review template', 'review status policy', 'content reuse permission rule'],
    antiSprawlRule: 'Use one formal premium review queue instead of per-topic premium channels.',
  },
  {
    name: 'team-ops',
    purpose: 'Private moderation, reports, analytics review, and admin operations.',
    category: 'ops',
    visibility: 'staff_private',
    postingMode: 'staff_only',
    cadence: 'daily',
    owner: 'staff',
    primaryMemberAction: 'No member action; staff reviews applications, alerts, queue health, and proof gates.',
    botJobs: ['admin_alerts', 'failed_job_digest', 'proof_gate_digest', 'moderation_candidate_review'],
    proofLanes: ['operating_admin'],
    pinnedAssets: ['admin checklist', 'incident runbook', 'weekly operating rhythm'],
    antiSprawlRule: 'Keep staff operations private and consolidated; do not duplicate admin dashboard state in public channels.',
  },
];

function canonicalChannel(
  templateName: string,
  name: string,
  overrides: Partial<SageDiscordChannel> = {},
): SageDiscordChannel {
  const template = channelTemplates.find((channel) => channel.name === templateName);
  if (!template) throw new Error(`Missing Discord channel template: ${templateName}`);
  return { ...template, ...overrides, name };
}

export const leanDiscordChannels: SageDiscordChannel[] = [
  canonicalChannel('start-here', 'start-here'),
  canonicalChannel('academy-roadmap', 'rules', {
    purpose: 'Read-only community rules, quality standards, privacy boundaries, and approval expectations.',
    visibility: 'pre_approval',
    primaryMemberAction: 'Read every rule, understand the approval boundary, and accept the standards before applying.',
    botJobs: ['rules_version_notice', 'application_policy_check'],
    pinnedAssets: ['community rules', 'privacy boundaries', 'approval policy'],
  }),
  canonicalChannel('announcements', 'announcements', { visibility: 'pre_approval' }),
  canonicalChannel('questions', 'the-floor', {
    purpose: 'The main approved-member room for introductions, questions, answers, useful discussion, and routing.',
    primaryMemberAction: 'Introduce yourself or ask one specific question with context, an attempted solution, and the decision you need.',
    botJobs: ['message_classifier', 'mention_responder', 'question_answer_linking', 'content_queue_candidate'],
    pinnedAssets: ['introduction prompt', 'question template', 'answer quality bar'],
  }),
  canonicalChannel('build-lab', 'build-lab'),
  canonicalChannel('project-submissions', 'project-submissions'),
  canonicalChannel('review-queue', 'review-queue'),
  canonicalChannel('daily-signal', 'daily-signal'),
  canonicalChannel('accountability', 'challenges', {
    purpose: 'Daily and weekly build challenges with explicit deliverables, review gates, and anti-farming rules.',
    primaryMemberAction: 'Choose the current challenge, build the specified artifact, and submit it through the reviewed workflow.',
    cadence: 'daily',
    botJobs: ['challenge_generation', 'challenge_publish_after_approval', 'challenge_submission_hint'],
    pinnedAssets: ['current challenge', 'submission rubric', 'points and review policy'],
  }),
  canonicalChannel('lesson-discussion', 'quiz-room', {
    purpose: 'Source-grounded quizzes and interview questions with explanations, scoring, and retrieval practice.',
    postingMode: 'bot_led',
    cadence: 'daily',
    owner: 'sagebot',
    primaryMemberAction: 'Answer the current question, inspect the explanation, and record what you need to retrieve again.',
    botJobs: ['quiz_generation', 'interview_question_generation', 'quiz_attempt_scoring'],
    pinnedAssets: ['quiz instructions', 'scoring policy', 'retrieval practice guide'],
  }),
  canonicalChannel('wins-showcase', 'weekly-recap', {
    purpose: 'Weekly synthesis of reviewed builds, useful answers, leaderboard results, wins, and the next learning focus.',
    postingMode: 'bot_led',
    owner: 'sagebot',
    primaryMemberAction: 'Review the week, recognize useful contributions, and choose one concrete action for the next cycle.',
    botJobs: ['weekly_leaderboard', 'weekly_recap_draft', 'weekly_recap_publish_after_approval'],
    pinnedAssets: ['weekly recap format', 'recognition policy', 'privacy-safe proof policy'],
  }),
  canonicalChannel('resources', 'resources'),
  canonicalChannel('ask-sage', 'saved-answers', {
    purpose: 'Curated, approved answers that members can reuse without searching through transient conversations.',
    postingMode: 'read_only',
    owner: 'admin',
    primaryMemberAction: 'Find an approved answer, apply it to the current build, and flag anything stale or incomplete.',
    botJobs: ['helpful_answer_promotion', 'answer_freshness_review', 'rag_source_candidate'],
    pinnedAssets: ['answer index', 'freshness policy', 'request an update'],
  }),
  canonicalChannel('lesson-discussion', 'playbooks', {
    purpose: 'Approved implementation playbooks, operating checklists, and reusable lessons derived from reviewed work.',
    postingMode: 'read_only',
    owner: 'admin',
    cadence: 'weekly',
    primaryMemberAction: 'Use one reviewed playbook in a real build and report the result or missing step on the floor.',
    botJobs: ['lesson_draft', 'playbook_freshness_review', 'approved_knowledge_sync'],
    pinnedAssets: ['playbook index', 'implementation checklist', 'freshness policy'],
  }),
  canonicalChannel('live-room', 'live-room'),
  canonicalChannel('office-hours', 'office-hours'),
  canonicalChannel('premium', 'premium-lounge'),
  canonicalChannel('premium-reviews', 'premium-reviews'),
  canonicalChannel('team-ops', 'team-ops'),
  canonicalChannel('content-queue', 'content-queue', {
    purpose: 'Private staff queue for reviewed questions, content ideas, resource gaps, drafts, and knowledge candidates.',
    visibility: 'staff_private',
    postingMode: 'staff_only',
    owner: 'staff',
    primaryMemberAction: 'No direct member action; staff reviews provenance, privacy, quality, and the correct promotion lane.',
    botJobs: ['capture_content', 'content_queue_scoring', 'admin_approval_workflow', 'rag_candidate_after_approval'],
    pinnedAssets: ['content candidate rubric', 'source-first rule', 'approval workflow'],
  }),
];

export function validateLeanDiscordChannelOperatingMatrix(channels = leanDiscordChannels): {
  ok: boolean;
  failures: string[];
  coverage: {
    count: number;
    dailyChannels: string[];
    weeklyChannels: string[];
    proofLanes: SageChannelProofLane[];
  };
} {
  const failures: string[] = [];
  const names = channels.map((channel) => channel.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicateNames.length) failures.push(`duplicate_channels:${[...new Set(duplicateNames)].join(',')}`);

  const requiredProofLanes: SageChannelProofLane[] = [
    'onboarding',
    'approved_discord_knowledge',
    'rag_discord_sources',
    'public_proof_assets',
    'premium_workflow_proof',
    'operating_admin',
  ];
  const proofLanes = [...new Set(channels.flatMap((channel) => channel.proofLanes))].sort() as SageChannelProofLane[];
  const missingProofLanes = requiredProofLanes.filter((lane) => !proofLanes.includes(lane));
  if (missingProofLanes.length) failures.push(`missing_proof_lanes:${missingProofLanes.join(',')}`);

  for (const channel of channels) {
    if (!/^[a-z0-9-]+$/.test(channel.name)) failures.push(`${channel.name}:invalid_channel_name`);
    if (channel.purpose.length < 40) failures.push(`${channel.name}:purpose_too_thin`);
    if (channel.primaryMemberAction.length < 40) failures.push(`${channel.name}:primary_action_too_thin`);
    if (channel.botJobs.length < 1) failures.push(`${channel.name}:missing_bot_jobs`);
    if (channel.proofLanes.length < 1) failures.push(`${channel.name}:missing_proof_lanes`);
    if (channel.pinnedAssets.length < 2) failures.push(`${channel.name}:missing_pinned_assets`);
    if (!/do not|keep|only|instead/i.test(channel.antiSprawlRule)) failures.push(`${channel.name}:weak_anti_sprawl_rule`);
    if (channel.visibility === 'pre_approval' && !['start-here', 'rules', 'announcements'].includes(channel.name)) {
      failures.push(`${channel.name}:unexpected_pre_approval_channel`);
    }
    if (channel.visibility === 'staff_private' && channel.postingMode !== 'staff_only') failures.push(`${channel.name}:staff_private_not_staff_only`);
    if (channel.visibility === 'premium_members' && channel.category !== 'premium') failures.push(`${channel.name}:premium_visibility_non_premium_category`);
  }

  const dailyChannels = channels.filter((channel) => channel.cadence === 'daily').map((channel) => channel.name);
  const weeklyChannels = channels.filter((channel) => channel.cadence === 'weekly').map((channel) => channel.name);
  if (dailyChannels.length < 3) failures.push('insufficient_daily_operating_channels');
  if (weeklyChannels.length < 8) failures.push('insufficient_weekly_operating_channels');

  return {
    ok: failures.length === 0,
    failures,
    coverage: {
      count: channels.length,
      dailyChannels,
      weeklyChannels,
      proofLanes,
    },
  };
}

export const sageLevelOptions: Array<{
  key: SageLevelKey;
  label: string;
  description: string;
  role: string;
}> = [
  {
    key: 'starting',
    label: 'Starting',
    description: 'I need foundations and guided projects.',
    role: 'Beginner',
  },
  {
    key: 'learning',
    label: 'Learning',
    description: 'I can follow tutorials but need structure.',
    role: 'Academy Member',
  },
  {
    key: 'shipping',
    label: 'Shipping',
    description: 'I can build but need review and polish.',
    role: 'Builder',
  },
  {
    key: 'architecting',
    label: 'Architecting',
    description: 'I need scale, systems, quality, and advanced patterns.',
    role: 'Contributor',
  },
  {
    key: 'mentoring',
    label: 'Mentoring',
    description: 'I can help others and want sharper systems.',
    role: 'Mentor',
  },
];

export const dailyBuildPrompts = [
  'Pick one repeated manual task in your life or work. Write the first 3-step automation spec before touching code.',
  'Build a one-screen AI tool that takes messy input and returns structured output. Save the input/output pair.',
  'Redesign one hero section from a site you like. Explain the visual hierarchy decisions.',
  'Take one project idea and write the user story, acceptance criteria, and out-of-scope list.',
  'Create a tiny content engine: one question, one answer, one social post, one newsletter angle.',
  'Map the architecture for a small SaaS: user, auth, database, API, background job, deployment, monitoring.',
  'Improve a project README so a stranger can understand the problem, stack, and demo in 60 seconds.',
  'Build a landing page section for a premium offer: outcome, proof, process, CTA.',
  'Write an eval checklist for one AI workflow. Define what bad output looks like.',
  'Ship one visible improvement to an existing project and post a before/after screenshot.',
];

export const dailyAiTools = [
  'Structured outputs: use schemas so AI returns data your app can validate.',
  'Prompt versioning: save prompt name, version, inputs, output, and result quality.',
  'Human approval gates: require approval before AI sends, deletes, charges, or posts anything.',
  'Retrieval basics: chunk source material, cite source IDs, and reject unsupported answers.',
  'Cost controls: cap tokens, retries, model choices, and daily spend per workflow.',
  'Agent tool boundaries: every tool needs a name, input schema, permission model, and failure path.',
  'AI UX: show what the AI is doing, what it needs, and how users can correct it.',
];

export const dailyQuestions = [
  'What are you trying to ship this week, and what is the smallest useful version?',
  'Where is AI genuinely useful in your current project, and where would it add risk?',
  'What would make your portfolio project feel more credible to a buyer or hiring manager?',
  'Which part of your build is unclear: user, data, design, architecture, or distribution?',
  'What is one project decision you made this week and the tradeoff behind it?',
];

export const weeklyCadence = [
  'Monday: Build brief and weekly project target.',
  'Tuesday: Tool teardown and implementation pattern.',
  'Wednesday: Office-hours question collection.',
  'Thursday: Review day for code, design, AI, SEO, and architecture.',
  'Friday: Ship showcase and portfolio proof.',
  'Saturday: Content engine challenge.',
  'Sunday: Weekly recap and next-week planning.',
];

export function pickDaily<T>(items: T[], now = new Date()): T {
  const dayKey = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  return items[dayKey % items.length];
}
