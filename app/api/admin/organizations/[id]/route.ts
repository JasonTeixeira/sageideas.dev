import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

const ALLOWED = new Set([
  'pipeline_stage',
  'annual_value',
  'notes',
  'owner_id',
  'show_time_tracking',
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k)) update[k] = body[k];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: prev } = await sb.from('organizations').select('*').eq('id', id).maybeSingle();
  const { data, error } = await sb
    .from('organizations')
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'organization.update',
    entityType: 'organization',
    entityId: id,
    before: prev,
    after: data,
  });

  return NextResponse.json(data);
}
