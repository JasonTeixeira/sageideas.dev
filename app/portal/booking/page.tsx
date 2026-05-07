import { redirect } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { BookingForm, type EngagementOption } from '@/components/portal/booking-form';
import { generateSlots, type AvailabilityRow, type BookingRow } from '@/lib/portal/booking';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Book a meeting' };

type EngagementLite = { id: string; title: string };

export default async function PortalBookingPage() {
  const ctx = await getPortalContext();
  if (!ctx.organizationId && !ctx.isAdmin) redirect('/portal');
  const orgId = ctx.organizationId;
  const sb = supabaseAdmin();

  let engagements: EngagementLite[] = [];
  if (orgId) {
    const { data } = await sb
      .from('engagements')
      .select('id, title')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    engagements = (data ?? []) as EngagementLite[];
  }

  const { data: availabilityData } = await sb
    .from('studio_availability')
    .select('weekday, start_time, end_time, timezone, slot_minutes')
    .eq('is_active', true)
    .order('weekday', { ascending: true });
  const availability = (availabilityData ?? []) as AvailabilityRow[];

  // Pull existing confirmed bookings across the next 14d so any client (even
  // a brand-new org) sees correct availability.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const { data: bookingData } = await sb
    .from('bookings')
    .select('starts_at, ends_at, status')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', horizon.toISOString())
    .eq('status', 'confirmed');
  const bookings = (bookingData ?? []) as BookingRow[];

  const slots = generateSlots({ availability, bookings });

  const engagementOptions: EngagementOption[] = engagements.map((e) => ({
    id: e.id,
    title: e.title,
  }));

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Dashboard', href: '/portal' },
          { label: 'Book a meeting' },
        ]}
      />
      <div
        className="px-6 lg:px-8 py-8 max-w-3xl mx-auto"
        data-testid="booking-page"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Book a meeting
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Pick a 30-minute slot. Times are shown in your local timezone; the studio
            keeps office hours in America/New_York.
          </p>
        </header>

        {availability.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[#a1a1aa]">
              No studio availability is configured. Email sage@sageideas.dev to schedule.
            </CardContent>
          </Card>
        ) : (
          <BookingForm engagements={engagementOptions} slots={slots} />
        )}
      </div>
    </>
  );
}
