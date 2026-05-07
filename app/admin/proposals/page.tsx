import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { Plus, FileSignature } from 'lucide-react';
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
  organization_id: string | null;
  organizations: { name: string | null } | null;
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

export default async function AdminProposalsPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('proposals')
    .select(
      'id, title, status, total, currency, expires_at, accepted_at, sent_at, created_at, organization_id, organizations(name)',
    )
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as ProposalRow[];

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Proposals' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div
        className="px-6 lg:px-8 py-8 max-w-6xl mx-auto"
        data-testid="admin-proposals-list"
      >
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              Proposals
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Drafts, sent offers, and accepted contracts. Sales pipeline lives here.
            </p>
          </div>
          <Link href="/admin/proposals/new">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> New proposal
            </Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <FileSignature className="w-7 h-7 text-[#52525b] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#fafafa]">No proposals yet</h3>
              <p className="text-xs text-[#71717a] mt-1">
                Create one to send a priced offer to a prospect.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
              <div className="md:col-span-4">Title</div>
              <div className="md:col-span-3">Org</div>
              <div className="md:col-span-1 text-right">Total</div>
              <div className="md:col-span-2">Status</div>
              <div className="md:col-span-2">Expires</div>
            </div>
            {rows.map((p) => {
              const total = Number(p.total ?? 0);
              const currency = (p.currency ?? 'USD').toUpperCase();
              const tone = STATUS_TONE[p.status ?? 'draft'] ?? 'neutral';
              return (
                <Link
                  key={p.id}
                  href={`/admin/proposals/${p.id}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-[#131316]"
                >
                  <div className="md:col-span-4 min-w-0">
                    <div className="text-sm font-medium text-[#fafafa] truncate">
                      {p.title}
                    </div>
                    <div className="md:hidden text-[10px] text-[#71717a] mt-0.5">
                      {p.organizations?.name ?? '—'}
                    </div>
                  </div>
                  <div className="md:col-span-3 hidden md:block text-xs text-[#a1a1aa] truncate">
                    {p.organizations?.name ?? '—'}
                  </div>
                  <div className="md:col-span-1 text-xs text-[#a1a1aa] tabular-nums text-right">
                    {formatCurrency(total, currency)}
                  </div>
                  <div className="md:col-span-2">
                    <Badge tone={tone}>{p.status ?? 'draft'}</Badge>
                  </div>
                  <div className="md:col-span-2 text-xs text-[#71717a]">
                    {p.accepted_at
                      ? `Accepted ${formatDate(p.accepted_at)}`
                      : p.expires_at
                        ? formatDate(p.expires_at)
                        : '—'}
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
