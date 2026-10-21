import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { flushAiObservability } from '../../lib/ai/observability';
import { handleSageCommand } from '../../lib/discord/sage-commands';
import { normalizeAskSageQuestion } from '../../lib/discord/ask-sage';

const evidenceDir = path.join(process.cwd(), 'docs', 'evidence', 'discord');
const smokeUserId = `ask-sage-smoke-${Date.now()}`;
const question = 'How should a high quality education Discord onboard new members?';
const context = 'Testing the SageBot RAG-backed slash command path.';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} missing`);
  return value;
}

async function main() {
  const sb = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const startedAt = new Date().toISOString();
  const normalizedQuestion = normalizeAskSageQuestion({ question, context });
  let answerId: string | null = null;
  let retrievalLogId: string | null = null;

  try {
    await sb.from('discord_members').upsert({
      discord_user_id: smokeUserId,
      username: 'ask-sage-smoke',
      academy_member: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'discord_user_id' });

    const response = await handleSageCommand({
      type: 2,
      data: {
        name: 'ask-sage',
        options: [
          { name: 'question', value: question },
          { name: 'context', value: context },
        ],
      },
      member: {
        user: { id: smokeUserId, username: 'ask-sage-smoke' },
        roles: [],
      },
      channel_id: 'smoke-channel',
    });

    const answerMatch = String(response.data?.content ?? '').match(/Answer ID: `([^`]+)`/);
    answerId = answerMatch?.[1] ?? null;
    const { data: answerRow } = await sb
      .from('rag_answers')
      .select('id, retrieval_log_id, answer, citations, metadata')
      .eq('question', normalizedQuestion)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    answerId = answerId ?? answerRow?.id ?? null;
    retrievalLogId = answerRow?.retrieval_log_id ?? null;
    const traceId = typeof answerRow?.metadata?.ai_trace_id === 'string' ? answerRow.metadata.ai_trace_id : null;
    const observabilityProvider = typeof answerRow?.metadata?.ai_observability_provider === 'string'
      ? answerRow.metadata.ai_observability_provider
      : null;

    const [{ count: queueCount }, { count: pointsCount }] = await Promise.all([
      sb.from('discord_content_queue').select('*', { count: 'exact', head: true }).eq('discord_user_id', smokeUserId).eq('source', 'ask_sage'),
      sb.from('discord_points_ledger').select('*', { count: 'exact', head: true }).eq('discord_user_id', smokeUserId).eq('source', 'ask_sage'),
    ]);

    const content = String(response.data?.content ?? '');
    const embeds = Array.isArray(response.data?.embeds) ? response.data.embeds : [];
    const answerEmbed = embeds[0] as { title?: string; description?: string; color?: number; fields?: Array<{ name?: string; value?: string }> } | undefined;
    const fieldNames = answerEmbed?.fields?.map((field) => field.name) ?? [];
    const evidence = {
      ok: response.type === 4
        && content.includes('SageBot answered your question')
        && answerEmbed?.title === 'Sprout'
        && answerEmbed.color === 0x50a7ff
        && fieldNames.includes('Here’s the move')
        && fieldNames.includes('Next step')
        && fieldNames.includes('Source check')
        && Boolean(answerId)
        && Boolean(retrievalLogId)
        && Boolean(traceId)
        && Number(queueCount ?? 0) > 0
        && Number(pointsCount ?? 0) > 0,
      responseType: response.type,
      ephemeral: response.data?.flags === 64,
      answerId,
      retrievalLogId,
      traceId,
      observabilityProvider,
      queueCount,
      pointsCount,
      answerPreview: content.slice(0, 500),
      embedPreview: answerEmbed ? {
        title: answerEmbed.title,
        description: answerEmbed.description,
        fields: answerEmbed.fields?.map((field) => ({ name: field.name, valuePreview: String(field.value ?? '').slice(0, 160) })),
      } : null,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    await mkdir(evidenceDir, { recursive: true });
    const evidencePath = path.join(evidenceDir, 'ask-sage-smoke.json');
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
    if (!evidence.ok) process.exitCode = 1;
  } finally {
    await flushAiObservability();
    await sb.from('discord_content_queue').delete().eq('discord_user_id', smokeUserId);
    await sb.from('discord_points_ledger').delete().eq('discord_user_id', smokeUserId);
    await sb.from('discord_events').delete().eq('discord_user_id', smokeUserId);
    await sb.from('discord_member_streaks').delete().eq('discord_user_id', smokeUserId);
    await sb.from('discord_members').delete().eq('discord_user_id', smokeUserId);
    if (answerId) await sb.from('rag_answers').delete().eq('id', answerId);
    if (retrievalLogId) await sb.from('rag_retrieval_logs').delete().eq('id', retrievalLogId);
  }
}

main().catch(async (error) => {
  const evidence = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    finishedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, 'ask-sage-smoke.json');
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  await flushAiObservability();
  console.error(JSON.stringify({ ...evidence, evidencePath }, null, 2));
  process.exit(1);
});
