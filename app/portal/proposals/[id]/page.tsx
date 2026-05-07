import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { ProposalAcceptForm } from '@/components/portal/proposal-accept-form';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
  acceptance_token_expires: string | null;
  acceptance_signature_name: string | null;
  resulting_engagement_id: string | null;
  organization_id: string | null;
};

type LineItemLike = { name?: unknown; qty?: unknown; unit_price?: unknown };
function readLineItems(raw: unknown): LineItemLike[] {
  return Array.isArray(raw) ? (raw as LineItemLike[]) : [];
}

function ErrorPanel({
  heading,
  message,
  testId,
  diag,
}: {
  heading: string;
  message: string;
  testId?: string;
  diag?: string;
}) {
  return (
    <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto" data-testid={testId} data-diag={diag}>
      <Card>
        <CardContent className="p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-base font-semibold text-[#fafafa] mb-1">{heading}</h2>
          <p className="text-sm text-[#a1a1aa] mb-6 max-w-md mx-auto">{message}</p>
          <Link href="/portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to portal
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PortalProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  const proposal = data as ProposalRow | null;

  const crumbs = [
    { label: 'Dashboard', href: '/portal' },
    { label: 'Proposals' },
  ];

  if (!proposal) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Proposal not found"
          message="This proposal is unavailable or has been withdrawn."
          testId="proposal-error"
        />
      </>
    );
  }

  if (!ctx.isAdmin && proposal.organization_id !== ctx.organizationId) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Access denied"
          message="You do not have access to this proposal."
          testId="proposal-error"
        />
      </>
    );
  }

  const tokenFromQuery = typeof sp.token === 'string' ? sp.token : null;

  // Already accepted view (with success indicator if we just signed).
  if (proposal.status === 'accepted') {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto" data-testid="proposal-success">
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 mx-auto flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
              </div>
              <h2 className="text-base font-semibold text-[#fafafa] mb-1">
                Proposal accepted
              </h2>
              <p className="text-sm text-[#a1a1aa] mb-1">
                Signed {proposal.accepted_at ? formatDate(proposal.accepted_at) : ''}
                {proposal.acceptance_signature_name
                  ? ` by ${proposal.acceptance_signature_name}`
                  : ''}.
              </p>
              {proposal.resulting_engagement_id ? (
                <Link href={`/portal/projects/${proposal.resulting_engagement_id}`}>
                  <Button size="sm" className="mt-4">
                    Open your project →
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (
    proposal.status === 'declined' ||
    proposal.status === 'expired' ||
    proposal.status === 'withdrawn'
  ) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading={
            proposal.status === 'declined'
              ? 'Proposal declined'
              : proposal.status === 'expired'
                ? 'Proposal expired'
                : 'Proposal withdrawn'
          }
          message="If this is unexpected, contact sage@sageideas.dev."
          testId="proposal-error"
        />
      </>
    );
  }

  // Token validity check (admins bypass when reviewing their own org).
  const hasValidToken =
    proposal.acceptance_token != null &&
    proposal.acceptance_token === tokenFromQuery &&
    !!proposal.acceptance_token_expires &&
    new Date(proposal.acceptance_token_expires).getTime() > Date.now();
  if (!ctx.isAdmin && !hasValidToken) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Acceptance link invalid"
          message="This acceptance link is missing, expired, or has already been used."
          testId="proposal-error"
        />
      </>
    );
  }

  // First-time view — flip status to 'viewed' (only when transitioning from sent).
  // Awaited so any error surfaces in logs rather than as an uncaught rejection.
  if (proposal.status === 'sent') {
    try {
      await sb
        .from('proposals')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', proposal.id);
    } catch (err) {
      console.warn('[proposal] view-transition update failed', err);
    }
  }

  const total = Number(proposal.total ?? 0);
  const subtotal = Number(proposal.subtotal ?? 0);
  const discount = Number(proposal.discount ?? 0);
  const currency = (proposal.currency ?? 'USD').toUpperCase();
  const items = readLineItems(proposal.line_items);

  return (
    <>
      <Topbar crumbs={crumbs} />
      <div
        className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6"
        data-testid="proposal-view-page"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              {proposal.title}
            </h1>
            {proposal.expires_at ? (
              <p className="text-xs text-[#a1a1aa] mt-1">
                Expires {formatDate(proposal.expires_at)}
              </p>
            ) : null}
          </div>
          <Badge tone={proposal.status === 'viewed' ? 'cyan' : 'amber'}>
            {proposal.status ?? 'sent'}
          </Badge>
        </div>

        {proposal.intro ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-[#d4d4d8] whitespace-pre-wrap leading-relaxed">
                {proposal.intro}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-medium text-[#fafafa] mb-3">Scope &amp; pricing</h2>
            <div
              className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]"
              data-testid="proposal-line-items-table"
            >
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
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#fafafa]">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="tabular-nums text-[#fafafa]">
                  {formatCurrency(discount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-[#1f1f23]">
                <span className="text-[#fafafa]">Total</span>
                <span
                  className="tabular-nums text-[#fafafa]"
                  data-testid="proposal-total"
                >
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <ProposalAcceptForm
              proposalId={proposal.id}
              token={tokenFromQuery ?? ''}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
