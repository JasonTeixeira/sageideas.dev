import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const patchSchema = z
  .object({
    start_time: z.string().regex(TIME_RE, 'start_time must be HH:MM').optional(),
    end_time: z.string().regex(TIME_RE, 'end_time must be HH:MM').optional(),
    slot_minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!id) return badRequest('Missing id');

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const patch = parsed.data;

  const sb = supabaseAdmin();
  const { data: prev, error: fetchErr } = await sb
    .from('studio_availability')
    .select('id, weekday, start_time, end_time, slot_minutes, is_active, timezone')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return serverError(fetchErr.message);
  if (!prev) return notFound('Availability rule not found');

  const merged = {
    start_time: patch.start_time ?? (prev.start_time as string).slice(0, 5),
    end_time: patch.end_time ?? (prev.end_time as string).slice(0, 5),
  };
  if (merged.start_time >= merged.end_time) {
    return badRequest('start_time must be before end_time');
  }

  const { data, error } = await sb
    .from('studio_availability')
    .update(patch)
    .eq('id', id)
    .select('id, weekday, start_time, end_time, slot_minutes, is_active, timezone')
    .maybeSingle();
  if (error) return serverError(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'studio_availability.update',
    entityType: 'studio_availability',
    entityId: id,
    before: prev,
    after: data,
  });

  return NextResponse.json(data);
}
