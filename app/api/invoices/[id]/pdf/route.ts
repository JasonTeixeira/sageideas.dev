import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { InvoicePDF, type InvoiceLineItem } from '@/components/pdf/InvoicePDF';
import { renderPdfBuffer, pdfResponse } from '@/lib/pdf-render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const portal = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: invoice } = await sb
    .from('invoices')
    .select(
      'id, number, status, organization_id, amount_due, amount_paid, currency, due_date, paid_at, created_at, subtotal, tax, total, notes, sent_at, organizations(id, name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!portal.isAdmin && invoice.organization_id !== portal.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: lineItemsData } = await sb
    .from('invoice_line_items')
    .select('description, quantity, unit_price, amount, position')
    .eq('invoice_id', invoice.id)
    .order('position', { ascending: true });

  const lineItems: InvoiceLineItem[] = (lineItemsData ?? []).map((li) => ({
    description: li.description,
    quantity: Number(li.quantity ?? 1),
    unit_price: Number(li.unit_price ?? 0),
    amount: Number(li.amount ?? 0),
  }));

  const orgName =
    (invoice.organizations as unknown as { name?: string } | null)?.name ??
    'Client';

  const total =
    typeof invoice.total === 'number'
      ? invoice.total
      : typeof invoice.amount_due === 'number'
        ? invoice.amount_due
        : null;

  const buf = await renderPdfBuffer(
    InvoicePDF({
      number: invoice.number ?? `INV-${invoice.id.slice(0, 8)}`,
      status: invoice.status ?? null,
      invoiceDate: invoice.sent_at ?? invoice.created_at ?? null,
      dueDate: invoice.due_date ?? null,
      paidAt: invoice.paid_at ?? null,
      billTo: { name: orgName },
      lineItems,
      subtotal:
        typeof invoice.subtotal === 'number' ? invoice.subtotal : total,
      tax: typeof invoice.tax === 'number' ? invoice.tax : 0,
      total,
      amountPaid:
        typeof invoice.amount_paid === 'number' ? invoice.amount_paid : null,
      currency: invoice.currency ?? 'usd',
      notes: invoice.notes ?? null,
    }),
  );

  return pdfResponse(
    buf,
    `Invoice-${invoice.number ?? invoice.id.slice(0, 8)}.pdf`,
  );
}
