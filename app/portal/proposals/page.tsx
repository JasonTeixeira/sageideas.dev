import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { FileSignature } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Proposals' };

type ProposalRow = {
  id: string;
  title: string;
  status: string | null;
  total: number | string | null;
  currency: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  sent_at: string | null;
  created_at: string;
  acceptance_token: string | null;
};

const STATUS_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral'> = {
  draft: 'neutral',
  sent: 'amber',
  viewed: 'cyan',
  accepted: 'emerald',
  declined: 'rose',
  expired: 'rose',
  withdrawn: 'neutral',
};

export default async function PortalProposalsListPage() {
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const proposals = ctx.organizationId
    ? (
        await sb
          .from('proposals')
          .select(
            'id, title, status, total, currency, expires_at, accepted_at, sent_at, created_at, acceptance_token',
          )
          .eq('organization_id', ctx.organizationId)
          // Hide drafts from clients — drafts are still being authored.
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
      ).data ?? []
    : [];
  const rows = proposals as ProposalRow[];

  return (
    <>
      <Topbar crumbs={[{ label: 'Proposals' }]} />
      <div
        className="px-6 lg:px-8 py-8 max-w-5xl mx-auto"
        data-testid="portal-proposals-list"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Proposals
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Sage&apos;s priced offers for your organization.
          </p>
        </header>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <FileSignature className="w-7 h-7 text-[#52525b] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#fafafa]">No proposals yet</h3>
              <p className="text-xs text-[#71717a] mt-1">
                When Sage sends a proposal, it&apos;ll show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
              <div className="md:col-span-5">Title</div>
              <div className="md:col-span-2 text-right">Total</div>
              <div className="md:col-span-2">Status</div>
              <div className="md:col-span-3">Sent / Expires</div>
            </div>
            {rows.map((p) => {
              const total = Number(p.total ?? 0);
              const currency = (p.currency ?? 'USD').toUpperCase();
              const tone = STATUS_TONE[p.status ?? 'sent'] ?? 'neutral';
              const href = p.acceptance_token
                ? `/portal/proposals/${p.id}?token=${encodeURIComponent(p.acceptance_token)}`
                : `/portal/proposals/${p.id}`;
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-[#131316]"
                  data-testid="portal-proposal-row"
                >
                  <div className="md:col-span-5 min-w-0">
                    <div className="text-sm font-medium text-[#fafafa] truncate">
                      {p.title}
                    </div>
                  </div>
                  <div className="md:col-span-2 text-xs text-[#a1a1aa] tabular-nums text-right">
                    {formatCurrency(total, currency)}
                  </div>
                  <div className="md:col-span-2">
                    <Badge tone={tone}>{p.status ?? 'sent'}</Badge>
                  </div>
                  <div className="md:col-span-3 text-xs text-[#71717a]">
                    {p.accepted_at
                      ? `Accepted ${formatDate(p.accepted_at)}`
                      : p.expires_at
                        ? `Expires ${formatDate(p.expires_at)}`
                        : p.sent_at
                          ? `Sent ${formatDate(p.sent_at)}`
                          : formatDate(p.created_at)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
