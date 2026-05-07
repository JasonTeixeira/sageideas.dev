import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError } from '@/lib/api-errors';

const eventTypeSchema = z.enum([
  'meeting',
  'milestone',
  'deadline',
  'internal',
  'client_call',
  'review',
  'other',
]);

const patchSchema = z
  .object({
    title: z.string().min(1).max(300),
    description: z.string().max(5_000).nullable(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    all_day: z.boolean(),
    event_type: eventTypeSchema,
    location: z.string().max(300).nullable(),
    engagement_id: z.string().uuid().nullable(),
    visible_to_client: z.boolean(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided.',
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const sb = supabaseAdmin();
  const { data: prev } = await sb.from('calendar_events').select('*').eq('id', id).maybeSingle();
  const { data, error } = await sb
    .from('calendar_events')
    .update(parsed.data)
    .eq('id', id)
    .select(
      'id, title, description, starts_at, ends_at, event_type, location, all_day, engagement_id, visible_to_client',
    )
    .maybeSingle();
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'calendar_event.update',
    entityType: 'calendar_event',
    entityId: id,
    before: prev,
    after: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const sb = supabaseAdmin();
  const { data: prev } = await sb.from('calendar_events').select('*').eq('id', id).maybeSingle();
  const { error } = await sb.from('calendar_events').delete().eq('id', id);
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'calendar_event.delete',
    entityType: 'calendar_event',
    entityId: id,
    before: prev,
  });

  return NextResponse.json({ ok: true });
}
