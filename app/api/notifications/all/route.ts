import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const TYPE_GROUPS: Record<string, string[]> = {
  messages: ['message', 'message_received', 'thread_message'],
  deliverables: ['deliverable', 'deliverable_ready', 'deliverable_decision', 'deliverable_iteration'],
  invoices: ['invoice', 'invoice_issued', 'invoice_paid', 'invoice_overdue'],
};

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const filter = url.searchParams.get('filter') === 'unread' ? 'unread' : 'all';
  const type = url.searchParams.get('type') ?? 'all';
  const includeArchived = url.searchParams.get('archived') === '1';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseAdmin();
  let query = sb
    .from('notifications')
    .select('id, kind, title, body, link, payload, created_at, read_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filter === 'unread') query = query.is('read_at', null);
  const kinds = TYPE_GROUPS[type];
  if (kinds && kinds.length > 0) query = query.in('kind', kinds);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type NotifRow = {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
    read_at: string | null;
  };

  const rows = (data ?? []) as NotifRow[];
  const filtered = includeArchived
    ? rows
    : rows.filter((r) => !(r.payload && (r.payload as { archived?: unknown }).archived));

  return NextResponse.json({
    items: filtered,
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
  });
}
