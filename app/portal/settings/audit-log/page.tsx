import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { AuditRow } from '@/components/admin/audit-row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log' };

const PAGE_SIZE = 50;
const WINDOW_DAYS = 90;

type AuditRowShape = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
};

export default async function PortalAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    entity?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const actorId = (params.actor ?? '').trim();
  const entity = (params.entity ?? '').trim();
  const cursor = (params.cursor ?? '').trim();

  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const orgId = ctx.activeOrg?.id ?? ctx.organizationId;
  if (!orgId) {
    return (
      <>
        <Topbar
          crumbs={[
            { label: 'Settings', href: '/portal/settings' },
            { label: 'Audit log' },
          ]}
        />
        <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#fafafa] mb-2">Audit log</h1>
          <p className="text-sm text-[#a1a1aa]">
            No active organization. Join or switch to an org to view its audit log.
          </p>
        </div>
      </>
    );
  }

  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

  const { data: members } = await sb
    .from('org_memberships')
    .select('user_id, app_users(id, email, full_name)')
    .eq('organization_id', orgId);

  type MemberOption = { id: string; email: string; label: string };
  const memberOptions: MemberOption[] = ((members ?? []) as Array<{
    user_id: string;
    app_users:
      | { id: string; email: string; full_name: string | null }
      | { id: string; email: string; full_name: string | null }[]
      | null;
  }>)
    .map((m) => {
      const u = Array.isArray(m.app_users) ? m.app_users[0] : m.app_users;
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        label: u.full_name?.trim() ? `${u.full_name} (${u.email})` : u.email,
      };
    })
    .filter((m): m is MemberOption => m !== null);

  let query = sb
    .from('audit_log')
    .select(
      'id, actor_id, actor_email, action, entity_type, entity_id, before, after, created_at',
    )
    .eq('organization_id', orgId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt('created_at', cursor);
  if (actorId) query = query.eq('actor_id', actorId);
  if (entity) query = query.ilike('entity_type', entity);

  const { data, error } = await query;
  if (error) {
    return (
      <>
        <Topbar
          crumbs={[
            { label: 'Settings', href: '/portal/settings' },
            { label: 'Audit log' },
          ]}
        />
        <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto">
          <p className="text-sm text-[#f43f5e]">
            Failed to load audit log: {error.message}
          </p>
        </div>
      </>
    );
  }

  const allRows = (data ?? []) as AuditRowShape[];
  const rows = allRows.slice(0, PAGE_SIZE);
  const nextCursor = allRows.length > PAGE_SIZE ? rows[rows.length - 1]?.created_at : null;

  const actorMap = new Map<string, string>();
  for (const m of memberOptions) actorMap.set(m.id, m.label);

  const buildHref = (overrides: { cursor?: string | null; reset?: boolean }) => {
    const sp = new URLSearchParams();
    if (!overrides.reset) {
      if (actorId) sp.set('actor', actorId);
      if (entity) sp.set('entity', entity);
    }
    if (overrides.cursor) sp.set('cursor', overrides.cursor);
    const q = sp.toString();
    return q ? `?${q}` : '';
  };

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Settings', href: '/portal/settings' },
          { label: 'Audit log' },
        ]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto" data-testid="portal-audit-log">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Audit log
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Activity in {ctx.activeOrg?.name ?? 'your organization'} over the last{' '}
            {WINDOW_DAYS} days.
          </p>
        </div>

        <form
          action="/portal/settings/audit-log"
          className="flex flex-wrap items-end gap-2 mb-4 rounded-xl border border-[#27272a] bg-[#0f0f12] p-3"
        >
          <label className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Actor
            </span>
            <select
              name="actor"
              defaultValue={actorId}
              className="rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-xs text-[#fafafa] min-w-[180px]"
            >
              <option value="">Anyone</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Entity type
            </span>
            <input
              type="text"
              name="entity"
              defaultValue={entity}
              placeholder="invoice, document, …"
              className="rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-xs text-[#fafafa]"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2]"
          >
            Apply
          </button>
          <Link
            href="/portal/settings/audit-log"
            className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4]"
          >
            Clear
          </Link>
        </form>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-10 text-center text-sm text-[#a1a1aa]">
            No audit entries match.
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b] border-b border-[#1f1f23]">
              <div className="col-span-3">When</div>
              <div className="col-span-3">Actor</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-3">Entity</div>
              <div className="col-span-1 text-right">Diff</div>
            </div>
            <div className="divide-y divide-[#1f1f23]">
              {rows.map((r) => (
                <AuditRow
                  key={r.id}
                  row={r}
                  actorLabel={
                    r.actor_id && actorMap.get(r.actor_id)
                      ? actorMap.get(r.actor_id)!
                      : r.actor_email ?? 'system'
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-[#71717a]">
          <span>{rows.length} entries shown</span>
          {nextCursor && (
            <Link
              href={`/portal/settings/audit-log${buildHref({ cursor: nextCursor })}`}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 hover:border-[#06b6d4] hover:text-[#06b6d4]"
            >
              Older →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
