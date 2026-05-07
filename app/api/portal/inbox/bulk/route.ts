import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BulkAction = 'mark_read' | 'archive';

type BulkBody = {
  ids?: unknown;
  action?: unknown;
};

function parseBody(body: BulkBody): { ids: string[]; action: BulkAction } | null {
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === 'string')
    : [];
  const action: BulkAction | null =
    body.action === 'mark_read' || body.action === 'archive' ? body.action : null;
  if (!action || ids.length === 0) return null;
  return { ids, action };
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let raw: BulkBody;
  try {
    raw = (await req.json()) as BulkBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { ids, action } = parsed;

  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  let updated: { id: string }[] = [];

  if (action === 'mark_read') {
    const { data, error } = await sb
      .from('notifications')
      .update({ read_at: now })
      .in('id', ids)
      .eq('user_id', user.id)
      .is('read_at', null)
      .select('id');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    updated = data ?? [];
  } else {
    // Archive: encode in payload so we don't require a schema change. We also
    // mark as read since archived items should never count against the unread
    // badge.
    const { data: rows } = await sb
      .from('notifications')
      .select('id, payload')
      .in('id', ids)
      .eq('user_id', user.id);

    type NotifRow = { id: string; payload: Record<string, unknown> | null };
    const updates = (rows ?? []) as NotifRow[];

    if (updates.length > 0) {
      // Update one-by-one so each row's payload is preserved. The list is
      // bounded by client UI (selection of ≤ 50 page items), so this is fine.
      for (const row of updates) {
        const nextPayload = {
          ...(row.payload ?? {}),
          archived: true,
          archived_at: now,
        };
        await sb
          .from('notifications')
          .update({ payload: nextPayload, read_at: now })
          .eq('id', row.id)
          .eq('user_id', user.id);
      }
      updated = updates.map((r) => ({ id: r.id }));
    }
  }

  // Best-effort audit. Never block on audit failures.
  try {
    await sb.from('audit_log').insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: action === 'mark_read' ? 'inbox.bulk_mark_read' : 'inbox.bulk_archive',
      entity_type: 'notification',
      entity_id: null,
      after: { ids: updated.map((u) => u.id), count: updated.length },
    });
  } catch {
    /* noop */
  }

  return NextResponse.json({ updated: updated.length, action });
}
