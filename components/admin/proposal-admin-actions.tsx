'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/portal/ui/button';
import { Card, CardContent } from '@/components/portal/ui/card';
import { ExternalLink, Send, X } from 'lucide-react';

export function ProposalAdminActions({
  proposalId,
  status,
  portalLink,
  recipientEmail,
  resultingEngagementId,
  resultingInvoiceId,
}: {
  proposalId: string;
  status: string;
  portalLink: string | null;
  recipientEmail: string | null;
  resultingEngagementId: string | null;
  resultingInvoiceId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: 'send' | 'withdraw' | 'mark_expired') {
    setError(null);
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body:
          action === 'send'
            ? JSON.stringify({ send: true })
            : JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const isFinal = status === 'accepted' || status === 'declined';
  const canSend = !isFinal;
  const canWithdraw = status === 'sent' || status === 'viewed' || status === 'draft';

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <h2 className="text-sm font-medium text-[#fafafa]">Actions</h2>
        {portalLink ? (
          <p className="text-xs text-[#71717a]">
            Acceptance link:{' '}
            <Link
              href={portalLink}
              className="text-[#22d3ee] hover:text-[#67e8f9] break-all"
              target="_blank"
            >
              {portalLink} <ExternalLink className="w-3 h-3 inline" />
            </Link>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canSend ? (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => call('send')}
              data-testid="admin-proposal-resend"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              {status === 'draft'
                ? recipientEmail
                  ? `Send to ${recipientEmail}`
                  : 'Send'
                : 'Resend'}
            </Button>
          ) : null}
          {canWithdraw ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => call('withdraw')}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Withdraw
            </Button>
          ) : null}
          {!isFinal && status !== 'expired' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => call('mark_expired')}
            >
              Mark expired
            </Button>
          ) : null}
        </div>
        {resultingEngagementId ? (
          <p className="text-xs text-[#71717a]">
            ↳ Engagement:{' '}
            <Link
              href={`/admin/crm/${resultingEngagementId}`}
              className="text-[#22d3ee] hover:text-[#67e8f9]"
            >
              {resultingEngagementId}
            </Link>
          </p>
        ) : null}
        {resultingInvoiceId ? (
          <p className="text-xs text-[#71717a]">
            ↳ Invoice:{' '}
            <Link
              href={`/admin/invoices/${resultingInvoiceId}`}
              className="text-[#22d3ee] hover:text-[#67e8f9]"
            >
              {resultingInvoiceId}
            </Link>
          </p>
        ) : null}
        {error ? <p className="text-xs text-[#f43f5e]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
