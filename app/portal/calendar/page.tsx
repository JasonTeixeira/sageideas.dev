import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { CalendarView, type CalendarEventData } from '@/components/portal/calendar-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendar' };

type RawEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  event_type: string | null;
  location: string | null;
  attendees: unknown;
  all_day: boolean | null;
  engagement_id: string | null;
  organization_id: string | null;
};

type RawNote = {
  id: string;
  calendar_event_id: string | null;
  title: string;
  body_md: string | null;
  visible_to_client: boolean | null;
};

export default async function CalendarPage() {
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  let events: CalendarEventData[] = [];
  if (ctx.organizationId || ctx.isAdmin) {
    const horizonStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const horizonEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    let engagementIds: string[] = [];
    if (ctx.organizationId) {
      const { data: engs } = await sb
        .from('engagements')
        .select('id')
        .eq('organization_id', ctx.organizationId);
      engagementIds = (engs ?? []).map((e) => e.id);
    }

    let query = sb
      .from('calendar_events')
      .select(
        'id, title, description, starts_at, ends_at, event_type, location, attendees, all_day, engagement_id, organization_id',
      )
      .eq('visible_to_client', true)
      .gte('starts_at', horizonStart)
      .lte('starts_at', horizonEnd)
      .order('starts_at', { ascending: true });

    if (!ctx.isAdmin && ctx.organizationId) {
      const filter = engagementIds.length
        ? `organization_id.eq.${ctx.organizationId},engagement_id.in.(${engagementIds.join(',')})`
        : `organization_id.eq.${ctx.organizationId}`;
      query = query.or(filter);
    }

    const { data: rawEvents } = await query;
    const eventRows: RawEvent[] = (rawEvents ?? []) as RawEvent[];

    const eventIds = eventRows.map((e) => e.id);
    const notesByEvent = new Map<string, RawNote[]>();
    if (eventIds.length) {
      const { data: notes } = await sb
        .from('meeting_notes')
        .select('id, calendar_event_id, title, body_md, visible_to_client')
        .in('calendar_event_id', eventIds)
        .eq('visible_to_client', true);
      for (const n of (notes ?? []) as RawNote[]) {
        if (!n.calendar_event_id) continue;
        const arr = notesByEvent.get(n.calendar_event_id) ?? [];
        arr.push(n);
        notesByEvent.set(n.calendar_event_id, arr);
      }
    }

    events = eventRows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.starts_at,
      end: e.ends_at,
      allDay: !!e.all_day,
      eventType: e.event_type ?? 'meeting',
      location: e.location,
      attendees: normalizeAttendees(e.attendees),
      notes: (notesByEvent.get(e.id) ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body_md,
      })),
    }));

    // Merge in studio bookings (Phase 2D PR-B) so the calendar reflects
    // self-served meetings.
    let bookingsQuery = sb
      .from('bookings')
      .select('id, organization_id, engagement_id, starts_at, ends_at, meeting_kind, status')
      .gte('starts_at', horizonStart)
      .lte('starts_at', horizonEnd)
      .eq('status', 'confirmed');
    if (!ctx.isAdmin && ctx.organizationId) {
      bookingsQuery = bookingsQuery.eq('organization_id', ctx.organizationId);
    }
    const { data: bookingRows } = await bookingsQuery;
    type BookingRow = {
      id: string;
      organization_id: string | null;
      engagement_id: string | null;
      starts_at: string;
      ends_at: string;
      meeting_kind: string | null;
      status: string | null;
    };
    for (const b of (bookingRows ?? []) as BookingRow[]) {
      events.push({
        id: `booking-${b.id}`,
        title: `Studio meeting · ${b.meeting_kind ?? 'meeting'}`,
        description: null,
        start: b.starts_at,
        end: b.ends_at,
        allDay: false,
        eventType: 'meeting',
        location: null,
        attendees: [],
        notes: [],
      });
    }
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  return (
    <>
      <Topbar crumbs={[{ label: 'Calendar' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Calendar</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Meetings, milestones, and deadlines for your engagements.
          </p>
        </div>

        {events.length === 0 && (
          <div className="mb-4" data-testid="calendar-empty-banner">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4 text-[#71717a]" />
                </div>
                <div className="text-sm text-[#a1a1aa]">
                  Nothing on the books yet — the month grid below stays available so you can browse.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div data-testid="calendar-grid">
          <CalendarView events={events} />
        </div>
      </div>
    </>
  );
}

function normalizeAttendees(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') {
          const obj = v as Record<string, unknown>;
          return (obj.name as string) ?? (obj.email as string) ?? '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeAttendees(parsed);
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}
