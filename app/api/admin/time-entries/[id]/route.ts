import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    ended_at?: string | null;
    started_at?: string;
    description?: string | null;
    billable?: boolean;
    engagement_id?: string | null;
    task_id?: string | null;
    rate?: number | null;
    duration_minutes?: number | null;
  } | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('time_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!prev) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.description !== undefined) update.description = body.description;
  if (body.billable !== undefined) update.billable = body.billable;
  if (body.engagement_id !== undefined) update.engagement_id = body.engagement_id;
  if (body.task_id !== undefined) update.task_id = body.task_id;
  if (body.rate !== undefined) update.rate = body.rate;

  const startedAt = body.started_at ? new Date(body.started_at) : new Date(prev.started_at);
  if (body.started_at) update.started_at = startedAt.toISOString();

  if (body.ended_at !== undefined) {
    if (body.ended_at === null) {
      update.ended_at = null;
      update.duration_minutes = null;
    } else {
      const endedAt = new Date(body.ended_at);
      if (Number.isNaN(endedAt.getTime())) {
        return NextResponse.json({ error: 'invalid_ended_at' }, { status: 400 });
      }
      update.ended_at = endedAt.toISOString();
      update.duration_minutes = Math.max(
        0,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
      );
    }
  } else if (body.duration_minutes !== undefined) {
    update.duration_minutes = body.duration_minutes;
  }

  const { data, error } = await sb
    .from('time_entries')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'time_entry.update',
    entityType: 'time_entry',
    entityId: id,
    before: prev,
    after: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const sb = supabaseAdmin();
  const { data: prev } = await sb.from('time_entries').select('*').eq('id', id).maybeSingle();
  const { error } = await sb.from('time_entries').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'time_entry.delete',
    entityType: 'time_entry',
    entityId: id,
    before: prev,
  });

  return NextResponse.json({ ok: true });
}
