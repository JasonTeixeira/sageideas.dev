import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { adminInviteUser, approveProfile } from '@/app/auth/actions';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users' };

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  app_role: string | null;
  approval_status: string | null;
  created_at: string;
  company: string | null;
};

type Props = {
  searchParams: Promise<{ invited?: string; error?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const { profile, user } = await requireAdmin();
  const sp = await searchParams;
  const invitedEmail = sp.invited ?? '';
  const error = sp.error;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('profiles')
    .select('id, email, full_name, app_role, approval_status, created_at, company')
    .order('created_at', { ascending: false });

  const rows = ((data ?? []) as ProfileRow[]).filter((r) => r.id !== user.id);

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Users' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Users</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Invite teammates and clients, set their role, and approve pending requests.
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="space-y-2">
          {invitedEmail && (
            <div
              role="status"
              className="rounded-lg border border-[#06B6D4]/30 bg-[#06B6D4]/5 px-3 py-2.5 text-sm text-[#06B6D4]"
            >
              Invite sent to <span className="font-medium">{invitedEmail}</span>.
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#7F1D1D]/50 bg-[#7F1D1D]/10 px-3 py-2.5 text-sm text-[#FCA5A5]"
            >
              {decodeURIComponent(error)}
            </div>
          )}
        </div>

        <section className="rounded-xl border border-[#27272A] bg-[#0F0F12] p-5">
          <h2 className="text-sm font-semibold text-[#FAFAFA] mb-4">Invite a user</h2>
          <form
            action={adminInviteUser}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
                Email
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="user@company.com"
                className="rounded-lg border border-[#27272A] bg-[#0A0A0C] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#06B6D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
                Full name
              </span>
              <input
                name="full_name"
                type="text"
                placeholder="Jane Operator"
                className="rounded-lg border border-[#27272A] bg-[#0A0A0C] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#06B6D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
                Role
              </span>
              <select
                name="app_role"
                defaultValue="client"
                className="rounded-lg border border-[#27272A] bg-[#0A0A0C] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#06B6D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#06B6D4] px-4 py-2 text-sm font-semibold text-[#09090B] hover:bg-[#0891B2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 transition-colors"
            >
              Send invite
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-[#27272A] bg-[#0F0F12] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#1F1F23] text-[10px] font-mono uppercase tracking-widest text-[#71717A]">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#71717A]">
                    No other users yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#1F1F23] last:border-0">
                  <td className="px-4 py-3 text-[#FAFAFA]">{r.email}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">
                    {r.full_name ?? '—'}
                    {r.company ? (
                      <span className="block text-[10px] text-[#52525B]">{r.company}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={r.app_role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.approval_status} />
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA] text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.approval_status !== 'approved' ? (
                      <form action={approveProfile} className="inline">
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-[#06B6D4]/40 bg-[#06B6D4]/10 px-2.5 py-1 text-xs font-medium text-[#06B6D4] hover:bg-[#06B6D4]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 transition-colors"
                        >
                          Approve
                        </button>
                      </form>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525B]">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'pending';
  const palette: Record<string, string> = {
    admin: 'border-[#06B6D4]/40 bg-[#06B6D4]/10 text-[#06B6D4]',
    client: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    pending: 'border-[#27272A] bg-[#0A0A0C] text-[#71717A]',
  };
  const cls = palette[r] ?? palette.pending;
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest ${cls}`}
    >
      {r}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'pending';
  const palette: Record<string, string> = {
    approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    rejected: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  };
  const cls = palette[s] ?? palette.pending;
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest ${cls}`}
    >
      {s}
    </span>
  );
}
