import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SignForm } from '@/components/sign/sign-form';
import { SignedReceipt } from '@/components/sign/signed-receipt';
import { SignChrome } from '@/components/sign/sign-chrome';
import { SignBody } from '@/components/sign/sign-body';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign document — Sage Ideas Studio' };

interface DocRow {
  id: string;
  title: string;
  body_md: string | null;
  status: string | null;
  signed_at: string | null;
  signature_name: string | null;
  signature_timestamp: string | null;
  signature_hash: string | null;
  signing_token: string | null;
  signing_token_expires: string | null;
  signing_token_used: boolean | null;
}

function ErrorPage({ heading, message }: { heading: string; message: string }) {
  return (
    <SignChrome>
      <div className="max-w-xl mx-auto py-20 px-6">
        <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-[#fafafa] mb-2">{heading}</h1>
          <p className="text-sm text-[#a1a1aa] mb-6">{message}</p>
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

export default async function SignTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('documents')
    .select(
      'id, title, body_md, status, signed_at, signature_name, signature_timestamp, signature_hash, signing_token, signing_token_expires, signing_token_used',
    )
    .eq('signing_token', token)
    .maybeSingle();

  const doc = data as DocRow | null;

  if (!doc) {
    return (
      <ErrorPage
        heading="Link not found"
        message="This signing link is invalid or has been revoked. If you believe this is wrong, contact sage@sageideas.dev with the link you received."
      />
    );
  }

  if (doc.status === 'signed' || doc.signing_token_used) {
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
        </div>
      </SignChrome>
    );
  }

  const expiresAt = doc.signing_token_expires ? new Date(doc.signing_token_expires) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return (
      <ErrorPage
        heading="Link expired"
        message="This signing link expired. Email sage@sageideas.dev and we'll send a fresh one."
      />
    );
  }

  return (
    <SignChrome>
      <div className="max-w-3xl mx-auto py-10 px-6">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest font-mono text-[#71717a]">
            Sage Ideas Studio
          </p>
          <h1 className="text-2xl font-semibold text-[#fafafa] mt-1">{doc.title}</h1>
          <p className="text-xs text-[#71717a] mt-1">
            Read carefully. Type your full legal name and confirm you intend to be
            bound. Your signature is recorded with timestamp, IP, and a SHA-256 hash
            of the document.
          </p>
        </header>

        <SignBody body={doc.body_md ?? ''} />

        <div className="mt-8 rounded-xl border border-[#27272a] bg-[#0f0f12] p-6">
          <SignForm token={token} documentTitle={doc.title} />
        </div>

        <p className="text-[10px] text-[#52525b] mt-6 text-center">
          Sage Ideas Studio · sage@sageideas.dev · sageideas.dev
        </p>
      </div>
    </SignChrome>
  );
}
