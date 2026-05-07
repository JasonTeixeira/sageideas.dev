import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { OrgEditForm } from '@/components/admin/org-edit-form';
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'CRM · Organization' };

type Engagement = {
  id: string;
  title: string;
  status: string | null;
  pipeline_stage: string | null;
  contract_value: number | string | null;
  starts_on: string | null;
  ends_on: string | null;
};

type Membership = {
  user_id: string;
  role: string | null;
  profiles: { id: string; email: string; full_name: string | null } | null;
};

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data: org } = await sb
    .from('organizations')
    .select(
      'id, name, pipeline_stage, annual_value, notes, owner_id, created_at, updated_at, website, industry, show_time_tracking',
    )
    .eq('id', orgId)
    .maybeSingle();
  if (!org) notFound();

  const [engsRes, membersRes, ownersRes] = await Promise.all([
    sb
      .from('engagements')
      .select('id, title, status, pipeline_stage, contract_value, starts_on, ends_on')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    sb
      .from('org_memberships')
      .select('user_id, role, profiles(id, email, full_name)')
      .eq('organization_id', orgId),
    sb
      .from('profiles')
      .select('id, email, full_name')
      .in('app_role', ['admin', 'collaborator']),
  ]);

  const engagements = (engsRes.data ?? []) as Engagement[];
  const members = (membersRes.data ?? []) as unknown as Membership[];
  const owners = (ownersRes.data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'CRM', href: '/admin/crm' }, { label: org.name }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">{org.name}</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            {org.industry ?? '—'}
            {org.website ? ` · ${org.website}` : ''}
            {' · '}created {formatDate(org.created_at)} · last updated{' '}
            {formatRelative(org.updated_at)}
          </p>
        </div>

        <section className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-4">
            Edit
          </h2>
          <OrgEditForm
            orgId={org.id}
            defaults={{
              pipeline_stage: org.pipeline_stage,
              annual_value: org.annual_value ? Number(org.annual_value) : null,
              notes: org.notes,
              owner_id: org.owner_id,
              show_time_tracking: !!org.show_time_tracking,
            }}
            owners={owners}
          />
        </section>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
            Contacts ({members.length})
          </h2>
          {members.length === 0 ? (
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 text-sm text-[#a1a1aa]">
              No contacts linked yet.
            </div>
          ) : (
            <ul className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
              {members.map((m) => (
                <li key={m.user_id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-[#fafafa] truncate">
                      {m.profiles?.full_name || m.profiles?.email || m.user_id}
                    </div>
                    <div className="text-[11px] text-[#71717a] truncate">{m.profiles?.email}</div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525b]">
                    {m.role ?? 'member'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
            Engagements ({engagements.length})
          </h2>
          {engagements.length === 0 ? (
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 text-sm text-[#a1a1aa]">
              No engagements yet.
            </div>
          ) : (
            <ul className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
              {engagements.map((e) => (
                <li
                  key={e.id}
                  className="px-4 py-3 grid grid-cols-12 items-center gap-3 hover:bg-[#131316] transition-colors"
                >
                  <div className="col-span-5 text-sm text-[#fafafa] truncate">{e.title}</div>
                  <div className="col-span-2 text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                    {e.pipeline_stage ?? e.status ?? '—'}
                  </div>
                  <div className="col-span-2 text-xs text-[#a1a1aa] tabular-nums">
                    {e.contract_value ? formatCurrency(Number(e.contract_value)) : '—'}
                  </div>
                  <div className="col-span-3 text-xs text-[#71717a]">
                    {e.starts_on ? formatDate(e.starts_on) : '—'}
                    {e.ends_on ? ` → ${formatDate(e.ends_on)}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
            Notes
          </h2>
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 text-sm text-[#a1a1aa] whitespace-pre-wrap">
            {org.notes?.trim() ? org.notes : 'No notes yet.'}
          </div>
        </div>

        <Link
          href="/admin/crm"
          className="inline-block text-xs font-mono uppercase tracking-widest text-[#71717a] hover:text-[#06b6d4]"
        >
          ← Back to CRM
        </Link>
      </div>
    </>
  );
}
