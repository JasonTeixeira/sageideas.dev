'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

export interface DocModalOrg {
  id: string;
  name: string;
}

export interface DocModalEngagement {
  id: string;
  title: string;
  organization_id: string | null;
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function NewDocumentModal({
  organizations,
  engagements,
}: {
  organizations: DocModalOrg[];
  engagements: DocModalEngagement[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [titleDirty, setTitleDirty] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [engagementId, setEngagementId] = useState('');
  const [description, setDescription] = useState('');
  const [share, setShare] = useState(true);

  const filteredEngagements = useMemo(
    () => engagements.filter((e) => !organizationId || e.organization_id === organizationId),
    [engagements, organizationId],
  );

  useEffect(() => {
    if (engagementId && !filteredEngagements.some((e) => e.id === engagementId)) {
      setEngagementId('');
    }
  }, [engagementId, filteredEngagements]);

  function reset() {
    setFile(null);
    setTitle('');
    setTitleDirty(false);
    setOrganizationId('');
    setEngagementId('');
    setDescription('');
    setShare(true);
    setError(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function handleFileChange(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File exceeds 25MB. Please choose a smaller file.');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setError(null);
    setFile(f);
    if (!titleDirty) setTitle(stripExtension(f.name));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2]"
        >
          + Upload document
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#27272a] bg-[#0f0f12] text-[#fafafa] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[#fafafa]">Upload document</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Add a file to an organization. Optionally tie it to an engagement and share with the
            client immediately.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!file) {
              setError('Please choose a file.');
              return;
            }
            if (!organizationId) {
              setError('Please choose an organization.');
              return;
            }
            const fd = new FormData();
            fd.set('file', file);
            fd.set('title', title.trim());
            fd.set('organization_id', organizationId);
            if (engagementId) fd.set('engagement_id', engagementId);
            if (description.trim()) fd.set('description', description.trim());
            fd.set('share', share ? 'true' : 'false');

            start(async () => {
              const res = await fetch('/api/admin/documents', { method: 'POST', body: fd });
              if (!res.ok) {
                const msg = await res
                  .json()
                  .then((j: { error?: string }) => j?.error ?? 'Upload failed')
                  .catch(() => 'Upload failed');
                setError(msg);
                return;
              }
              setOpen(false);
              reset();
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              File (PDF, DOC, DOCX, PNG, JPG · max 25MB)
            </span>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-[#a1a1aa] file:mr-3 file:rounded-lg file:border-0 file:bg-[#06b6d4] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#09090B] hover:file:bg-[#0891B2]"
            />
            {file && (
              <span className="block text-[11px] text-[#71717a]">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Display name
            </span>
            <input
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleDirty(true);
              }}
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
              placeholder="Q3 brand guidelines"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Organization
              </span>
              <select
                required
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              >
                <option value="">Choose…</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Engagement (optional)
              </span>
              <select
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={!organizationId}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] disabled:opacity-50"
              >
                <option value="">None</option>
                {filteredEngagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Description (optional)
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note shown to the client when shared."
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b]"
            />
          </label>

          <label className="flex items-start gap-2 text-xs text-[#a1a1aa]">
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 accent-[#06b6d4]"
            />
            <span>
              Share with client immediately
              <span className="block text-[11px] text-[#52525b]">
                Marks the document as shared and emails the organization&apos;s primary contact.
              </span>
            </span>
          </label>

          {error && <div className="text-xs text-rose-400">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#fafafa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !file}
              className="rounded-lg bg-[#06b6d4] px-4 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] disabled:opacity-50"
            >
              {pending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
