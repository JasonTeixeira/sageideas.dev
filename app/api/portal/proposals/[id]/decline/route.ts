import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, forbidden, fromZodError, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().min(32).max(128),
  reason: z.string().max(2000).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { token, reason } = parsed.data;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('proposals')
    .select('id, organization_id, status, acceptance_token, notes')
    .eq('id', id)
    .maybeSingle();
  if (!data) return notFound('Proposal not found');
  if (!ctx.isAdmin && data.organization_id !== ctx.organizationId) return forbidden();
  if (data.acceptance_token !== token) return badRequest('Invalid token');
  if (data.status !== 'sent' && data.status !== 'viewed') {
    return NextResponse.json(
      { error: 'not_actionable', status: data.status },
      { status: 409 },
    );
  }

  const newNotes = reason
    ? `${data.notes ? `${data.notes}\n\n` : ''}--- Declined by client ---\n${reason}`
    : data.notes;

  const { error } = await sb
    .from('proposals')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      notes: newNotes,
    })
    .eq('id', id);
  if (error) return serverError(error.message);

  try {
    await sb.from('audit_log').insert({
      action: 'proposal.declined',
      entity_type: 'proposal',
      entity_id: id,
      organization_id: data.organization_id,
      actor_id: ctx.user.id,
      after: { reason: reason ?? null },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true });
}
