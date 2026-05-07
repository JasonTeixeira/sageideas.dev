import { NextResponse } from 'next/server';
import { createEvent, type EventAttributes, type DateArray } from 'ics';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CalendarEventRow = {
  id: string;
  organization_id: string | null;
  engagement_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  visible_to_client: boolean | null;
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const ctx = await getPortalContext();

  const sb = supabaseAdmin();
  const { data: ev } = await sb
    .from('calendar_events')
    .select(
      'id, organization_id, engagement_id, title, description, location, starts_at, ends_at, visible_to_client',
    )
    .eq('id', id)
    .maybeSingle();

  if (!ev) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const row = ev as CalendarEventRow;

  // Authorization: admin sees all; clients see events visible to client
  // and either scoped to their active org OR to one of their engagements.
  if (!ctx.isAdmin) {
    if (row.visible_to_client === false) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!ctx.organizationId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    let allowed = row.organization_id === ctx.organizationId;
    if (!allowed && row.engagement_id) {
      const { data: eng } = await sb
        .from('engagements')
        .select('organization_id')
        .eq('id', row.engagement_id)
        .maybeSingle();
      if (eng?.organization_id === ctx.organizationId) allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const attrs: EventAttributes = {
    uid: row.id,
    productId: 'sageideas/portal',
    start: toDateArray(row.starts_at),
    startInputType: 'utc',
    end: toDateArray(row.ends_at),
    endInputType: 'utc',
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? undefined,
  };

  const { error, value } = createEvent(attrs);
  if (error || !value) {
    console.error('[portal/calendar/ics] createEvent failed', error);
    return NextResponse.json({ error: 'ics generation failed' }, { status: 500 });
  }

  const safeTitle = row.title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 60) || 'event';

  return new NextResponse(value, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeTitle}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
