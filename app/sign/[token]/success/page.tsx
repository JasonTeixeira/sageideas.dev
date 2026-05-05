import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SignChrome } from '@/components/sign/sign-chrome';
import { SignedReceipt } from '@/components/sign/signed-receipt';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Signed — Sage Ideas Studio' };

interface DocRow {
  id: string;
  title: string;
  status: string | null;
  signed_at: string | null;
  signature_name: string | null;
  signature_timestamp: string | null;
  signature_hash: string | null;
}

export default async function SignSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('documents')
    .select(
      'id, title, status, signed_at, signature_name, signature_timestamp, signature_hash',
    )
    .eq('signing_token', token)
    .maybeSingle();
  const doc = data as DocRow | null;

  if (!doc) {
    return (
      <SignChrome>
        <div className="max-w-xl mx-auto py-20 px-6">
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-[#fafafa] mb-2">Not found</h1>
            <p className="text-sm text-[#a1a1aa] mb-6">
              We couldn&apos;t find a signing record for this link.
            </p>
            <Link
              href="https://sageideas.dev"
              className="text-xs text-[#22d3ee] hover:text-[#06b6d4]"
            >
              sageideas.dev
            </Link>
          </div>
        </div>
      </SignChrome>
    );
  }

  return (
    <SignChrome>
      <div className="max-w-2xl mx-auto py-12 px-6">
        <SignedReceipt
          title={doc.title}
          signedAt={doc.signed_at}
          signedBy={doc.signature_name}
          timestamp={doc.signature_timestamp}
          hash={doc.signature_hash}
          documentId={doc.id}
        />
        <p className="text-[10px] text-[#52525b] mt-6 text-center">
          Sage Ideas Studio · sage@sageideas.dev · sageideas.dev
        </p>
      </div>
    </SignChrome>
  );
}
