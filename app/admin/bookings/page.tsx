import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings' };

type Row = {
  id: string;
  organization_id: string | null;
  engagement_id: string | null;
  starts_at: string;
  ends_at: string;
  meeting_kind: string | null;
  status: string | null;
  ics_uid: string;
  created_at: string;
  organizations: { name: string | null } | null;
  engagements: { title: string | null } | null;
};

const KIND_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'violet'> = {
  kickoff: 'amber',
  review: 'cyan',
  status: 'emerald',
  adhoc: 'violet',
};

const STATUS_TONE: Record<string, 'emerald' | 'rose' | 'neutral'> = {
  confirmed: 'emerald',
  cancelled: 'rose',
  completed: 'neutral',
};

export default async function AdminBookingsPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('bookings')
    .select(
      'id, organization_id, engagement_id, starts_at, ends_at, meeting_kind, status, ics_uid, created_at, organizations(name), engagements(title)',
    )
    .order('starts_at', { ascending: true })
    .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Bookings' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Bookings
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            All studio bookings from the past week onward. Clients book themselves
            via /portal/booking.
          </p>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-[#a1a1aa]">
              No bookings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
            {rows.map((b) => {
              const start = new Date(b.starts_at);
              const localFmt = new Intl.DateTimeFormat(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
              const tzFmt = new Intl.DateTimeFormat(undefined, {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              });
              return (
                <div
                  key={b.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center"
                >
                  <div className="md:col-span-3 text-sm text-[#fafafa]">
                    {localFmt.format(start)}
                    <div className="text-[10px] text-[#71717a]">
                      {tzFmt.format(start)} studio
                    </div>
                  </div>
                  <div className="md:col-span-3 text-xs text-[#a1a1aa] truncate">
                    {b.organizations?.name ?? '—'}
                  </div>
                  <div className="md:col-span-3 text-xs text-[#a1a1aa] truncate">
                    {b.engagements?.title ?? '—'}
                  </div>
                  <div className="md:col-span-1">
                    <Badge tone={KIND_TONE[b.meeting_kind ?? 'adhoc'] ?? 'neutral'}>
                      {b.meeting_kind ?? 'meeting'}
                    </Badge>
                  </div>
                  <div className="md:col-span-2 text-right">
                    <Badge tone={STATUS_TONE[b.status ?? 'confirmed'] ?? 'neutral'}>
                      {b.status ?? 'confirmed'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
