import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError } from '@/lib/api-errors';

const createSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9-]*$/)
    .optional(),
  category: z.string().max(60).optional(),
  body_md: z.string().max(200_000).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;

  const title = body.title.trim();
  const slug =
    body.slug?.trim() ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const insert = {
    title,
    slug,
    category: body.category ?? 'other',
    body_md: body.body_md ?? '',
    active: body.active ?? true,
    created_by: guard.userId,
  };

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('contract_templates')
    .insert(insert)
    .select('id, slug, title, category, body_md, active, version, updated_at')
    .maybeSingle();
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'template.create',
    entityType: 'contract_template',
    entityId: data?.id ?? null,
    after: data,
  });

  return NextResponse.json(data);
}
