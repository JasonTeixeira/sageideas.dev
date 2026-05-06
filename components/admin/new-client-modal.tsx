'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STAGES = ['lead', 'qualified', 'proposal', 'active', 'past', 'cold'] as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function NewClientModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [stage, setStage] = useState<(typeof STAGES)[number]>('lead');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!slugDirty) setSlug(slugify(name));
  }, [name, slugDirty]);

  function reset() {
    setName('');
    setSlug('');
    setSlugDirty(false);
    setContactName('');
    setContactEmail('');
    setStage('lead');
    setNotes('');
    setError(null);
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
          + New client
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#27272a] bg-[#0f0f12] text-[#fafafa] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[#fafafa]">New client</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Add an organization to the CRM. You can refine details after creation.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  name: name.trim(),
                  slug: slug.trim(),
                  primary_contact_name: contactName.trim(),
                  primary_contact_email: contactEmail.trim(),
                  pipeline_stage: stage,
                  notes: notes.trim() || null,
                }),
              });
              if (!res.ok) {
                const msg = await res
                  .json()
                  .then((j: { error?: string }) => j?.error ?? 'Create failed')
                  .catch(() => 'Create failed');
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Organization name
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
                placeholder="Acme Co."
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Slug
              </span>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugDirty(true);
                }}
                pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
                placeholder="acme-co"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Primary contact name
              </span>
              <input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
                placeholder="Jane Doe"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Primary contact email
              </span>
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
                placeholder="jane@acme.co"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Stage
            </span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as (typeof STAGES)[number])}
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Notes
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — not visible to client."
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b]"
            />
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
              disabled={pending}
              className="rounded-lg bg-[#06b6d4] px-4 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] disabled:opacity-50"
            >
              {pending ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
