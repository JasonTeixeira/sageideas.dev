import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { AvailabilityEditor, type AvailabilityRule } from '@/components/admin/availability-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Studio availability' };

export default async function AdminAvailabilityPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('studio_availability')
    .select('id, weekday, start_time, end_time, timezone, slot_minutes, is_active')
    .order('weekday', { ascending: true });
  const rules = (data ?? []) as AvailabilityRule[];

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Availability' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div
        className="px-6 lg:px-8 py-8 max-w-4xl mx-auto"
        data-testid="admin-availability"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Studio availability
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Office hours per weekday. Clients pick from these windows when booking
            meetings. Slot length controls the granularity of bookable times.
          </p>
        </header>

        <AvailabilityEditor rules={rules} />
      </div>
    </>
  );
}
