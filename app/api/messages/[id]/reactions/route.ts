import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Restrict the emoji set to known short identifiers to keep storage clean.
// Stored value is the actual emoji glyph for portability; the body uses an
// alias so the wire format stays opaque even if the emoji changes.
const EMOJI_ALIASES: Record<string, string> = {
  'thumbs-up': '👍',
  'heart': '❤️',
  'tada': '🎉',
  'eyes': '👀',
  'rocket': '🚀',
  'joy': '😂',
};

const ALL_EMOJI = new Set(Object.values(EMOJI_ALIASES));

const schema = z.object({
  // Accept either an alias (e.g. 'thumbs-up') or the raw emoji glyph.
  emoji: z.string().min(1).max(32),
});

function resolveEmoji(input: string): string | null {
  if (EMOJI_ALIASES[input]) return EMOJI_ALIASES[input];
  if (ALL_EMOJI.has(input)) return input;
  return null;
}

async function loadMessageOrgId(id: string): Promise<string | null | 'missing'> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('messages')
    .select('id, thread_id, threads:thread_id(organization_id)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return 'missing';
  const t = (data as { threads: { organization_id: string | null } | { organization_id: string | null }[] | null }).threads;
  if (!t) return null;
  if (Array.isArray(t)) return t[0]?.organization_id ?? null;
  return t.organization_id ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.user.clerk_id) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const emoji = resolveEmoji(parsed.data.emoji);
  if (!emoji) return badRequest('Unsupported emoji');

  const orgId = await loadMessageOrgId(id);
  if (orgId === 'missing') return notFound('Message not found');
  if (!ctx.isAdmin && orgId !== ctx.organizationId) return forbidden();

  // Toggle: insert; if conflict (already reacted with this emoji), delete.
  const sb = supabaseAdmin();
  const { error: insertErr } = await sb
    .from('message_reactions')
    .insert({ message_id: id, user_id: ctx.user.clerk_id, emoji });

  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code === '23505') {
      const { error: delErr } = await sb
        .from('message_reactions')
        .delete()
        .eq('message_id', id)
        .eq('user_id', ctx.user.clerk_id)
        .eq('emoji', emoji);
      if (delErr) return serverError(delErr.message);
      return NextResponse.json({ ok: true, action: 'removed', emoji });
    }
    return serverError(insertErr.message);
  }
  return NextResponse.json({ ok: true, action: 'added', emoji });
}
