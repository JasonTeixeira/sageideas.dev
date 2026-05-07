// Phase 2C.1 -- storage helper module.
//
// All helpers accept the SSR-bound Supabase client so RLS is enforced as the
// signed-in user. Service-role variants (where needed) use supabaseAdmin
// directly. Per-org quota is enforced by the storage trigger added in
// migration 0011 -- these helpers don't need to pre-check.

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CLIENT_UPLOADS_BUCKET = 'client-uploads';
export const AVATARS_BUCKET = 'avatars';
export const MESSAGE_ATTACHMENTS_BUCKET = 'message-attachments';
export const CONTRACTS_BUCKET = 'contracts';
export const ORG_QUOTA_BYTES = 5_368_709_120; // 5 GiB -- matches the trigger.

/**
 * Generic single-shot upload. Used by routes that don't need the
 * versioning/quota machinery of uploadProjectFile (message attachments,
 * signed-contract receipts, etc.). Caller is responsible for path layout.
 */
export async function uploadToBucket(input: {
  bucket: string;
  path: string;
  bytes: ArrayBuffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
  supabase: SupabaseClient;
}): Promise<void> {
  const { bucket, path, bytes, contentType, upsert, supabase } = input;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, u8, { contentType, upsert: upsert ?? false });
  if (error) throw error;
}

export type UploadInput = {
  orgId: string;
  engagementId: string | null;
  uploaderId: string;
  file: { name: string; size: number; mimeType: string; bytes: ArrayBuffer | Uint8Array };
  iterationId?: string | null;
  supabase: SupabaseClient;
};

export type FileRow = {
  id: string;
  organization_id: string;
  engagement_id: string | null;
  iteration_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  parent_id: string | null;
  version: number;
  is_latest: boolean;
  deleted_at: string | null;
};

export type FileVersionRow = {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
};

function safeFilename(raw: string): string {
  // Strip path separators and ASCII control characters.
  let out = '';
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || ch === '/' || ch === '\\') {
      out += '_';
    } else {
      out += ch;
    }
  }
  return out.slice(0, 200);
}

function buildStoragePath(orgId: string, engagementId: string | null, filename: string): string {
  const eng = engagementId ?? 'general';
  const safe = safeFilename(filename);
  return `${orgId}/${eng}/${randomUUID()}-${safe}`;
}

function asUint8(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

/**
 * Upload a fresh file. If a `files` row already exists with the same name
 * (engagement+org scope, latest+not-deleted), `replaceProjectFile` should be
 * used instead. This helper does NOT perform that check -- the route layer
 * decides which to call so the client can confirm the rename intent.
 */
export async function uploadProjectFile(
  input: UploadInput,
): Promise<{ row: FileRow; storagePath: string }> {
  const { orgId, engagementId, uploaderId, file, iterationId, supabase } = input;
  const path = buildStoragePath(orgId, engagementId, file.name);

  const { error: upErr } = await supabase.storage
    .from(CLIENT_UPLOADS_BUCKET)
    .upload(path, asUint8(file.bytes), {
      contentType: file.mimeType,
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from('files')
    .insert({
      organization_id: orgId,
      engagement_id: engagementId,
      iteration_id: iterationId ?? null,
      name: file.name,
      storage_path: path,
      mime_type: file.mimeType,
      size_bytes: file.size,
      uploaded_by: uploaderId,
      version: 1,
      is_latest: true,
    })
    .select(
      'id, organization_id, engagement_id, iteration_id, name, storage_path, mime_type, size_bytes, uploaded_by, created_at, parent_id, version, is_latest, deleted_at',
    )
    .single();

  if (insErr || !row) {
    try {
      await supabase.storage.from(CLIENT_UPLOADS_BUCKET).remove([path]);
    } catch {
      // best-effort cleanup
    }
    throw insErr ?? new Error('files insert failed');
  }

  return { row: row as FileRow, storagePath: path };
}

/**
 * Replace an existing file. Bumps version, flips prior `is_latest`, writes a
 * `file_versions` audit row, and inserts a new latest row chained via
 * parent_id to the root of the version chain.
 */
export async function replaceProjectFile(input: {
  existingFileId: string;
  uploaderId: string;
  file: { name: string; size: number; mimeType: string; bytes: ArrayBuffer | Uint8Array };
  notes?: string | null;
  supabase: SupabaseClient;
}): Promise<{ row: FileRow; previousVersion: number }> {
  const { existingFileId, uploaderId, file, supabase, notes } = input;

  const { data: existing, error: exErr } = await supabase
    .from('files')
    .select(
      'id, organization_id, engagement_id, iteration_id, name, parent_id, version, is_latest',
    )
    .eq('id', existingFileId)
    .single();
  if (exErr || !existing) throw exErr ?? new Error('existing file not found');
  if (!existing.organization_id) throw new Error('file missing organization_id');

  const rootId = (existing.parent_id as string | null) ?? (existing.id as string);

  const { data: chain } = await supabase
    .from('files')
    .select('version')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion =
    Math.max(
      Number(existing.version ?? 1),
      Number((chain?.[0]?.version as number | undefined) ?? 1),
    ) + 1;

  const path = buildStoragePath(
    existing.organization_id as string,
    (existing.engagement_id as string | null) ?? null,
    file.name,
  );

  const { error: upErr } = await supabase.storage
    .from(CLIENT_UPLOADS_BUCKET)
    .upload(path, asUint8(file.bytes), {
      contentType: file.mimeType,
      upsert: false,
    });
  if (upErr) throw upErr;

  const { error: flipErr } = await supabase
    .from('files')
    .update({ is_latest: false })
    .eq('id', existingFileId);
  if (flipErr) throw flipErr;

  const { data: row, error: insErr } = await supabase
    .from('files')
    .insert({
      organization_id: existing.organization_id,
      engagement_id: existing.engagement_id,
      iteration_id: existing.iteration_id,
      name: file.name,
      storage_path: path,
      mime_type: file.mimeType,
      size_bytes: file.size,
      uploaded_by: uploaderId,
      parent_id: rootId,
      version: nextVersion,
      is_latest: true,
    })
    .select(
      'id, organization_id, engagement_id, iteration_id, name, storage_path, mime_type, size_bytes, uploaded_by, created_at, parent_id, version, is_latest, deleted_at',
    )
    .single();

  if (insErr || !row) {
    try {
      await supabase.storage.from(CLIENT_UPLOADS_BUCKET).remove([path]);
    } catch {
      // best-effort cleanup
    }
    try {
      await supabase
        .from('files')
        .update({ is_latest: true })
        .eq('id', existingFileId);
    } catch {
      // best-effort revert
    }
    throw insErr ?? new Error('files insert failed');
  }

  try {
    await supabase.from('file_versions').insert({
      file_id: rootId,
      version_number: nextVersion,
      storage_path: path,
      size_bytes: file.size,
      uploaded_by: uploaderId,
      notes: notes ?? null,
    });
  } catch {
    // non-fatal
  }

  return { row: row as FileRow, previousVersion: Number(existing.version ?? 1) };
}

/**
 * Soft-delete a file. RLS allows org members to update; hard delete (storage
 * object removal) is policy-restricted to owner/admin via 0010.
 */
export async function deleteProjectFile(input: {
  fileId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  const { fileId, supabase } = input;
  const { error } = await supabase
    .from('files')
    .update({ deleted_at: new Date().toISOString(), is_latest: false })
    .eq('id', fileId);
  if (error) throw error;
}

/**
 * Revert to a previous version by re-uploading its bytes as a new latest row.
 * Preserves audit chain -- the restored content gets a fresh version number.
 */
export async function restoreProjectFileVersion(input: {
  fileId: string;
  uploaderId: string;
  supabase: SupabaseClient;
}): Promise<{ row: FileRow }> {
  const { fileId, uploaderId, supabase } = input;

  const { data: prior, error: priorErr } = await supabase
    .from('files')
    .select(
      'id, organization_id, engagement_id, iteration_id, name, storage_path, mime_type, size_bytes, parent_id, version',
    )
    .eq('id', fileId)
    .single();
  if (priorErr || !prior) throw priorErr ?? new Error('file not found');
  if (!prior.organization_id) throw new Error('file missing organization_id');

  const rootId = (prior.parent_id as string | null) ?? (prior.id as string);

  const { data: latestRow } = await supabase
    .from('files')
    .select('id, version')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .eq('is_latest', true)
    .limit(1)
    .maybeSingle();
  const latestId = (latestRow?.id as string | undefined) ?? rootId;

  const { data: chain } = await supabase
    .from('files')
    .select('version')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion =
    Math.max(Number(prior.version ?? 1), Number((chain?.[0]?.version as number | undefined) ?? 1)) +
    1;

  const newPath = buildStoragePath(
    prior.organization_id as string,
    (prior.engagement_id as string | null) ?? null,
    prior.name as string,
  );
  const { error: copyErr } = await supabase.storage
    .from(CLIENT_UPLOADS_BUCKET)
    .copy(prior.storage_path as string, newPath);
  if (copyErr) throw copyErr;

  const { error: flipErr } = await supabase
    .from('files')
    .update({ is_latest: false })
    .eq('id', latestId);
  if (flipErr) throw flipErr;

  const { data: row, error: insErr } = await supabase
    .from('files')
    .insert({
      organization_id: prior.organization_id,
      engagement_id: prior.engagement_id,
      iteration_id: prior.iteration_id,
      name: prior.name,
      storage_path: newPath,
      mime_type: prior.mime_type,
      size_bytes: prior.size_bytes,
      uploaded_by: uploaderId,
      parent_id: rootId,
      version: nextVersion,
      is_latest: true,
    })
    .select(
      'id, organization_id, engagement_id, iteration_id, name, storage_path, mime_type, size_bytes, uploaded_by, created_at, parent_id, version, is_latest, deleted_at',
    )
    .single();

  if (insErr || !row) {
    try {
      await supabase.storage.from(CLIENT_UPLOADS_BUCKET).remove([newPath]);
    } catch {
      // best-effort cleanup
    }
    try {
      await supabase.from('files').update({ is_latest: true }).eq('id', latestId);
    } catch {
      // best-effort revert
    }
    throw insErr ?? new Error('restore insert failed');
  }

  try {
    await supabase.from('file_versions').insert({
      file_id: rootId,
      version_number: nextVersion,
      storage_path: newPath,
      size_bytes: prior.size_bytes,
      uploaded_by: uploaderId,
      notes: `Restored from v${prior.version ?? 1}`,
    });
  } catch {
    // non-fatal
  }

  return { row: row as FileRow };
}

export async function getOrgUsage(input: {
  orgId: string;
  supabase: SupabaseClient;
}): Promise<{ bytesUsed: number; objectCount: number; quotaBytes: number }> {
  const { orgId, supabase } = input;
  const { data } = await supabase
    .from('org_storage_usage')
    .select('bytes_used, object_count')
    .eq('organization_id', orgId)
    .maybeSingle();
  return {
    bytesUsed: Number((data?.bytes_used as number | string | undefined) ?? 0),
    objectCount: Number((data?.object_count as number | string | undefined) ?? 0),
    quotaBytes: ORG_QUOTA_BYTES,
  };
}

export async function getSignedUrl(input: {
  bucket: string;
  path: string;
  expiresIn?: number;
  supabase: SupabaseClient;
}): Promise<string> {
  const { bucket, path, expiresIn = 60 * 60, supabase } = input;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error('signed url failed');
  return data.signedUrl;
}
