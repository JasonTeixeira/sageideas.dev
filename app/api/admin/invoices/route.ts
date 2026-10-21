import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyInvoiceSent } from '@/lib/email/orchestrator';
import { assertSupabaseSuccess } from '@/lib/billing/integrity';

const LineItem = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive().max(100_000).default(1),
  unit_price: z.coerce.number().nonnegative().max(1_000_000).default(0),
});

const Body = z
  .object({
    organization_id: z.string().uuid().optional().nullable(),
    engagement_id: z.string().uuid().optional().nullable(),
    number: z.string().trim().max(64).optional().nullable(),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    tax_pct: z.coerce.number().min(0).max(100).default(0).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    line_items: z.array(LineItem).min(1, 'Add at least one line item').max(100),
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

  let inv: { id: string; number: string | null; status: string; total: number };
  try {
    const result = await sb.rpc('create_invoice_with_line_items', {
      p_organization_id: body.organization_id ?? null,
      p_engagement_id: body.engagement_id ?? null,
      p_number: body.number ?? null,
      p_issue_date: body.issue_date ?? null,
      p_due_date: body.due_date ?? null,
      p_tax_pct: body.tax_pct ?? 0,
      p_notes: body.notes ?? null,
      p_send_now: body.send_now,
      p_line_items: body.line_items,
    });
    const data = assertSupabaseSuccess(result, 'transactional invoice creation');
    if (!data || typeof data !== 'object' || !('id' in data)) {
      throw new Error('transactional invoice creation returned no invoice');
    }
    inv = data as typeof inv;
  } catch (error) {
    console.error('[admin/invoices] create', error);
    return NextResponse.json({ error: 'Unable to create invoice' }, { status: 400 });
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.create',
    entityType: 'invoice',
    entityId: inv.id,
    after: { ...inv, line_items: body.line_items },
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
