import { supabaseAdmin } from '@/lib/supabase/server';
import { recordDiscordEvent } from '@/lib/discord/analytics';

export type DiscordDurableJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'dead_lettered'
  | 'requeued'
  | 'skipped';

export type DiscordJobRegistryEntry = {
  jobKey: string;
  jobName: string;
  schedule: string | null;
  owner: string;
  idempotencyScope: string;
  maxRetries: number;
  timeoutSeconds: number;
  retryable: boolean;
  sideEffects: string[];
  metadata?: Record<string, unknown>;
};

export const DISCORD_DURABLE_JOB_REGISTRY: DiscordJobRegistryEntry[] = [
  {
    jobKey: 'daily_draft',
    jobName: 'Daily signal draft',
    schedule: 'daily',
    owner: 'content',
    idempotencyScope: 'calendar_date',
    maxRetries: 2,
    timeoutSeconds: 300,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'daily_publish',
    jobName: 'Daily signal publish',
    schedule: 'daily after approval',
    owner: 'content',
    idempotencyScope: 'approved_draft_id',
    maxRetries: 0,
    timeoutSeconds: 180,
    retryable: false,
    sideEffects: ['discord_message'],
    metadata: { publish_side_effect: true },
  },
  {
    jobKey: 'news_ingestion',
    jobName: 'News-to-action ingestion',
    schedule: 'daily',
    owner: 'content',
    idempotencyScope: 'source_url_hash',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_queue'],
  },
  {
    jobKey: 'quiz_generation',
    jobName: 'Quiz generation',
    schedule: 'daily',
    owner: 'learning',
    idempotencyScope: 'calendar_date_path_level',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_quizzes'],
  },
  {
    jobKey: 'questionnaire_generation',
    jobName: 'Builder questionnaire generation',
    schedule: 'daily',
    owner: 'learning',
    idempotencyScope: 'calendar_date',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'lesson_generation',
    jobName: 'Mini lesson generation',
    schedule: 'daily',
    owner: 'learning',
    idempotencyScope: 'calendar_date_path_level',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'interview_question_generation',
    jobName: 'Interview question generation',
    schedule: 'daily',
    owner: 'learning',
    idempotencyScope: 'calendar_date_path_level',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'challenge_generation',
    jobName: 'Challenge generation',
    schedule: 'daily',
    owner: 'learning',
    idempotencyScope: 'calendar_date_path_level',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_challenges'],
  },
  {
    jobKey: 'weekly_leaderboard',
    jobName: 'Weekly leaderboard snapshot',
    schedule: 'weekly',
    owner: 'learning',
    idempotencyScope: 'iso_week',
    maxRetries: 2,
    timeoutSeconds: 300,
    retryable: true,
    sideEffects: ['discord_leaderboard_snapshots'],
  },
  {
    jobKey: 'weekly_leaderboard_prompt',
    jobName: 'Weekly leaderboard recognition prompt',
    schedule: 'weekly after snapshot',
    owner: 'learning',
    idempotencyScope: 'iso_week',
    maxRetries: 2,
    timeoutSeconds: 300,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'weekly_recap',
    jobName: 'Weekly recap draft',
    schedule: 'weekly',
    owner: 'content',
    idempotencyScope: 'iso_week',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_drafts'],
  },
  {
    jobKey: 'member_intelligence_rebuild',
    jobName: 'Member intelligence rebuild',
    schedule: 'daily',
    owner: 'community',
    idempotencyScope: 'run_window',
    maxRetries: 2,
    timeoutSeconds: 900,
    retryable: true,
    sideEffects: ['discord_member_intelligence_profiles', 'discord_member_nudge_queue'],
  },
  {
    jobKey: 'rag_sync',
    jobName: 'Approved Discord RAG sync',
    schedule: 'after approval or daily',
    owner: 'rag',
    idempotencyScope: 'approved_source_version',
    maxRetries: 2,
    timeoutSeconds: 900,
    retryable: true,
    sideEffects: ['rag_sources', 'rag_documents'],
  },
  {
    jobKey: 'rag_chunk_embed',
    jobName: 'RAG chunk and embed',
    schedule: 'after source sync',
    owner: 'rag',
    idempotencyScope: 'document_hash',
    maxRetries: 2,
    timeoutSeconds: 1200,
    retryable: true,
    sideEffects: ['rag_chunks'],
  },
  {
    jobKey: 'rag_eval',
    jobName: 'RAG eval run',
    schedule: 'daily or on demand',
    owner: 'rag',
    idempotencyScope: 'eval_set_version',
    maxRetries: 1,
    timeoutSeconds: 900,
    retryable: true,
    sideEffects: ['rag_eval_runs', 'rag_eval_results'],
  },
  {
    jobKey: 'content_queue_enrichment',
    jobName: 'Content queue enrichment',
    schedule: 'daily',
    owner: 'content',
    idempotencyScope: 'queue_item_version',
    maxRetries: 2,
    timeoutSeconds: 600,
    retryable: true,
    sideEffects: ['discord_content_queue', 'discord_content_drafts'],
  },
];

export function normalizeDiscordJobKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
}

export function buildDiscordJobRunKey(input: {
  jobKey: string;
  idempotencyKey: string;
  attempt?: number;
}): string {
  const jobKey = normalizeDiscordJobKey(input.jobKey);
  const scope = normalizeDiscordJobKey(input.idempotencyKey);
  const attempt = Math.max(1, Math.round(input.attempt ?? 1));
  return `${jobKey}:${scope}:a${attempt}`;
}

export function calculateDiscordJobBackoffSeconds(attempt: number): number {
  const normalized = Math.max(1, Math.min(10, Math.round(attempt)));
  return Math.min(3600, 60 * (2 ** (normalized - 1)));
}

function registryEntry(jobKey: string): DiscordJobRegistryEntry {
  const entry = DISCORD_DURABLE_JOB_REGISTRY.find((job) => job.jobKey === jobKey);
  if (!entry) throw new Error(`Unknown Discord durable job: ${jobKey}`);
  return entry;
}

export async function syncDiscordDurableJobRegistry() {
  const sb = supabaseAdmin();
  const rows = DISCORD_DURABLE_JOB_REGISTRY.map((job) => ({
    job_key: job.jobKey,
    job_name: job.jobName,
    schedule: job.schedule,
    owner: job.owner,
    idempotency_scope: job.idempotencyScope,
    max_retries: job.maxRetries,
    timeout_seconds: job.timeoutSeconds,
    retryable: job.retryable,
    side_effects: job.sideEffects,
    enabled: true,
    metadata: job.metadata ?? {},
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('discord_job_registry').upsert(rows, { onConflict: 'job_key' });
  if (error) throw new Error(error.message);
  return { synced: rows.length };
}

export async function startDiscordDurableJobRun(input: {
  jobKey: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  now?: Date;
}) {
  await syncDiscordDurableJobRegistry();
  const entry = registryEntry(input.jobKey);
  const now = input.now ?? new Date();
  const runKey = buildDiscordJobRunKey({ jobKey: entry.jobKey, idempotencyKey: input.idempotencyKey, attempt: 1 });
  const startedAt = now.toISOString();
  const payload = {
    run_key: runKey,
    job_key: entry.jobKey,
    status: 'running' as DiscordDurableJobStatus,
    idempotency_key: input.idempotencyKey,
    attempt: 1,
    max_retries: entry.maxRetries,
    started_at: startedAt,
    metadata: input.metadata ?? {},
    updated_at: startedAt,
  };
  const { data: existing, error: existingError } = await supabaseAdmin()
    .from('discord_job_runs')
    .select('run_key, status')
    .eq('job_key', entry.jobKey)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return { runKey: String(existing.run_key), status: String(existing.status), duplicate: true };
  }
  const { error } = await supabaseAdmin().from('discord_job_runs').insert(payload);
  if (error) throw new Error(error.message);
  await recordDiscordEvent({
    eventType: 'durable_job_started',
    commandName: 'discord_durable_job',
    channelBaseName: 'team-ops',
    metadata: { job_key: entry.jobKey, run_key: runKey },
  });
  return { runKey, status: 'running', duplicate: false };
}

export async function completeDiscordDurableJobRun(input: {
  runKey: string;
  metadata?: Record<string, unknown>;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { data: run, error: readError } = await supabaseAdmin()
    .from('discord_job_runs')
    .select('started_at, metadata')
    .eq('run_key', input.runKey)
    .single();
  if (readError) throw new Error(readError.message);
  const finishedAt = now.toISOString();
  const startedAt = run.started_at ? new Date(String(run.started_at)).getTime() : now.getTime();
  const { error } = await supabaseAdmin()
    .from('discord_job_runs')
    .update({
      status: 'succeeded',
      finished_at: finishedAt,
      duration_ms: Math.max(0, now.getTime() - startedAt),
      metadata: { ...(run.metadata as Record<string, unknown> ?? {}), ...(input.metadata ?? {}) },
      updated_at: finishedAt,
    })
    .eq('run_key', input.runKey);
  if (error) throw new Error(error.message);
  return { runKey: input.runKey, status: 'succeeded' as const };
}

export async function failDiscordDurableJobRun(input: {
  runKey: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { data: run, error: readError } = await supabaseAdmin()
    .from('discord_job_runs')
    .select('run_key, job_key, attempt, max_retries, started_at, metadata')
    .eq('run_key', input.runKey)
    .single();
  if (readError) throw new Error(readError.message);
  const entry = registryEntry(String(run.job_key));
  const attempt = Number(run.attempt ?? 1);
  const canRetry = Boolean(input.retryable && entry.retryable && attempt <= Number(run.max_retries ?? 0));
  const finishedAt = now.toISOString();
  const startedAt = run.started_at ? new Date(String(run.started_at)).getTime() : now.getTime();
  const nextRetryAt = canRetry
    ? new Date(now.getTime() + calculateDiscordJobBackoffSeconds(attempt) * 1000).toISOString()
    : null;
  const status: DiscordDurableJobStatus = canRetry ? 'failed' : 'dead_lettered';
  const { error: updateError } = await supabaseAdmin()
    .from('discord_job_runs')
    .update({
      status,
      finished_at: finishedAt,
      duration_ms: Math.max(0, now.getTime() - startedAt),
      next_retry_at: nextRetryAt,
      error_code: input.errorCode,
      error_message: input.errorMessage,
      metadata: { ...(run.metadata as Record<string, unknown> ?? {}), ...(input.metadata ?? {}) },
      updated_at: finishedAt,
    })
    .eq('run_key', input.runKey);
  if (updateError) throw new Error(updateError.message);

  let deadLetterId: string | null = null;
  if (!canRetry) {
    const { data: deadLetter, error: deadLetterError } = await supabaseAdmin()
      .from('discord_job_dead_letters')
      .insert({
        run_key: input.runKey,
        job_key: entry.jobKey,
        reason: input.errorMessage,
        retryable: input.retryable && entry.retryable,
        payload: input.payload ?? {},
        metadata: { error_code: input.errorCode, ...(input.metadata ?? {}) },
      })
      .select('id')
      .single();
    if (deadLetterError) throw new Error(deadLetterError.message);
    deadLetterId = String(deadLetter.id);
  }

  await recordDiscordEvent({
    eventType: deadLetterId ? 'durable_job_dead_lettered' : 'durable_job_failed_retryable',
    commandName: 'discord_durable_job',
    channelBaseName: 'team-ops',
    metadata: {
      job_key: entry.jobKey,
      run_key: input.runKey,
      next_retry_at: nextRetryAt,
      dead_letter_id: deadLetterId,
      error_code: input.errorCode,
    },
  });
  return { runKey: input.runKey, status, nextRetryAt, deadLetterId };
}

export async function retryDiscordDurableDeadLetter(input: {
  deadLetterId: string;
  reviewer: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { data: deadLetter, error } = await supabaseAdmin()
    .from('discord_job_dead_letters')
    .select('id, run_key, job_key, retryable, payload, metadata, resolved_at')
    .eq('id', input.deadLetterId)
    .single();
  if (error) throw new Error(error.message);
  if (deadLetter.resolved_at) throw new Error('Dead letter is already resolved.');
  if (!deadLetter.retryable) throw new Error('Dead letter is not retryable.');
  const retryRunKey = `${deadLetter.run_key}:retry:${now.getTime()}`;
  const { data: originalRun, error: originalError } = await supabaseAdmin()
    .from('discord_job_runs')
    .select('idempotency_key, max_retries')
    .eq('run_key', String(deadLetter.run_key))
    .single();
  if (originalError) throw new Error(originalError.message);
  const { error: insertError } = await supabaseAdmin()
    .from('discord_job_runs')
    .insert({
      run_key: retryRunKey,
      job_key: String(deadLetter.job_key),
      status: 'queued',
      idempotency_key: `${originalRun.idempotency_key}:retry:${now.getTime()}`,
      attempt: 1,
      max_retries: Number(originalRun.max_retries ?? 1),
      metadata: {
        source: 'dead_letter_retry',
        original_run_key: deadLetter.run_key,
        dead_letter_id: deadLetter.id,
        payload: deadLetter.payload ?? {},
      },
      updated_at: now.toISOString(),
    });
  if (insertError) throw new Error(insertError.message);
  const { error: updateError } = await supabaseAdmin()
    .from('discord_job_dead_letters')
    .update({
      resolved_at: now.toISOString(),
      resolved_by: input.reviewer,
      retry_run_key: retryRunKey,
      updated_at: now.toISOString(),
      metadata: { ...(deadLetter.metadata as Record<string, unknown> ?? {}), retry_reviewer: input.reviewer },
    })
    .eq('id', input.deadLetterId);
  if (updateError) throw new Error(updateError.message);
  await recordDiscordEvent({
    eventType: 'durable_job_dead_letter_retry_queued',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { dead_letter_id: input.deadLetterId, retry_run_key: retryRunKey, reviewer: input.reviewer },
  });
  return { retryRunKey };
}

export async function cancelDiscordDurableJobRun(input: {
  runKey: string;
  reviewer: string;
  reason?: string | null;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from('discord_job_runs')
    .update({
      status: 'canceled',
      finished_at: now,
      error_code: 'admin_canceled',
      error_message: input.reason ?? 'Canceled from admin dashboard.',
      metadata: { canceled_by: input.reviewer, cancel_reason: input.reason ?? null },
      updated_at: now,
    })
    .eq('run_key', input.runKey)
    .in('status', ['queued', 'failed']);
  if (error) throw new Error(error.message);
  await recordDiscordEvent({
    eventType: 'durable_job_canceled',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { run_key: input.runKey, reviewer: input.reviewer, reason: input.reason ?? null },
  });
}

export async function resolveDiscordDurableDeadLetter(input: {
  deadLetterId: string;
  reviewer: string;
  notes?: string | null;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from('discord_job_dead_letters')
    .update({
      resolved_at: now,
      resolved_by: input.reviewer,
      admin_notes: input.notes ?? null,
      updated_at: now,
    })
    .eq('id', input.deadLetterId)
    .is('resolved_at', null);
  if (error) throw new Error(error.message);
  await recordDiscordEvent({
    eventType: 'durable_job_dead_letter_resolved',
    commandName: 'admin_dashboard',
    channelBaseName: 'team-ops',
    metadata: { dead_letter_id: input.deadLetterId, reviewer: input.reviewer, notes: input.notes ?? null },
  });
}
