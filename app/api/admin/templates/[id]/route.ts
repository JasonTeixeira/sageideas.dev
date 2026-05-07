import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError } from '@/lib/api-errors';

const patchSchema = z
  .object({
    title: z.string().min(1).max(300),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9-]+$/),
    category: z.string().max(60),
    body_md: z.string().max(200_000),
    active: z.boolean(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided.',
  });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const update: Record<string, unknown> = { ...parsed.data };

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('contract_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  // bump version on body change
  if ('body_md' in update && prev && prev.body_md !== update.body_md) {
    update.version = (prev.version ?? 1) + 1;
  }

  const { data, error } = await sb
    .from('contract_templates')
    .update(update)
    .eq('id', id)
    .select('id, slug, title, category, body_md, active, version, updated_at')
    .maybeSingle();
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'template.update',
    entityType: 'contract_template',
    entityId: id,
    before: prev,
    after: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('contract_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  const { error } = await sb.from('contract_templates').delete().eq('id', id);
  if (error) return badRequest(error.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'template.delete',
    entityType: 'contract_template',
    entityId: id,
    before: prev,
  });

  return NextResponse.json({ ok: true });
}
