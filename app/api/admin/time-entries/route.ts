import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  const engagementId = url.searchParams.get('engagement_id');
  const billable = url.searchParams.get('billable');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const sb = supabaseAdmin();
  let q = sb
    .from('time_entries')
    .select(
      'id, user_id, engagement_id, task_id, description, started_at, ended_at, duration_minutes, billable, rate, created_at',
    )
    .order('started_at', { ascending: false })
    .limit(500);

  if (userId) q = q.eq('user_id', userId);
  if (engagementId) q = q.eq('engagement_id', engagementId);
  if (billable === 'true') q = q.eq('billable', true);
  if (billable === 'false') q = q.eq('billable', false);
  if (from) q = q.gte('started_at', from);
  if (to) q = q.lte('started_at', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => null)) as {
    user_id?: string;
    engagement_id?: string | null;
    task_id?: string | null;
    description?: string | null;
    started_at?: string;
    ended_at?: string | null;
    duration_minutes?: number | null;
    billable?: boolean;
    rate?: number | null;
  } | null;

  if (!body || !body.started_at) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const userId = body.user_id || guard.userId;
  const startedAt = new Date(body.started_at);
  if (Number.isNaN(startedAt.getTime())) {
    return NextResponse.json({ error: 'invalid_started_at' }, { status: 400 });
  }

  let endedAt: Date | null = null;
  let duration = body.duration_minutes ?? null;
  if (body.ended_at) {
    endedAt = new Date(body.ended_at);
    if (Number.isNaN(endedAt.getTime())) {
      return NextResponse.json({ error: 'invalid_ended_at' }, { status: 400 });
    }
    duration = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
  } else if (duration && duration > 0) {
    endedAt = new Date(startedAt.getTime() + duration * 60000);
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('time_entries')
    .insert({
      user_id: userId,
      engagement_id: body.engagement_id ?? null,
      task_id: body.task_id ?? null,
      description: body.description ?? null,
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      duration_minutes: duration,
      billable: body.billable ?? true,
      rate: body.rate ?? null,
    })
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'time_entry.create',
    entityType: 'time_entry',
    entityId: data?.id ?? null,
    after: data,
  });

  return NextResponse.json(data);
}
