import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateThreadBody {
  subject?: string;
  body?: string;
  engagement_id?: string;
}

export async function POST(req: Request) {
  let payload: CreateThreadBody;
  try {
    payload = (await req.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const subject = (payload.subject ?? '').trim();
  const body = (payload.body ?? '').trim();
  const engagementId = (payload.engagement_id ?? '').trim();

  if (!subject || !body || !engagementId) {
    return NextResponse.json(
      { error: 'subject, body, and engagement_id are required' },
      { status: 400 },
    );
  }

  const ctx = await getPortalContext();
  if (!ctx.organizationId) {
    return NextResponse.json({ error: 'no active organization' }, { status: 403 });
  }

  const sb = supabaseAdmin();

  // Verify the engagement belongs to the active org so a client can't open
  // a thread on someone else's project.
  const { data: eng } = await sb
    .from('engagements')
    .select('id, organization_id, title')
    .eq('id', engagementId)
    .maybeSingle();
  if (!eng || eng.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'engagement not accessible' }, { status: 403 });
  }

  const nowIso = new Date().toISOString();

  const { data: thread, error: threadErr } = await sb
    .from('threads')
    .insert({
      organization_id: ctx.organizationId,
      engagement_id: engagementId,
      subject,
      last_message_at: nowIso,
    })
    .select('id, engagement_id')
    .single();
  if (threadErr || !thread) {
    console.error('[portal/threads/create] thread insert failed', threadErr);
    return NextResponse.json({ error: 'thread insert failed' }, { status: 500 });
  }

  const { error: msgErr } = await sb.from('messages').insert({
    thread_id: thread.id,
    sender_id: ctx.user.clerk_id,
    body,
  });
  if (msgErr) {
    console.error('[portal/threads/create] message insert failed', msgErr);
    // Best-effort cleanup so we don't leave an empty thread behind.
    await sb.from('threads').delete().eq('id', thread.id);
    return NextResponse.json({ error: 'message insert failed' }, { status: 500 });
  }

  // Notify all admins (any user with admin app_role).
  try {
    const { data: admins } = await sb
      .from('app_users')
      .select('clerk_id')
      .eq('role', 'admin');
    const adminUserIds = (admins ?? [])
      .map((a) => (a as { clerk_id: string | null }).clerk_id)
      .filter((id): id is string => !!id);
    if (adminUserIds.length) {
      const link = `/portal/messages/${thread.engagement_id}`;
      const notifRows = adminUserIds.map((userId) => ({
        user_id: userId,
        kind: 'thread_created',
        title: `New thread: ${subject.slice(0, 80)}`,
        body: `${ctx.user.email} opened a thread on ${eng.title ?? 'an engagement'}.`,
        link,
        payload: {
          thread_id: thread.id,
          engagement_id: thread.engagement_id,
          actor_email: ctx.user.email,
        },
      }));
      const { error: notifErr } = await sb.from('notifications').insert(notifRows);
      if (notifErr) console.error('[portal/threads/create] notifications insert failed', notifErr);
    }
  } catch (err) {
    console.error('[portal/threads/create] admin notify failed', err);
    // never block the thread creation on notify failures
  }

  return NextResponse.json({
    thread_id: thread.id,
    engagement_id: thread.engagement_id,
  });
}
