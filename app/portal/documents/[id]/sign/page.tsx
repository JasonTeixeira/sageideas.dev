import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PortalSignForm } from '@/components/portal/portal-sign-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign document' };

interface DocRow {
  id: string;
  title: string;
  body_md: string | null;
  status: string | null;
  organization_id: string | null;
  signing_token: string | null;
  signing_token_expires: string | null;
  signing_token_used: boolean | null;
  signed_at: string | null;
  signature_name: string | null;
  signature_timestamp: string | null;
  signature_hash: string | null;
}

function ErrorPanel({
  heading,
  message,
  testId,
}: {
  heading: string;
  message: string;
  testId?: string;
}) {
  return (
    <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto" data-testid={testId}>
      <Card>
        <CardContent className="p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-base font-semibold text-[#fafafa] mb-1">{heading}</h2>
          <p className="text-sm text-[#a1a1aa] mb-6 max-w-md mx-auto">{message}</p>
          <Link href="/portal/documents">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to documents
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function PortalSignDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; signed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('documents')
    .select(
      'id, title, body_md, status, organization_id, signing_token, signing_token_expires, signing_token_used, signed_at, signature_name, signature_timestamp, signature_hash',
    )
    .eq('id', id)
    .maybeSingle();

  const doc = data as DocRow | null;

  const crumbs = [
    { label: 'Dashboard', href: '/portal' },
    { label: 'Documents', href: '/portal/documents' },
    { label: 'Sign' },
  ];

  if (!doc) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Document not found"
          message="This document is unavailable. If you believe this is wrong, contact sage@sageideas.dev."
          testId="sign-error"
        />
      </>
    );
  }

  if (!ctx.isAdmin && doc.organization_id !== ctx.organizationId) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Access denied"
          message="You do not have access to this document."
          testId="sign-error"
        />
      </>
    );
  }

  if (doc.signing_token_used || doc.status === 'signed' || doc.status === 'countersigned') {
    const justSigned = sp.signed === '1' && doc.status === 'signed';
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div
          className="px-6 lg:px-8 py-12 max-w-2xl mx-auto"
          data-testid={justSigned ? 'sign-success' : 'sign-error'}
        >
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 mx-auto flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
              </div>
              <h2 className="text-base font-semibold text-[#fafafa] mb-1">
                {justSigned ? 'Signed successfully' : 'Already signed'}
              </h2>
              <p className="text-sm text-[#a1a1aa] mb-3">
                This document was signed on{' '}
                {doc.signed_at ? formatDate(doc.signed_at) : 'a previous date'}
                {doc.signature_name ? ` by ${doc.signature_name}` : ''}.
              </p>
              {doc.signature_hash ? (
                <p className="text-[10px] text-[#52525b] font-mono break-all mb-5">
                  SHA-256: {doc.signature_hash}
                </p>
              ) : null}
              <Link href={`/portal/documents/${doc.id}`}>
                <Button size="sm">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to document
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const tokenFromQuery = typeof sp.token === 'string' ? sp.token : null;
  const tokenValid =
    !!doc.signing_token &&
    !!doc.signing_token_expires &&
    new Date(doc.signing_token_expires).getTime() > Date.now() &&
    !doc.signing_token_used;
  const tokenMatches = !!tokenFromQuery && tokenFromQuery === doc.signing_token;

  if (!tokenValid) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Signing link expired"
          message="The signing window for this document has lapsed. Email sage@sageideas.dev for a fresh link."
          testId="sign-error"
        />
      </>
    );
  }
  if (!tokenMatches) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <ErrorPanel
          heading="Invalid token"
          message="This signing link is missing or invalid. Use the link provided in your email."
          testId="sign-error"
        />
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={crumbs} />
      <div
        className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6"
        data-testid="sign-contract-page"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              {doc.title}
            </h1>
            <Badge tone="amber">awaiting signature</Badge>
          </div>
          <p className="text-xs text-[#a1a1aa]">
            Read carefully. Your signature is captured with timestamp, IP, and a SHA-256
            hash of the document body.
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {doc.body_md ? (
              <div className="text-sm leading-relaxed text-[#d4d4d8] whitespace-pre-wrap">
                {doc.body_md}
              </div>
            ) : (
              <p className="text-sm text-[#71717a]">
                This document has no rendered body. Please confirm with sage@sageideas.dev
                before signing.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-medium text-[#fafafa] mb-1">Sign</h2>
            <p className="text-xs text-[#71717a] mb-4">
              By typing your full legal name and confirming below, you agree to be bound
              by this document.
            </p>
            <PortalSignForm documentId={doc.id} token={tokenFromQuery ?? ''} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
