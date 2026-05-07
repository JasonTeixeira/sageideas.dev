'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileText, RefreshCcw, Trash2, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Card, CardContent } from '@/components/portal/ui/card';
import { cn, formatDate } from '@/lib/utils';

export type UploadedFileRow = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | string | null;
  version: number | null;
  is_latest: boolean | null;
  created_at: string;
  uploaded_by: string | null;
};

type Quota = {
  bytesUsed: number;
  objectCount: number;
  quotaBytes: number;
};

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error' | 'cancelled';
  error?: string;
  controller: AbortController;
};

function formatBytes(n: number | string | null | undefined): string {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  if (!v || v <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = v;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function DocumentUploader({
  engagementId,
  initialFiles,
  initialQuota,
  testIdSuffix,
}: {
  engagementId: string | null;
  initialFiles: UploadedFileRow[];
  initialQuota: Quota;
  testIdSuffix?: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFileRow[]>(initialFiles);
  const [quota, setQuota] = useState<Quota>(initialQuota);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suffix = testIdSuffix ? `-${testIdSuffix}` : '';

  const usagePct = quota.quotaBytes
    ? Math.min(100, (quota.bytesUsed / quota.quotaBytes) * 100)
    : 0;

  async function refresh() {
    const url = engagementId
      ? `/api/portal/files/list?engagement_id=${engagementId}`
      : '/api/portal/files/list';
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const json = (await res.json()) as { files?: UploadedFileRow[]; quota?: Quota };
      if (json.files) setFiles(json.files);
      if (json.quota) setQuota(json.quota);
      router.refresh();
    } catch {
      // non-fatal
    }
  }

  function startUpload(rawFiles: File[]) {
    const next: UploadItem[] = rawFiles.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      progress: 0,
      status: 'uploading',
      controller: new AbortController(),
    }));
    setItems((prev) => [...prev, ...next]);

    for (const item of next) {
      const fd = new FormData();
      fd.append('file', item.file);
      if (engagementId) fd.append('engagement_id', engagementId);
      const replaceTarget = files.find(
        (f) => f.name === item.file.name && f.is_latest !== false,
      );
      if (replaceTarget) fd.append('replace_file_id', replaceTarget.id);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/portal/files');
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)),
        );
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, progress: 100, status: 'done' } : p,
            ),
          );
          void refresh();
        } else {
          let msg = 'Upload failed';
          try {
            const j = JSON.parse(xhr.responseText) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            // ignore
          }
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, status: 'error', error: msg } : p,
            ),
          );
        }
      };
      xhr.onerror = () => {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: 'error', error: 'Network error' }
              : p,
          ),
        );
      };
      xhr.onabort = () => {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: 'cancelled' } : p)),
        );
      };
      item.controller.signal.addEventListener('abort', () => xhr.abort());
      xhr.send(fd);
    }
  }

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) startUpload(dropped);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) startUpload(picked);
    e.target.value = '';
  }

  function dismissItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function cancelItem(id: string) {
    const item = items.find((p) => p.id === id);
    if (!item) return;
    item.controller.abort();
  }

  return (
    <div className="space-y-4" data-testid={`document-uploader${suffix}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'rounded-xl border-2 border-dashed transition-colors cursor-pointer p-8 text-center',
          dragOver
            ? 'border-[#06b6d4] bg-[#06b6d4]/5'
            : 'border-[#3f3f46] bg-[#0f0f12] hover:border-[#52525b]',
        )}
        data-testid={`upload-dropzone${suffix}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPick}
          data-testid={`upload-input${suffix}`}
        />
        <Upload className="w-7 h-7 text-[#52525b] mx-auto mb-2" />
        <div className="text-sm text-[#fafafa] font-medium">
          Drop files here, or click to browse
        </div>
        <div className="text-xs text-[#71717a] mt-1">
          Up to 50 MB per file. {formatBytes(quota.bytesUsed)} of{' '}
          {formatBytes(quota.quotaBytes)} used.
        </div>
        <div
          className="mt-3 mx-auto h-1.5 w-full max-w-sm rounded-full bg-[#27272a] overflow-hidden"
          aria-label="Storage usage"
          data-testid={`storage-usage-bar${suffix}`}
        >
          <div
            className={cn(
              'h-full transition-all',
              usagePct > 90 ? 'bg-[#f43f5e]' : 'bg-[#06b6d4]',
            )}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div
          className="mt-1 text-[10px] text-[#52525b] tabular-nums"
          data-testid={`storage-usage-chip${suffix}`}
        >
          {formatBytes(quota.bytesUsed)} of {formatBytes(quota.quotaBytes)} used
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2" data-testid={`upload-list${suffix}`}>
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-2 text-xs"
            >
              <FileText className="w-4 h-4 text-[#71717a] shrink-0" />
              <span className="flex-1 truncate text-[#fafafa]">{it.file.name}</span>
              <div className="w-32 hidden sm:block" data-testid={`upload-progress${suffix}`}>
                <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      it.status === 'error'
                        ? 'bg-[#f43f5e]'
                        : it.status === 'cancelled'
                          ? 'bg-[#52525b]'
                          : 'bg-[#10b981]',
                    )}
                    style={{ width: `${it.progress}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right tabular-nums text-[#a1a1aa]">
                {it.status === 'error'
                  ? 'Error'
                  : it.status === 'cancelled'
                    ? 'Cancelled'
                    : it.status === 'done'
                      ? 'Done'
                      : `${it.progress}%`}
              </span>
              {it.status === 'uploading' ? (
                <button
                  type="button"
                  className="text-[#71717a] hover:text-[#fafafa]"
                  aria-label="Cancel upload"
                  onClick={() => cancelItem(it.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="text-[#71717a] hover:text-[#fafafa]"
                  aria-label="Dismiss"
                  onClick={() => dismissItem(it.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {it.error ? (
                <span className="text-[#f43f5e] text-[10px] truncate max-w-[16rem]">
                  {it.error}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <FilesList files={files} onChanged={refresh} testIdSuffix={suffix} />
    </div>
  );
}

function FilesList({
  files,
  onChanged,
  testIdSuffix,
}: {
  files: UploadedFileRow[];
  onChanged: () => void;
  testIdSuffix: string;
}) {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-xs text-[#71717a]">
          No files yet. Upload one above to get started.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
      {files.map((f) => (
        <FileRow key={f.id} file={f} onChanged={onChanged} testIdSuffix={testIdSuffix} />
      ))}
    </div>
  );
}

function FileRow({
  file,
  onChanged,
  testIdSuffix,
}: {
  file: UploadedFileRow;
  onChanged: () => void;
  testIdSuffix: string;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<UploadedFileRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadVersions() {
    if (versions) return;
    try {
      const res = await fetch(`/api/portal/files/${file.id}/versions`);
      if (!res.ok) return;
      const json = (await res.json()) as { versions: UploadedFileRow[] };
      setVersions(json.versions);
    } catch {
      // non-fatal
    }
  }

  async function toggleVersions() {
    const next = !open;
    setOpen(next);
    if (next) await loadVersions();
  }

  async function softDelete() {
    if (!confirm(`Remove ${file.name}?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/portal/files/${file.id}`, { method: 'DELETE' });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function restoreVersion(versionId: string) {
    setBusy(true);
    try {
      await fetch(`/api/portal/files/${versionId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      setVersions(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid={`file-row${testIdSuffix}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-[#131316]">
        <div className="md:col-span-5 flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#71717a] shrink-0" />
          <span className="text-sm font-medium text-[#fafafa] truncate">{file.name}</span>
          {(file.version ?? 1) > 1 ? (
            <span className="text-[10px] text-[#71717a]">v{file.version}</span>
          ) : null}
        </div>
        <div className="md:col-span-2 text-xs text-[#a1a1aa] truncate">
          {file.mime_type ?? 'file'}
        </div>
        <div className="md:col-span-1 text-xs text-[#a1a1aa] tabular-nums">
          {formatBytes(file.size_bytes)}
        </div>
        <div className="md:col-span-2 text-xs text-[#71717a]">
          {formatDate(file.created_at)}
        </div>
        <div className="md:col-span-2 flex md:justify-end items-center gap-2">
          <button
            type="button"
            onClick={toggleVersions}
            className="inline-flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#fafafa]"
            aria-expanded={open}
            data-testid={`versions-toggle${testIdSuffix}`}
          >
            <History className="w-3.5 h-3.5" />
            Versions
          </button>
          <a
            href={`/api/portal/files/${file.id}/download`}
            className="text-xs text-[#22d3ee] hover:text-[#67e8f9]"
          >
            Download
          </a>
          <button
            type="button"
            onClick={softDelete}
            disabled={busy}
            className="text-[#71717a] hover:text-[#f43f5e] disabled:opacity-50"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {open ? (
        <div className="px-4 pb-3 bg-[#0a0a0d] border-t border-[#1f1f23]">
          {versions === null ? (
            <p className="text-xs text-[#52525b] py-2">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-[#52525b] py-2">No version history.</p>
          ) : (
            <ul className="divide-y divide-[#1f1f23]">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 py-2 text-xs"
                  data-testid={`version-row${testIdSuffix}`}
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-[#52525b]" />
                  <span className="text-[#fafafa] tabular-nums">v{v.version ?? '?'}</span>
                  {v.is_latest ? (
                    <span className="text-[10px] uppercase tracking-wider text-[#10b981]">
                      latest
                    </span>
                  ) : null}
                  <span className="text-[#71717a]">{formatDate(v.created_at)}</span>
                  <span className="ml-auto tabular-nums text-[#a1a1aa]">
                    {formatBytes(v.size_bytes)}
                  </span>
                  {!v.is_latest ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => restoreVersion(v.id)}
                      data-testid={`restore-version${testIdSuffix}`}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
