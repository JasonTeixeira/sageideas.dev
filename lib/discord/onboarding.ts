import { recordDiscordEvent, upsertDiscordMember } from './analytics';
import { sageLevelOptions, sagePathOptions, type SageLevelKey, type SagePathKey } from './sage-content';
import { completeOnboardingStep, type MemberApplicationProfile } from './engagement';
import { applyDiscordRoleRouting, postToChannelByBaseName } from './sage-rest';

function validPathKey(value?: string | null): SagePathKey | null {
  return sagePathOptions.some((option) => option.key === value) ? value as SagePathKey : null;
}

function validLevelKey(value?: string | null): SageLevelKey | null {
  return sageLevelOptions.some((option) => option.key === value) ? value as SageLevelKey : null;
}

export function buildPostApprovalWelcome(discordUserId: string, profile?: MemberApplicationProfile | null): string {
  const path = sagePathOptions.find((option) => option.key === profile?.pathKey);
  const level = sageLevelOptions.find((option) => option.key === profile?.levelKey);
  return [
    `Welcome <@${discordUserId}>. You are approved for Sage Ideas Academy access.`,
    '',
    '**How this Discord works**',
    '- `the-floor`: introduce yourself, ask specific questions, answer others, and route the next useful action.',
    '- `daily-signal`: take one useful daily action and share the artifact or blocker.',
    '- `build-lab`: post project specs, work-in-progress, and shipping updates.',
    '- `review-queue`: request focused critique on code, design, AI, SEO, cloud, or architecture.',
    '- `quiz-room`: retrieve concepts and inspect the explanation after each attempt.',
    '- `challenges`: build small artifacts; points require the reviewed submission path.',
    '- `live-room`: office-hours questions, live session notes, and replay follow-up.',
    '- `resources`: templates, guides, prompts, and useful tools.',
    '- `saved-answers`: reuse approved answers and flag anything stale.',
    '- `playbooks`: apply reviewed implementation guides to a real build.',
    '- `weekly-recap`: review useful contributions and choose the next learning action.',
    '- `premium-lounge`: deeper critique, advanced drops, and premium review flow.',
    '',
    path ? `**Assigned path:** ${path.label} -> start in \`${path.channel}\`.` : '**Assigned path:** run `/onboard` to choose your path.',
    level ? `**Current level:** ${level.label}.` : '**Current level:** run `/onboard` to choose your level.',
    profile?.weeklyTimeBudget ? `**Weekly time budget:** ${profile.weeklyTimeBudget}.` : null,
    profile?.preferredSupport ? `**Support requested:** ${profile.preferredSupport}.` : null,
    '',
    '**First-week checklist**',
    '1. Run `/onboard` if you have not selected path/level yet.',
    '2. Ask your first useful question with `/ask` or post your intro in `the-floor`.',
    '3. Run `/daily` and complete one useful action.',
    '4. Run `/challenge`, then submit with `/submit-challenge`.',
    '5. Submit your first project with `/submit-project`.',
    '6. Ask for critique with `/request-review` when you have an artifact.',
    '7. Capture one useful question or lesson with `/capture-content`.',
    '8. Run `/checklist` any time to see progress.',
    '',
    'The bar here is simple: ship useful artifacts, ask specific questions, and turn what you learn into reusable proof.',
  ].filter(Boolean).join('\n');
}

export async function approveDiscordMember(input: {
  discordUserId: string;
  username?: string | null;
  reviewer?: string | null;
  commandName: string;
  application?: MemberApplicationProfile | null;
}): Promise<void> {
  const pathKey = validPathKey(input.application?.pathKey);
  const levelKey = validLevelKey(input.application?.levelKey);
  await applyDiscordRoleRouting(input.discordUserId, {
    currentPathKey: null,
    currentLevelKey: null,
    nextPathKey: pathKey,
    nextLevelKey: levelKey,
  });
  await upsertDiscordMember({
    discordUserId: input.discordUserId,
    username: input.application?.username ?? input.username ?? null,
    pathKey,
    levelKey,
    timezone: input.application?.timezone ?? null,
    weeklyTimeBudget: input.application?.weeklyTimeBudget ?? null,
    primaryGoal: input.application?.primaryGoal ?? input.application?.goal ?? null,
    preferredSupport: input.application?.preferredSupport ?? null,
    portfolioUrl: input.application?.portfolioUrl ?? null,
    referralSource: input.application?.referralSource ?? null,
    onboardingCompletedAt: new Date().toISOString(),
    academyMember: true,
  });
  if (pathKey || levelKey) {
    await completeOnboardingStep({
      discordUserId: input.discordUserId,
      username: input.application?.username ?? input.username ?? null,
      stepKey: 'path',
      metadata: { path: pathKey, level: levelKey, source: 'approval' },
    });
  }
  await postToChannelByBaseName('the-floor', buildPostApprovalWelcome(input.discordUserId, input.application));
  await postToChannelByBaseName(
    'team-ops',
    [
      `Approved <@${input.discordUserId}> for Academy Member access. Reviewer: ${input.reviewer ?? 'admin'}.`,
      pathKey ? `Path: ${pathKey}.` : null,
      levelKey ? `Level: ${levelKey}.` : null,
      input.application?.preferredSupport ? `Support: ${input.application.preferredSupport}.` : null,
    ].filter(Boolean).join(' '),
  );
  await recordDiscordEvent({
    eventType: 'member_application_approved',
    commandName: input.commandName,
    discordUserId: input.discordUserId,
    discordUsername: input.application?.username ?? input.username ?? input.discordUserId,
    channelBaseName: 'team-ops',
    metadata: {
      reviewer: input.reviewer ?? null,
      path: pathKey,
      level: levelKey,
      preferred_support: input.application?.preferredSupport ?? null,
    },
  });
}
