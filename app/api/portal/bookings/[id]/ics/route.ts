import { NextResponse } from 'next/server';
import { createEvent, type EventAttributes, type DateArray } from 'ics';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { forbidden, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  organization_id: string | null;
  engagement_id: string | null;
  starts_at: string;
  ends_at: string;
  meeting_kind: string;
  meeting_url: string | null;
  notes: string | null;
  ics_uid: string;
  status: string | null;
};

function toDateArray(iso: string): DateArray {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

function titleFor(kind: string): string {
  const kinds: Record<string, string> = {
    kickoff: 'Sage Ideas Studio · Kickoff',
    review: 'Sage Ideas Studio · Review',
    status: 'Sage Ideas Studio · Status',
    adhoc: 'Sage Ideas Studio · Meeting',
  };
  return kinds[kind] ?? 'Sage Ideas Studio · Meeting';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('bookings')
    .select(
      'id, organization_id, engagement_id, starts_at, ends_at, meeting_kind, meeting_url, notes, ics_uid, status',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return notFound('Booking not found');
  const row = data as BookingRow;

  if (!ctx.isAdmin && row.organization_id !== ctx.organizationId) return forbidden();

  const attrs: EventAttributes = {
    uid: row.ics_uid,
    productId: 'sageideas/portal',
    start: toDateArray(row.starts_at),
    startInputType: 'utc',
    end: toDateArray(row.ends_at),
    endInputType: 'utc',
    title: titleFor(row.meeting_kind),
    description: row.notes ?? '',
    url: row.meeting_url ?? undefined,
    status: row.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
  };

  const { error, value } = createEvent(attrs);
  if (error || !value) {
    console.error('[portal/bookings/ics] createEvent failed', error);
    return serverError('ics generation failed');
  }

  return new NextResponse(value, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="sage-${row.meeting_kind}-${row.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
