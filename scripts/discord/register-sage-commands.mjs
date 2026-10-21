#!/usr/bin/env node

const API = 'https://discord.com/api/v10';

const commands = [
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
	        choices: [
	          ['AI Apps', 'ai_apps'],
	          ['Full-Stack Development', 'full_stack'],
	          ['Websites + Design', 'web_design'],
	          ['Cloud + DevOps', 'cloud_devops'],
	          ['AI Agents + Automation', 'agents_automation'],
	          ['SEO + Content Engine', 'seo_content'],
	          ['Ads + Growth', 'ads_growth'],
	          ['Architecture + Systems', 'architecture'],
	        ].map(([name, value]) => ({ name, value })),
	      },
	      {
	        name: 'level',
	        description: 'Your current builder level',
	        type: 3,
	        required: false,
	        choices: [
	          ['Starting', 'starting'],
	          ['Learning', 'learning'],
	          ['Shipping', 'shipping'],
	          ['Architecting', 'architecting'],
	          ['Mentoring', 'mentoring'],
	        ].map(([name, value]) => ({ name, value })),
	      },
	      { name: 'timezone', description: 'Your timezone for office hours and accountability', type: 3, required: false },
	      { name: 'time_budget', description: 'Weekly time you can realistically commit', type: 3, required: false },
	      {
	        name: 'support',
	        description: 'What kind of support would help most?',
	        type: 3,
	        required: false,
	        choices: [
	          ['Questions and unblockers', 'questions'],
	          ['Project review', 'review'],
	          ['Accountability', 'accountability'],
	          ['Premium critique', 'premium_curious'],
	        ].map(([name, value]) => ({ name, value })),
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
        choices: [
          ['AI Apps', 'ai_apps'],
          ['Full-Stack Development', 'full_stack'],
          ['Websites + Design', 'web_design'],
          ['Cloud + DevOps', 'cloud_devops'],
          ['AI Agents + Automation', 'agents_automation'],
          ['SEO + Content Engine', 'seo_content'],
          ['Ads + Growth', 'ads_growth'],
          ['Architecture + Systems', 'architecture'],
        ].map(([name, value]) => ({ name, value })),
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
      { name: 'tags', description: 'Optional tags, comma separated: ai-apps, review, beginner', type: 3, required: false },
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
          ['Design', 'design'],
          ['Code', 'code'],
          ['AI workflow', 'ai'],
          ['Architecture', 'architecture'],
          ['SEO/content', 'seo'],
          ['Cloud/devops', 'cloud'],
        ].map(([name, value]) => ({ name, value })),
      },
      { name: 'summary', description: 'What should be reviewed?', type: 3, required: true },
      { name: 'link', description: 'Optional link or screenshot', type: 3, required: false },
      { name: 'tags', description: 'Optional tags, comma separated: design, blocker, shipping', type: 3, required: false },
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
          ['Design', 'design'],
          ['Code', 'code'],
          ['AI workflow', 'ai'],
          ['Architecture', 'architecture'],
          ['SEO/content', 'seo'],
          ['Cloud/devops', 'cloud'],
          ['Growth', 'growth'],
          ['General', 'general'],
        ].map(([name, value]) => ({ name, value })),
      },
      { name: 'summary', description: 'What should be reviewed, and what outcome do you want?', type: 3, required: true },
      { name: 'link', description: 'Artifact link, repo, page, doc, screenshot, or loom', type: 3, required: false },
      { name: 'tags', description: 'Optional tags, comma separated: premium, ai-apps, review', type: 3, required: false },
    ],
  },
  {
    name: 'capture-content',
    description: 'Capture a question, lesson, win, or project moment into the content engine.',
    options: [
      { name: 'idea', description: 'Content-worthy question, lesson, win, or angle', type: 3, required: true },
      { name: 'source', description: 'Optional source/context', type: 3, required: false },
      { name: 'tags', description: 'Optional tags, comma separated: lesson, resource, win', type: 3, required: false },
    ],
  },
  {
    name: 'ask',
    description: 'Ask a structured member question in the questions channel and earn points.',
    options: [
      { name: 'question', description: 'The question you need answered', type: 3, required: true },
      { name: 'context', description: 'Goal, blocker, attempted solution, or link context', type: 3, required: false },
      { name: 'tags', description: 'Optional tags, comma separated: blocker, ai-apps, beginner', type: 3, required: false },
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
      { name: 'tags', description: 'Optional tags, comma separated: challenge, web-design, shipping', type: 3, required: false },
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

function cleanEnv(value) {
  return value?.replace(/\\n/g, '').trim();
}

const token = cleanEnv(process.env.DISCORD_BOT_TOKEN);
const appId = cleanEnv(process.env.DISCORD_CLIENT_ID);
const guildId = cleanEnv(process.env.DISCORD_GUILD_ID);

if (!token || !appId || !guildId) {
  console.error('Missing DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID.');
  process.exit(1);
}

const response = await fetch(`${API}/applications/${appId}/guilds/${guildId}/commands`, {
  method: 'PUT',
  headers: {
    authorization: `Bot ${token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(commands),
});

const body = await response.text();
if (!response.ok) {
  console.error(body);
  process.exit(1);
}

const registered = JSON.parse(body);
console.log(`Registered ${registered.length} SageBot commands.`);
