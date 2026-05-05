import { CheckCircle2, Download } from 'lucide-react';

export function SignedReceipt({
  title,
  signedAt,
  signedBy,
  timestamp,
  hash,
  documentId,
}: {
  title: string;
  signedAt: string | null;
  signedBy: string | null;
  timestamp: string | null;
  hash: string | null;
  documentId: string;
}) {
  const when = signedAt || timestamp;
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa]">Signed</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            This document is fully executed. Keep this receipt for your records.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-6">
        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3">
          <dt className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Document
          </dt>
          <dd className="mt-1 text-[#fafafa] break-words">{title}</dd>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3">
          <dt className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Signed by
          </dt>
          <dd className="mt-1 text-[#fafafa]">{signedBy ?? '—'}</dd>
        </div>
        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3">
          <dt className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Timestamp
          </dt>
          <dd className="mt-1 text-[#fafafa] font-mono">
            {when ? new Date(when).toISOString() : '—'}
          </dd>
        </div>
      </dl>

      {hash && (
        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3 mb-6">
          <dt className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            SHA-256 fingerprint
          </dt>
          <dd className="mt-1 text-[10px] text-[#a1a1aa] font-mono break-all">{hash}</dd>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`/api/contracts/${documentId}/pdf`}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs bg-[#06b6d4] text-[#09090b] font-medium hover:bg-[#22d3ee]"
        >
          <Download className="w-3.5 h-3.5" />
          Download signed PDF
        </a>
      </div>

      <p className="text-[10px] text-[#52525b] mt-6">
        Signature integrity is verified by the SHA-256 fingerprint computed over the
        signer&apos;s name, the timestamp shown, and the full document body. Any change
        to any of those values will produce a different fingerprint.
      </p>
    </div>
  );
}
