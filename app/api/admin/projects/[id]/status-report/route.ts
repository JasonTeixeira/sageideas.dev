import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Body = {
  visible_to_client?: boolean;
  custom_note?: string;
};

type DeliverableRow = {
  id: string;
  title: string;
  status: string;
  approved_at: string | null;
  updated_at: string | null;
};

type MilestoneRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  reached_at: string | null;
};

type TaskRow = {
  id: string;
  status: string;
  completed_at: string | null;
  updated_at?: string | null;
};

type TimeRow = { duration_minutes: number | null };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id: engagementId } = await params;

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  const visibleToClient = body.visible_to_client === true;
  const customNote = typeof body.custom_note === 'string' ? body.custom_note.trim() : '';

  const sb = supabaseAdmin();

  const { data: eng, error: engErr } = await sb
    .from('engagements')
    .select('id, title, status_report_last_sent_at, created_at, organizations(name)')
    .eq('id', engagementId)
    .maybeSingle();

  if (engErr || !eng) {
    return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 });
  }

  const periodStart = new Date(eng.status_report_last_sent_at ?? eng.created_at);
  const periodEnd = new Date();
  const periodStartIso = periodStart.toISOString();
  const periodEndIso = periodEnd.toISOString();

  const [{ data: deliverables }, { data: milestones }, { data: tasks }, { data: time }, { data: messages }] =
    await Promise.all([
      sb
        .from('deliverables')
        .select('id, title, status, approved_at, updated_at')
        .eq('engagement_id', engagementId),
      sb
        .from('project_milestones')
        .select('id, title, due_date, status, reached_at')
        .eq('engagement_id', engagementId),
      sb
        .from('tasks')
        .select('id, status, completed_at, updated_at')
        .eq('engagement_id', engagementId),
      sb
        .from('time_entries')
        .select('duration_minutes')
        .eq('engagement_id', engagementId)
        .gte('started_at', periodStartIso)
        .lt('started_at', periodEndIso),
      sb
        .from('threads')
        .select('id, messages(id, created_at)')
        .eq('engagement_id', engagementId),
    ]);

  const deliv = (deliverables ?? []) as DeliverableRow[];
  const mile = (milestones ?? []) as MilestoneRow[];
  const tsks = (tasks ?? []) as TaskRow[];
  const timeRows = (time ?? []) as TimeRow[];

  // Deliverable counts by status
  const delivCounts: Record<string, number> = {};
  for (const d of deliv) {
    delivCounts[d.status] = (delivCounts[d.status] ?? 0) + 1;
  }
  const recentlyApproved = deliv
    .filter((d) => d.status === 'approved' && d.approved_at && new Date(d.approved_at) >= periodStart)
    .sort((a, b) => (b.approved_at! > a.approved_at! ? 1 : -1))
    .slice(0, 5);

  // Milestones
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = mile
    .filter((m) => m.status !== 'complete' && m.due_date && m.due_date >= todayIso)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 3);
  const completedSince = mile.filter(
    (m) => m.status === 'complete' && m.reached_at && new Date(m.reached_at) >= periodStart,
  );

  // Tasks
  const openTasks = tsks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
  const closedSince = tsks.filter(
    (t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= periodStart,
  ).length;

  // Hours
  const totalMins = timeRows.reduce((s, r) => s + Number(r.duration_minutes ?? 0), 0);
  const hours = totalMins / 60;

  // Messages count
  type ThreadRow = { messages: { id: string; created_at: string }[] | null };
  let recentMessages = 0;
  for (const t of (messages ?? []) as unknown as ThreadRow[]) {
    for (const m of t.messages ?? []) {
      if (new Date(m.created_at) >= periodStart) recentMessages += 1;
    }
  }

  // Compose markdown
  const lines: string[] = [];
  type EngWithOrg = { title: string; organizations: { name: string | null } | null };
  const engRow = eng as unknown as EngWithOrg;
  const orgName = engRow.organizations?.name ?? null;
  lines.push(`# Status report — ${engRow.title}`);
  if (orgName) lines.push(`_${orgName}_`);
  lines.push('');
  lines.push(
    `**Period:** ${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)}`,
  );
  lines.push('');

  lines.push('## Deliverables');
  const orderedStatuses = ['draft', 'submitted', 'review', 'revisions', 'approved'];
  const delivLine = orderedStatuses
    .filter((s) => delivCounts[s])
    .map((s) => `${delivCounts[s]} ${s}`)
    .join(' · ');
  lines.push(delivLine || 'No deliverables yet.');
  if (recentlyApproved.length > 0) {
    lines.push('');
    lines.push('**Recently approved:**');
    for (const d of recentlyApproved) lines.push(`- ${d.title}`);
  }
  lines.push('');

  lines.push('## Milestones');
  if (upcoming.length === 0) {
    lines.push('No upcoming milestones.');
  } else {
    lines.push('**Upcoming:**');
    for (const m of upcoming) lines.push(`- ${m.title} — due ${m.due_date}`);
  }
  if (completedSince.length > 0) {
    lines.push('');
    lines.push('**Completed this period:**');
    for (const m of completedSince) lines.push(`- ${m.title}`);
  }
  lines.push('');

  lines.push('## Tasks');
  lines.push(`${openTasks} open · ${closedSince} closed this period.`);
  lines.push('');

  lines.push('## Hours logged');
  lines.push(`${hours.toFixed(1)}h logged this period.`);
  lines.push('');

  lines.push('## Activity');
  lines.push(`${recentMessages} message${recentMessages === 1 ? '' : 's'} exchanged this period.`);

  if (customNote) {
    lines.push('');
    lines.push('## Notes');
    lines.push(customNote);
  }

  const md = lines.join('\n');

  const { data: inserted, error: insErr } = await sb
    .from('project_status_updates')
    .insert({
      engagement_id: engagementId,
      body: md,
      summary: `Auto status report — ${periodStart.toISOString().slice(0, 10)} → ${periodEnd
        .toISOString()
        .slice(0, 10)}`,
      period_start: periodStartIso,
      period_end: periodEndIso,
      visible_to_client: visibleToClient,
      generated_by_ai: false,
      created_by: guard.userId,
      author_id: guard.userId,
    })
    .select('id, engagement_id, body, period_start, period_end, visible_to_client, created_at')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insErr?.message },
      { status: 500 },
    );
  }

  await sb
    .from('engagements')
    .update({ status_report_last_sent_at: periodEndIso })
    .eq('id', engagementId);

  return NextResponse.json({ ok: true, report: inserted });
}
