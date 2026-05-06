'use server';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

const UpdateRoleSchema = z.object({
  id: z.string().uuid(),
  app_role: z.enum(['admin', 'collaborator', 'client', 'pending']),
});

export async function updateUserRole(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const parsed = UpdateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_body' };
  }
  const { id, app_role } = parsed.data;

  if (id === guard.userId && app_role !== 'admin') {
    return { ok: false, error: 'You cannot demote yourself.' };
  }

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('profiles')
    .select('id, email, app_role, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (!prev) return { ok: false, error: 'not_found' };

  const { error } = await sb.from('profiles').update({ app_role }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'user.role_change',
    entityType: 'profile',
    entityId: id,
    before: prev,
    after: { ...prev, app_role },
  });

  revalidatePath('/admin/users');
  return { ok: true };
}

const ToggleStatusSchema = z.object({
  id: z.string().uuid(),
  approval_status: z.enum(['approved', 'pending', 'rejected']),
});

export async function updateUserStatus(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return { ok: false, error: 'unauthorized' };

  const parsed = ToggleStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid_body' };
  }
  const { id, approval_status } = parsed.data;

  if (id === guard.userId && approval_status !== 'approved') {
    return { ok: false, error: 'You cannot deactivate yourself.' };
  }

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from('profiles')
    .select('id, email, app_role, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (!prev) return { ok: false, error: 'not_found' };

  const update: Record<string, unknown> = { approval_status };
  if (approval_status === 'approved') {
    update.approved_at = new Date().toISOString();
    update.approved_by = guard.userId;
  }

  const { error } = await sb.from('profiles').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'user.status_change',
    entityType: 'profile',
    entityId: id,
    before: prev,
    after: { ...prev, approval_status },
  });

  revalidatePath('/admin/users');
  return { ok: true };
}

const RemoveSchema = z.object({ id: z.string().uuid() });

export async function removeUser(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
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

  const { error } = await sb
    .from('profiles')
    .update({ approval_status: 'rejected' })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'user.remove',
    entityType: 'profile',
    entityId: id,
    before: prev,
    after: { ...prev, approval_status: 'rejected' },
  });

  revalidatePath('/admin/users');
  return { ok: true };
}
