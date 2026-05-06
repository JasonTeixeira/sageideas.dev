import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyInvoiceSent } from '@/lib/email/orchestrator';

const LineItem = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  unit_price: z.coerce.number().nonnegative().default(0),
});

const Body = z
  .object({
    organization_id: z.string().uuid().optional().nullable(),
    engagement_id: z.string().uuid().optional().nullable(),
    number: z.string().trim().max(64).optional().nullable(),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    tax_pct: z.coerce.number().nonnegative().default(0).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    line_items: z.array(LineItem).min(1, 'Add at least one line item'),
    send_now: z.boolean().optional().default(false),
  })
  .refine((b) => b.organization_id || b.engagement_id, {
    message: 'Pick an organization or engagement',
    path: ['organization_id'],
  });

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const sb = supabaseAdmin();

  let organizationId = body.organization_id ?? null;
  if (!organizationId && body.engagement_id) {
    const { data: eng } = await sb
      .from('engagements')
      .select('organization_id')
      .eq('id', body.engagement_id)
      .maybeSingle();
    organizationId = (eng?.organization_id as string | null) ?? null;
  }

  const subtotal = body.line_items.reduce(
    (s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
    0,
  );
  const taxPct = Number(body.tax_pct ?? 0);
  const tax = subtotal * (taxPct / 100);
  const total = subtotal + tax;

  const insert: Record<string, unknown> = {
    engagement_id: body.engagement_id ?? null,
    organization_id: organizationId,
    number: body.number ?? null,
    status: body.send_now ? 'sent' : 'draft',
    amount: subtotal,
    subtotal,
    tax,
    total,
    due_date: body.due_date ?? null,
    notes: body.notes ?? null,
  };
  if (body.send_now) insert.sent_at = new Date().toISOString();

  const { data: inv, error: invErr } = await sb
    .from('invoices')
    .insert(insert)
    .select('id, number')
    .maybeSingle();
  if (invErr || !inv) {
    return NextResponse.json({ error: invErr?.message ?? 'insert_failed' }, { status: 400 });
  }

  const lineRows = body.line_items.map((it, i) => ({
    invoice_id: inv.id,
    description: it.description,
    quantity: Number(it.quantity ?? 1),
    unit_price: Number(it.unit_price ?? 0),
    amount: Number(it.quantity ?? 1) * Number(it.unit_price ?? 0),
    position: i,
  }));

  const { error: liErr } = await sb.from('invoice_line_items').insert(lineRows);
  if (liErr) {
    await sb.from('invoices').delete().eq('id', inv.id);
    return NextResponse.json({ error: liErr.message }, { status: 400 });
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.create',
    entityType: 'invoice',
    entityId: inv.id,
    after: { ...insert, line_items: lineRows },
  });

  let emailStatus: 'skipped' | 'sent' | 'no_recipients' | 'error' = 'skipped';
  if (body.send_now) {
    try {
      const result = await notifyInvoiceSent(inv.id);
      if (result.ok) emailStatus = 'sent';
      else emailStatus = result.reason === 'no_recipients' ? 'no_recipients' : 'error';
    } catch {
      emailStatus = 'error';
    }
  }

  return NextResponse.json({ id: inv.id, number: inv.number, email: emailStatus });
}
