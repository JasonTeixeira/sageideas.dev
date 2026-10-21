'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { recordDiscordEvent } from '@/lib/discord/analytics';
import { reviewDiscordContentDraft } from '@/lib/discord/content-approval';
import { publishApprovedDiscordContentDraft } from '@/lib/discord/content-jobs-v2';
import {
  cancelDiscordDurableJobRun,
  resolveDiscordDurableDeadLetter,
  retryDiscordDurableDeadLetter,
  syncDiscordDurableJobRegistry,
} from '@/lib/discord/durable-jobs';
import { markDiscordAnswerHelpful, reviewChallengeSubmission, reviewMemberApplication } from '@/lib/discord/engagement';
import { promoteKnowledgeCandidateForRag, type KnowledgeCandidateDecision } from '@/lib/discord/knowledge-candidates';
import { approveDiscordMember } from '@/lib/discord/onboarding';
import { assignPremiumReviewRequest, completePremiumReviewRequest } from '@/lib/discord/premium-workflows';
import { postToChannelByBaseName } from '@/lib/discord/sage-rest';

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function approveDiscordApplication(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const discordUserId = value(formData, 'discord_user_id');
  const username = value(formData, 'discord_username') || discordUserId;
  const note = value(formData, 'note');
  if (!discordUserId) throw new Error('Missing Discord user id.');

  const result = await reviewMemberApplication({
    discordUserId,
    status: 'approved',
    reviewerDiscordUserId: user.id,
    reviewerUsername: profile.email,
    note: note || null,
  });
  if (!result.ok) throw new Error(`Could not approve application: ${result.reason ?? 'unknown error'}`);

  await approveDiscordMember({
    discordUserId,
    username: result.application?.username ?? username,
    reviewer: profile.email,
    commandName: 'admin_dashboard',
    application: result.application ?? null,
  });
  revalidatePath('/admin/discord');
}

export async function rejectDiscordApplication(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const discordUserId = value(formData, 'discord_user_id');
  const username = value(formData, 'discord_username') || discordUserId;
  const note = value(formData, 'note');
  if (!discordUserId) throw new Error('Missing Discord user id.');

  const result = await reviewMemberApplication({
    discordUserId,
    status: 'rejected',
    reviewerDiscordUserId: user.id,
    reviewerUsername: profile.email,
    note: note || null,
  });
  if (!result.ok) throw new Error(`Could not reject application: ${result.reason ?? 'unknown error'}`);

  await postToChannelByBaseName(
    'team-ops',
    `Rejected <@${discordUserId}> application from admin dashboard. Reviewer: ${profile.email}. ${note ? `Note: ${note}` : ''}`,
  );
  await recordDiscordEvent({
    eventType: 'member_application_rejected',
    commandName: 'admin_dashboard',
    discordUserId,
    discordUsername: username,
    channelBaseName: 'team-ops',
    metadata: { reviewer: profile.email, note: note || null },
  });
  revalidatePath('/admin/discord');
}

export async function updateDiscordContentQueueStatus(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const status = value(formData, 'status');
  const allowed = new Set(['captured', 'triaged', 'drafted', 'published', 'archived']);
  if (!id || !allowed.has(status)) throw new Error('Invalid content queue update.');

  const { error } = await supabaseAdmin()
    .from('discord_content_queue')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: 'content_queue_status_updated',
    commandName: 'admin_dashboard',
    channelBaseName: 'content-queue',
    metadata: { id, status, reviewer: profile.email },
  });
  revalidatePath('/admin/discord');
}

export async function reviewDiscordContentDraftAction(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const id = value(formData, 'id');
  const status = value(formData, 'status');
  const note = value(formData, 'note');
  if (!id || !['approved', 'rejected', 'archived'].includes(status)) throw new Error('Invalid content draft review.');

  await reviewDiscordContentDraft({
    draftId: id,
    status: status as 'approved' | 'rejected' | 'archived',
    reviewerUserId: user.id,
    reviewerEmail: profile.email,
    note: note || null,
  });
  await recordDiscordEvent({
    eventType: 'content_draft_reviewed',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { id, status, reviewer: profile.email, note: note || null },
  });
  revalidatePath('/admin/discord');
}

export async function publishDiscordContentDraftAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  if (!id) throw new Error('Missing content draft id.');

  const result = await publishApprovedDiscordContentDraft({
    draftId: id,
    source: 'admin_dashboard',
  });
  await recordDiscordEvent({
    eventType: result.posted ? 'content_draft_admin_published' : 'content_draft_admin_publish_skipped',
    commandName: 'admin_dashboard',
    channelBaseName: result.targetChannelBaseName ?? 'team-ops',
    metadata: {
      id,
      reviewer: profile.email,
      posted: result.posted,
      skipped: result.skipped,
      reason: result.reason ?? null,
      message_id: result.messageId,
    },
  });
  revalidatePath('/admin/discord');
  if (!result.ok && result.reason !== 'already_published') {
    throw new Error(`Could not publish content draft: ${result.reason ?? 'unknown error'}`);
  }
}

export async function reviewDiscordChallengeSubmissionAction(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const id = value(formData, 'id');
  const status = value(formData, 'status');
  const note = value(formData, 'note');
  if (!id || !['approved', 'featured', 'rejected'].includes(status)) throw new Error('Invalid challenge review.');

  const result = await reviewChallengeSubmission({
    submissionId: id,
    status: status as 'approved' | 'featured' | 'rejected',
    reviewerDiscordUserId: user.id,
    reviewerUsername: profile.email,
    note: note || null,
  });
  if (!result.ok || !result.submission) throw new Error(`Could not review challenge: ${result.reason ?? 'unknown error'}`);

  let messageId: string | null = null;
  if (status === 'featured') {
    messageId = await postToChannelByBaseName(
      'weekly-recap',
      [
        `# Featured challenge submission`,
        `**Member:** ${result.submission.username ?? result.submission.discordUserId}`,
        `**Challenge:** ${result.submission.challengeKey}`,
        `**Submission ID:** \`${result.submission.id}\``,
        `**Summary:** ${result.submission.summary}`,
        result.submission.link ? `**Link:** ${result.submission.link}` : null,
        `**Points awarded:** ${result.pointsAwarded}`,
      ].filter(Boolean).join('\n'),
    );
    if (messageId) {
      await supabaseAdmin()
        .from('discord_challenge_submissions')
        .update({ featured_message_id: messageId, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  }

  await recordDiscordEvent({
    eventType: 'challenge_submission_reviewed',
    commandName: 'admin_dashboard',
    discordUserId: result.submission.discordUserId,
    discordUsername: result.submission.username,
    channelBaseName: status === 'featured' ? 'weekly-recap' : 'team-ops',
    metadata: { id, status, reviewer: profile.email, note: note || null, points_awarded: result.pointsAwarded, message_id: messageId },
  });
  revalidatePath('/admin/discord');
}

export async function approveDiscordQuestionForRagAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  if (!id) throw new Error('Missing question id.');

  const { error } = await supabaseAdmin()
    .from('discord_questions')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'open');
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: 'rag_question_approved',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { id, reviewer: profile.email, approved_state: 'closed' },
  });
  revalidatePath('/admin/discord');
}

export async function approveDiscordAnswerForRagAction(formData: FormData) {
  const { user, profile } = await requireAdmin();
  const id = value(formData, 'id');
  if (!id) throw new Error('Missing answer id.');

  const result = await markDiscordAnswerHelpful({
    answerId: id,
    reviewerDiscordUserId: user.id,
    reviewerUsername: profile.email,
  });
  if (!result.ok && result.reason !== 'already_helpful') {
    throw new Error(`Could not mark answer helpful: ${result.reason ?? 'unknown error'}`);
  }

  await recordDiscordEvent({
    eventType: 'rag_answer_approved',
    commandName: 'admin_dashboard',
    discordUserId: result.answererDiscordUserId,
    discordUsername: result.answererUsername,
    channelBaseName: 'team-ops',
    metadata: { id, reviewer: profile.email, question_id: result.questionId ?? null },
  });
  revalidatePath('/admin/discord');
}

export async function approveDiscordQueueItemForRagAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  if (!id) throw new Error('Missing content queue id.');

  const { error } = await supabaseAdmin()
    .from('discord_content_queue')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: 'rag_content_queue_approved',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { id, reviewer: profile.email, approved_state: 'published' },
  });
  revalidatePath('/admin/discord');
}

export async function syncDiscordRagSourcesAction() {
  const { profile } = await requireAdmin();
  const { runApprovedDiscordRagSourceSync } = await import('@/lib/rag/discord-source-sync');
  const result = await runApprovedDiscordRagSourceSync(supabaseAdmin(), {
    trigger: 'admin_dashboard',
  });

  await recordDiscordEvent({
    eventType: result.ok ? 'rag_source_sync_completed' : 'rag_source_sync_failed',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: {
      reviewer: profile.email,
      run_key: result.runKey,
      status: result.status,
      sources_seen: result.stats.sourcesSeen,
      sources_upserted: result.stats.sourcesUpserted,
      documents_upserted: result.stats.documentsUpserted,
      failures: result.stats.failures,
      by_type: result.stats.byType,
      blocker: result.blocker,
      error: result.error ?? null,
    },
  });
  revalidatePath('/admin/discord');
  if (!result.ok) throw new Error(result.error ?? 'RAG source sync failed.');
}

export async function createRagEvalKnowledgeTaskAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const evalKey = value(formData, 'eval_key');
  const question = value(formData, 'question');
  const suggestedFix = value(formData, 'suggested_fix');
  const resultId = value(formData, 'result_id');
  if (!evalKey || !question || !resultId) throw new Error('Missing eval failure details.');

  const { data: existing, error: existingError } = await supabaseAdmin()
    .from('discord_content_queue')
    .select('id')
    .eq('source', 'rag_eval_failure')
    .contains('metadata', { rag_eval_result_id: resultId })
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const metadata = {
    rag_eval_result_id: resultId,
    eval_key: evalKey,
    reviewer: profile.email,
    created_from: 'admin_discord_rag_eval_drilldown',
  };
  const payload = {
    source: 'rag_eval_failure',
    discord_username: 'SageBot',
    channel_base_name: 'content-queue',
    idea: `Improve RAG source coverage for ${evalKey}`,
    angle: `${question}\n\nSuggested fix: ${suggestedFix || 'Inspect failed eval and add or approve a better source.'}`,
    status: 'captured',
    priority: 88,
    metadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = existing?.id
    ? await supabaseAdmin().from('discord_content_queue').update(payload).eq('id', existing.id).select('id').single()
    : await supabaseAdmin().from('discord_content_queue').insert(payload).select('id').single();
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: 'rag_eval_knowledge_task_created',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: {
      reviewer: profile.email,
      eval_key: evalKey,
      rag_eval_result_id: resultId,
      content_queue_id: data?.id ?? existing?.id ?? null,
      deduped: Boolean(existing?.id),
    },
  });
  revalidatePath('/admin/discord');
}

export async function reviewDiscordKnowledgeCandidateAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const decision = value(formData, 'decision') as KnowledgeCandidateDecision;
  if (!id || !['question', 'answer', 'resource', 'content', 'review', 'win', 'reject'].includes(decision)) {
    throw new Error('Invalid knowledge candidate decision.');
  }

  const result = await promoteKnowledgeCandidateForRag(supabaseAdmin(), {
    queueId: id,
    decision,
    reviewer: profile.email,
  });

  await recordDiscordEvent({
    eventType: decision === 'reject' ? 'knowledge_candidate_rejected' : 'knowledge_candidate_promoted',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: {
      reviewer: profile.email,
      queue_id: id,
      decision,
      source_id: result.sourceId,
      source_type: result.sourceType,
      rag_run_key: result.ragSync?.runKey ?? null,
      rag_documents_upserted: result.ragSync?.stats.documentsUpserted ?? 0,
      reason: result.reason ?? null,
    },
  });
  revalidatePath('/admin/discord');
}

export async function reviewDiscordPublicGrowthDraftAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const status = value(formData, 'status');
  const note = value(formData, 'note');
  if (!id || !['approved', 'rejected', 'archived', 'published'].includes(status)) {
    throw new Error('Invalid public growth draft review.');
  }
  const reviewedAt = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from('discord_public_growth_drafts')
    .update({
      status,
      reviewer_email: profile.email,
      reviewed_at: reviewedAt,
      published_at: status === 'published' ? reviewedAt : null,
      updated_at: reviewedAt,
    })
    .eq('id', id)
    .in('status', ['draft', 'pending_approval', 'approved', 'rejected']);
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: status === 'published' ? 'public_growth_draft_published' : 'public_growth_draft_reviewed',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: {
      id,
      status,
      reviewer: profile.email,
      note: note || null,
      manual_external_publish_only: status === 'published',
    },
  });
  revalidatePath('/admin/discord');
}

export async function reviewDiscordPublicProofSourceAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const permissionStatus = value(formData, 'permission_status');
  const note = value(formData, 'note');
  if (!id || !['explicit', 'anonymized', 'blocked'].includes(permissionStatus)) {
    throw new Error('Invalid public proof source review.');
  }

  const reviewedAt = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from('discord_public_proof_sources')
    .update({
      permission_status: permissionStatus,
      updated_at: reviewedAt,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  if (permissionStatus === 'blocked') {
    const { error: draftError } = await supabaseAdmin()
      .from('discord_public_growth_drafts')
      .update({
        status: 'archived',
        updated_at: reviewedAt,
      })
      .eq('source_id', id)
      .in('status', ['draft', 'pending_approval', 'approved']);
    if (draftError) throw new Error(draftError.message);
  }

  await recordDiscordEvent({
    eventType: 'public_proof_source_reviewed',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: {
      id,
      permission_status: permissionStatus,
      reviewer: profile.email,
      note: note || null,
      blocked_drafts_archived: permissionStatus === 'blocked',
    },
  });
  revalidatePath('/admin/discord');
}

export async function reviewDiscordMemberNudgeAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const status = value(formData, 'status');
  if (!id || !['approved', 'suppressed', 'skipped'].includes(status)) {
    throw new Error('Invalid member nudge review.');
  }
  const reviewedAt = new Date().toISOString();

  const { data: existing, error: existingError } = await supabaseAdmin()
    .from('discord_member_nudge_queue')
    .select('metadata')
    .eq('id', id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const { data, error } = await supabaseAdmin()
    .from('discord_member_nudge_queue')
    .update({
      status,
      updated_at: reviewedAt,
      metadata: {
        ...(typeof existing?.metadata === 'object' && existing.metadata ? existing.metadata : {}),
        reviewed_by: profile.email,
        reviewed_at: reviewedAt,
        review_source: 'admin_dashboard',
      },
    })
    .eq('id', id)
    .in('status', ['queued', 'approved'])
    .select('id, discord_user_id, discord_username, nudge_key, reason')
    .single();
  if (error) throw new Error(error.message);

  await recordDiscordEvent({
    eventType: 'member_nudge_reviewed',
    commandName: 'admin_dashboard',
    discordUserId: data.discord_user_id,
    discordUsername: data.discord_username,
    channelBaseName: 'team-ops',
    metadata: {
      id,
      nudge_key: data.nudge_key,
      status,
      reason: data.reason,
      reviewer: profile.email,
    },
  });
  revalidatePath('/admin/discord');
}

export async function retryDiscordJobDeadLetterAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  if (!id) throw new Error('Missing dead letter id.');

  await syncDiscordDurableJobRegistry();
  await retryDiscordDurableDeadLetter({
    deadLetterId: id,
    reviewer: profile.email,
  });
  revalidatePath('/admin/discord');
}

export async function cancelDiscordJobRunAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const runKey = value(formData, 'run_key');
  const reason = value(formData, 'reason');
  if (!runKey) throw new Error('Missing job run key.');

  await cancelDiscordDurableJobRun({
    runKey,
    reviewer: profile.email,
    reason: reason || null,
  });
  revalidatePath('/admin/discord');
}

export async function resolveDiscordJobDeadLetterAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const notes = value(formData, 'notes');
  if (!id) throw new Error('Missing dead letter id.');

  await resolveDiscordDurableDeadLetter({
    deadLetterId: id,
    reviewer: profile.email,
    notes: notes || null,
  });
  revalidatePath('/admin/discord');
}

export async function assignDiscordPremiumReviewAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const assignedTo = value(formData, 'assigned_to') || profile.email;
  if (!id) throw new Error('Missing premium review id.');

  await assignPremiumReviewRequest({
    requestId: id,
    actor: profile.email,
    assignedTo,
    note: 'Assigned from Discord admin cockpit.',
  });
  await recordDiscordEvent({
    eventType: 'premium_review_assigned',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { request_id: id, assigned_to: assignedTo, reviewer: profile.email },
  });
  revalidatePath('/admin/discord');
}

export async function completeDiscordPremiumReviewAction(formData: FormData) {
  const { profile } = await requireAdmin();
  const id = value(formData, 'id');
  const response = value(formData, 'response');
  const judgmentBasis = value(formData, 'judgment_basis');
  if (!id || !response) throw new Error('Missing premium review completion details.');

  const result = await completePremiumReviewRequest({
    requestId: id,
    actor: profile.email,
    response,
    judgmentBasis: judgmentBasis || 'Admin reviewed the submitted artifact and gave implementation-specific judgment based on the member request, quality bar, and current Sage Ideas premium promise.',
    citations: [],
  });
  await recordDiscordEvent({
    eventType: 'premium_review_completed',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { request_id: id, quality_score: result.qualityScore, follow_up_due_at: result.followUpDueAt, reviewer: profile.email },
  });
  revalidatePath('/admin/discord');
}
