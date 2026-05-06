import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

const STAGES = ['lead', 'qualified', 'proposal', 'active', 'past', 'cold'] as const;

const CreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Slug must be lowercase letters, numbers, and dashes'),
  primary_contact_name: z.string().trim().min(1, 'Contact name is required').max(200),
  primary_contact_email: z.string().trim().email('Invalid email').max(200),
  pipeline_stage: z.enum(STAGES).default('lead'),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { name, slug, primary_contact_name, primary_contact_email, pipeline_stage, notes } =
    parsed.data;

  const sb = supabaseAdmin();
  const insert = {
    name,
    slug,
    primary_contact_email,
    pipeline_stage,
    status: 'active',
    notes: notes ? `Primary contact: ${primary_contact_name}\n\n${notes}` : `Primary contact: ${primary_contact_name}`,
  };

  const { data, error } = await sb
    .from('organizations')
    .insert(insert)
    .select('id, name, slug')
    .maybeSingle();
  if (error || !data) {
    const msg = error?.message ?? 'insert_failed';
    const status = msg.toLowerCase().includes('duplicate') || msg.includes('unique') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'organization.create',
    entityType: 'organization',
    entityId: data.id,
    after: insert,
  });

  return NextResponse.json(data);
}
