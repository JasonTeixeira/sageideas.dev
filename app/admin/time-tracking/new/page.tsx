import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { TimeEntryForm } from '@/components/admin/time-entry-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New time entry' };

type EngRow = {
  id: string;
  title: string;
  organizations: { name: string | null } | null;
};

type TaskRow = {
  id: string;
  title: string;
  engagement_id: string | null;
};

export default async function NewTimeEntryPage() {
  const { user, profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const [{ data: profs }, { data: engs }, { data: tasks }] = await Promise.all([
    sb.from('profiles').select('id, full_name, email').order('full_name', { ascending: true }),
    sb
      .from('engagements')
      .select('id, title, organizations(name)')
      .order('updated_at', { ascending: false })
      .limit(300),
    sb
      .from('tasks')
      .select('id, title, engagement_id')
      .order('updated_at', { ascending: false })
      .limit(500),
  ]);

  const userOptions = (profs ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email || p.id.slice(0, 8),
  }));
  const engOptions = ((engs ?? []) as unknown as EngRow[]).map((e) => ({
    id: e.id,
    label: `${e.title}${e.organizations?.name ? ` — ${e.organizations.name}` : ''}`,
  }));
  const taskOptions = ((tasks ?? []) as TaskRow[]).map((t) => ({
    id: t.id,
    label: t.title,
    engagement_id: t.engagement_id,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: 'Time Tracking', href: '/admin/time-tracking' },
          { label: 'New' },
        ]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">New time entry</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Log a completed entry. To track in real time, use the floating tracker pill.
          </p>
        </div>
        <TimeEntryForm
          currentUserId={user.id}
          users={userOptions}
          engagements={engOptions}
          tasks={taskOptions}
        />
      </div>
    </>
  );
}
