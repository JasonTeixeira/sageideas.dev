'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateUserRole,
  updateUserStatus,
  removeUser,
} from '@/app/admin/users/actions';

const ROLE_OPTIONS = ['admin', 'collaborator', 'client', 'pending'] as const;

export interface UserRowProps {
  id: string;
  email: string;
  fullName: string | null;
  appRole: string | null;
  approvalStatus: string | null;
  isSelf: boolean;
}

export function UserRowActions({ user }: { user: UserRowProps }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const role = user.appRole ?? 'pending';
  const isApproved = user.approvalStatus === 'approved';

  function changeRole(next: string) {
    if (next === role) return;
    setError(null);
    start(async () => {
      const res = await updateUserRole({ id: user.id, app_role: next });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function toggleStatus() {
    setError(null);
    start(async () => {
      const res = await updateUserStatus({
        id: user.id,
        approval_status: isApproved ? 'pending' : 'approved',
      });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    start(async () => {
      const res = await removeUser({ id: user.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRemoveOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center justify-end gap-2">
      {error && (
        <span
          className="text-[10px] text-rose-400 truncate max-w-[160px]"
          title={error}
        >
          {error}
        </span>
      )}
      <select
        aria-label="Role"
        value={role}
        disabled={pending || user.isSelf}
        onChange={(e) => changeRole(e.target.value)}
        className="rounded-md border border-[#27272A] bg-[#0A0A0C] px-2 py-1 text-xs text-[#FAFAFA] disabled:opacity-50 focus:border-[#06B6D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || user.isSelf}
        onClick={toggleStatus}
        className={`rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-widest disabled:opacity-50 transition-colors ${
          isApproved
            ? 'border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/15'
            : 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15'
        }`}
        title={isApproved ? 'Pause access' : 'Reactivate access'}
      >
        {isApproved ? 'Deactivate' : 'Reactivate'}
      </button>
      <button
        type="button"
        disabled={pending || user.isSelf}
        onClick={() => setRemoveOpen(true)}
        className="rounded-md border border-[#3F3F46]/60 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-rose-300 hover:border-rose-500/60 hover:bg-rose-500/10 disabled:opacity-30"
      >
        Remove
      </button>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="border-[#27272a] bg-[#0f0f12] text-[#fafafa]">
          <DialogHeader>
            <DialogTitle>Remove user</DialogTitle>
            <DialogDescription>
              {user.fullName || user.email} will lose access. Their auth account stays intact so
              audit history is preserved; reactivate later from this page if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRemoveOpen(false)}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleRemove}
              className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {pending ? 'Removing…' : 'Remove'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
