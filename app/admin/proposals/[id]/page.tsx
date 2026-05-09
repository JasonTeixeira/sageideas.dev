import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { ProposalAdminActions } from '@/components/admin/proposal-admin-actions';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Proposal' };

type ProposalRow = {
  id: string;
  title: string;
  intro: string | null;
  status: string | null;
  total: number | string | null;
  subtotal: number | string | null;
  discount: number | string | null;
  currency: string | null;
  line_items: unknown;
  expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  acceptance_token: string | null;
  resulting_engagement_id: string | null;
  resulting_invoice_id: string | null;
  notes: string | null;
  organization_id: string | null;
  created_at: string | null;
  organizations: { name: string | null; primary_contact_email: string | null } | null;
};

const STATUS_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral' | 'violet'> = {
  draft: 'neutral',
  sent: 'amber',
  viewed: 'cyan',
  accepted: 'emerald',
  declined: 'rose',
  expired: 'rose',
  withdrawn: 'neutral',
};

type LineItemLike = { name?: unknown; qty?: unknown; unit_price?: unknown };

function readLineItems(raw: unknown): LineItemLike[] {
  return Array.isArray(raw) ? (raw as LineItemLike[]) : [];
}

export default async function AdminProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('proposals')
    .select('*, organizations(name, primary_contact_email)')
    .eq('id', id)
    .maybeSingle();
  const proposal = data as ProposalRow | null;
  if (!proposal) notFound();

  const tone = STATUS_TONE[proposal.status ?? 'draft'] ?? 'neutral';
  const total = Number(proposal.total ?? 0);
  const subtotal = Number(proposal.subtotal ?? 0);
  const discount = Number(proposal.discount ?? 0);
  const currency = (proposal.currency ?? 'USD').toUpperCase();
  const items = readLineItems(proposal.line_items);

  const portalLink =
    proposal.acceptance_token != null
      ? `/portal/proposals/${proposal.id}?token=${proposal.acceptance_token}`
      : null;

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: 'Proposals', href: '/admin/proposals' },
          { label: proposal.title },
        ]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              {proposal.title}
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {proposal.organizations?.name ?? '—'}
              {proposal.organizations?.primary_contact_email
                ? ` · ${proposal.organizations.primary_contact_email}`
                : ''}
            </p>
          </div>
          <Badge tone={tone}>{proposal.status ?? 'draft'}</Badge>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs text-[#a1a1aa]">
              <Meta label="Created" value={formatDate(proposal.created_at) || '—'} />
              <Meta label="Sent" value={formatDate(proposal.sent_at)} />
              <Meta label="Viewed" value={formatDate(proposal.viewed_at)} />
              <Meta label="Accepted" value={formatDate(proposal.accepted_at)} />
              <Meta label="Declined" value={formatDate(proposal.declined_at)} />
              <Meta label="Expires" value={formatDate(proposal.expires_at)} />
            </div>
            {proposal.intro ? (
              <div className="text-sm text-[#d4d4d8] whitespace-pre-wrap border-t border-[#1f1f23] pt-4">
                {proposal.intro}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-medium text-[#fafafa] mb-3">Line items</h2>
            <div className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]">
              {items.length === 0 ? (
                <div className="p-4 text-xs text-[#71717a]">No line items.</div>
              ) : (
                items.map((it, i) => {
                  const qty = Number(it.qty ?? 0);
                  const unit = Number(it.unit_price ?? 0);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                      <div className="col-span-7 text-[#fafafa] truncate">
                        {String(it.name ?? '—')}
                      </div>
                      <div className="col-span-2 text-right tabular-nums text-[#a1a1aa]">
                        {qty}
                      </div>
                      <div className="col-span-3 text-right tabular-nums text-[#fafafa]">
                        {formatCurrency(qty * unit, currency)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 text-sm text-[#a1a1aa] space-y-1">
              <Row label="Subtotal" value={formatCurrency(subtotal, currency)} />
              <Row label="Discount" value={formatCurrency(discount, currency)} />
              <Row
                label="Total"
                value={formatCurrency(total, currency)}
                strong
              />
            </div>
          </CardContent>
        </Card>

        <ProposalAdminActions
          proposalId={proposal.id}
          status={proposal.status ?? 'draft'}
          portalLink={portalLink}
          recipientEmail={proposal.organizations?.primary_contact_email ?? null}
          resultingEngagementId={proposal.resulting_engagement_id}
          resultingInvoiceId={proposal.resulting_invoice_id}
        />

        <div className="text-xs text-[#71717a]">
          <Link href="/admin/proposals">← Back to proposals</Link>
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#52525b]">{label}</div>
      <div className="mt-0.5 text-[#fafafa]">{value || '—'}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${strong ? 'text-base font-semibold pt-1 border-t border-[#1f1f23]' : ''}`}
    >
      <span className={strong ? 'text-[#fafafa]' : ''}>{label}</span>
      <span className="tabular-nums text-[#fafafa]">{value}</span>
    </div>
  );
}
