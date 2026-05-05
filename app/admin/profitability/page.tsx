import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { formatCurrency } from '@/lib/utils';
import {
  ProfitabilityTable,
  type ProfitabilityRow,
} from '@/components/admin/profitability-table';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profitability' };

type EngagementRow = {
  id: string;
  title: string;
  owner_id: string | null;
  pipeline_stage: string | null;
  contract_value: number | null;
  organizations: { name: string | null } | null;
};

type TimeAgg = { engagement_id: string | null; duration_minutes: number | null };
type InvoiceRow = { id: string; engagement_id: string | null };
type PaymentRow = { invoice_id: string | null; amount: number | null; status: string | null };

export default async function ProfitabilityPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const [{ data: engsData }, { data: profsData }, { data: timeData }, { data: invData }, { data: payData }, { data: settingsData }] =
    await Promise.all([
      sb
        .from('engagements')
        .select('id, title, owner_id, pipeline_stage, contract_value, organizations(name)')
        .order('updated_at', { ascending: false }),
      sb.from('profiles').select('id, full_name, email, app_role'),
      sb.from('time_entries').select('engagement_id, duration_minutes'),
      sb.from('invoices').select('id, engagement_id'),
      sb.from('payments').select('invoice_id, amount, status'),
      sb.from('studio_settings').select('default_blended_rate').limit(1).maybeSingle(),
    ]);

  const blendedRate = Number(settingsData?.default_blended_rate ?? 150);

  const ownerMap = new Map<string, string>();
  for (const p of profsData ?? []) {
    ownerMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8));
  }

  const minsByEng = new Map<string, number>();
  for (const t of (timeData ?? []) as TimeAgg[]) {
    if (!t.engagement_id) continue;
    minsByEng.set(t.engagement_id, (minsByEng.get(t.engagement_id) ?? 0) + (t.duration_minutes ?? 0));
  }

  const invToEng = new Map<string, string>();
  for (const i of (invData ?? []) as InvoiceRow[]) {
    if (i.engagement_id) invToEng.set(i.id, i.engagement_id);
  }

  const revByEng = new Map<string, number>();
  for (const p of (payData ?? []) as PaymentRow[]) {
    if (p.status !== 'succeeded') continue;
    if (!p.invoice_id) continue;
    const engId = invToEng.get(p.invoice_id);
    if (!engId) continue;
    revByEng.set(engId, (revByEng.get(engId) ?? 0) + Number(p.amount ?? 0));
  }

  const engs = (engsData ?? []) as unknown as EngagementRow[];

  const rows: ProfitabilityRow[] = engs.map((e) => {
    const hours = (minsByEng.get(e.id) ?? 0) / 60;
    const revenue = revByEng.get(e.id) ?? 0;
    const contract = Number(e.contract_value ?? 0);
    const rate = hours > 0 ? revenue / hours : null;
    const margin = contract - hours * blendedRate;
    return {
      id: e.id,
      title: e.title,
      org_name: e.organizations?.name ?? null,
      owner_id: e.owner_id,
      owner_name: e.owner_id ? ownerMap.get(e.owner_id) ?? null : null,
      pipeline_stage: e.pipeline_stage ?? 'discovery',
      contract_value: contract,
      hours_logged: hours,
      revenue_collected: revenue,
      effective_hourly_rate: rate,
      margin_estimate: margin,
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue_collected, 0);
  const totalHours = rows.reduce((s, r) => s + r.hours_logged, 0);
  const avgRate = totalHours > 0 ? totalRevenue / totalHours : null;

  const ownerOptions = (profsData ?? [])
    .filter((p) => p.app_role === 'admin' || p.app_role === 'collaborator')
    .map((p) => ({ id: p.id, name: p.full_name || p.email || p.id.slice(0, 8) }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Profitability' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Profitability</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            {rows.length} engagements · margin computed against ${blendedRate}/hr blended rate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Stat label="Revenue collected" value={formatCurrency(totalRevenue)} />
          <Stat label="Hours logged" value={`${totalHours.toFixed(1)}h`} />
          <Stat
            label="Avg effective rate"
            value={avgRate == null ? '—' : `$${avgRate.toFixed(0)}/hr`}
          />
        </div>

        <ProfitabilityTable rows={rows} owners={ownerOptions} blendedRate={blendedRate} />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-[#fafafa]">{value}</div>
    </div>
  );
}
