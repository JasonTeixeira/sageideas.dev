'use server';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

const HEX = /^#[0-9a-fA-F]{6}$/;

const BrandingSchema = z.object({
  brand_primary_hex: z.string().regex(HEX, 'Primary must be a 6-digit hex').optional().nullable(),
  brand_accent_hex: z.string().regex(HEX, 'Accent must be a 6-digit hex').optional().nullable(),
  tagline: z.string().trim().max(200).optional().nullable(),
  email_signature: z.string().trim().max(2000).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});

const ALLOWED_LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadBrandingLogo(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file provided' };
  if (file.size <= 0) return { ok: false, error: 'File is empty' };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: 'Logo exceeds 2MB' };
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_LOGO_MIME.has(mime)) return { ok: false, error: 'Allowed types: PNG, JPG, SVG, WEBP' };

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `studio/logo-${Date.now()}.${ext}`;

  const sb = supabaseAdmin();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await sb.storage
    .from('branding')
    .upload(path, buf, { contentType: mime, upsert: true });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: pub } = sb.storage.from('branding').getPublicUrl(path);
  const url = pub.publicUrl;

  await sb.from('studio_settings').upsert({ id: 1 }, { onConflict: 'id' });
  const { data: prev } = await sb.from('studio_settings').select('logo_url').eq('id', 1).maybeSingle();
  const { error: updErr } = await sb
    .from('studio_settings')
    .update({ logo_url: url, updated_by: guard.userId })
    .eq('id', 1);
  if (updErr) return { ok: false, error: updErr.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'studio_settings.logo_upload',
    entityType: 'studio_settings',
    entityId: '1',
    before: prev,
    after: { logo_url: url },
  });

  revalidatePath('/admin/settings');
  return { ok: true, url };
}

export async function updateBranding(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const parsed = BrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_body' };
  }

  const update: Record<string, unknown> = { updated_by: guard.userId };
  for (const [k, v] of Object.entries(parsed.data)) {
    update[k] = v ?? null;
  }
  // Mirror new hex columns into legacy primary/secondary so existing readers stay in sync.
  if (parsed.data.brand_primary_hex) update.primary_color = parsed.data.brand_primary_hex;
  if (parsed.data.brand_accent_hex) update.secondary_color = parsed.data.brand_accent_hex;

  const sb = supabaseAdmin();
  await sb.from('studio_settings').upsert({ id: 1 }, { onConflict: 'id' });
  const { data: prev } = await sb.from('studio_settings').select('*').eq('id', 1).maybeSingle();
  const { data: after, error } = await sb
    .from('studio_settings')
    .update(update)
    .eq('id', 1)
    .select('*')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'studio_settings.update_branding',
    entityType: 'studio_settings',
    entityId: '1',
    before: prev,
    after,
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

const TeamMemberUpdateSchema = z.object({
  id: z.string().uuid(),
  app_role: z.enum(['admin', 'collaborator', 'client']).optional(),
  approval_status: z.enum(['approved', 'pending', 'rejected']).optional(),
});

export async function updateTeamMember(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const parsed = TeamMemberUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_body' };
  }

  const { id, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) return { ok: false, error: 'no_fields' };

  if (id === guard.userId && patch.app_role && patch.app_role !== 'admin') {
    return { ok: false, error: 'You cannot demote yourself.' };
  }
  if (id === guard.userId && patch.approval_status && patch.approval_status !== 'approved') {
    return { ok: false, error: 'You cannot deactivate yourself.' };
  }

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('profiles')
    .select('id, email, app_role, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (!prev) return { ok: false, error: 'not_found' };

  const { error } = await sb.from('profiles').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'team.update',
    entityType: 'profile',
    entityId: id,
    before: prev,
    after: { ...prev, ...patch },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}

const RemoveSchema = z.object({ id: z.string().uuid() });

export async function removeTeamMember(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_body' };
  const { id } = parsed.data;
  if (id === guard.userId) return { ok: false, error: 'You cannot remove yourself.' };

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('profiles')
    .select('id, email, app_role, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (!prev) return { ok: false, error: 'not_found' };

  // Soft-remove: demote to client + reject. Auth user is preserved so audit
  // history stays intact and can be re-invited later.
  const { error } = await sb
    .from('profiles')
    .update({ app_role: 'client', approval_status: 'rejected' })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'team.remove',
    entityType: 'profile',
    entityId: id,
    before: prev,
    after: { ...prev, app_role: 'client', approval_status: 'rejected' },
  });

  revalidatePath('/admin/settings');
  return { ok: true };
}
