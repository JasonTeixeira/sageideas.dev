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

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5_000).optional().nullable(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  all_day: z.boolean().optional(),
  event_type: eventTypeSchema.optional().default('meeting'),
  location: z.string().max(300).optional().nullable(),
  engagement_id: z.string().uuid().optional().nullable(),
  visible_to_client: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;

  const insert = {
    title: body.title.trim(),
    description: body.description ?? null,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    all_day: body.all_day ?? false,
    event_type: body.event_type,
    location: body.location ?? null,
    engagement_id: body.engagement_id ?? null,
    visible_to_client: body.visible_to_client,
    owner_id: guard.userId,
  };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('calendar_events')
    .insert(insert)
    .select(
      'id, title, description, starts_at, ends_at, event_type, location, all_day, engagement_id, visible_to_client',
    )
    .maybeSingle();
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'calendar_event.create',
    entityType: 'calendar_event',
    entityId: data?.id ?? null,
    after: data,
  });

  return NextResponse.json(data);
}
