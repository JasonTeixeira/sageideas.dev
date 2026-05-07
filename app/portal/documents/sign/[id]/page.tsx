import Link from 'next/link';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign document' };

interface DocRow {
  id: string;
  title: string;
  status: string | null;
  organization_id: string | null;
  signing_token: string | null;
  signing_token_expires: string | null;
  signing_token_used: boolean | null;
}

function NotAvailable({ message }: { message: string }) {
  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Documents', href: '/portal/documents' },
          { label: 'Sign' },
        ]}
      />
      <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-sm text-[#a1a1aa] mb-6 max-w-md mx-auto">{message}</p>
            <Link href="/portal/documents">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default async function SignDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('documents')
    .select(
      'id, title, status, organization_id, signing_token, signing_token_expires, signing_token_used',
    )
    .eq('id', id)
    .maybeSingle();

  const doc = data as DocRow | null;
  if (!doc) {
    return <NotAvailable message="Document not found." />;
  }
  if (!ctx.isAdmin && doc.organization_id !== ctx.organizationId) {
    return <NotAvailable message="You do not have access to this document." />;
  }

  if (doc.status === 'signed' || doc.signing_token_used) {
    redirect('/portal/documents');
  }

  let token = doc.signing_token;
  const stillValid =
    !!token &&
    !!doc.signing_token_expires &&
    new Date(doc.signing_token_expires).getTime() > Date.now() &&
    !doc.signing_token_used;

  if (!stillValid) {
    token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    await sb
      .from('documents')
      .update({
        signing_token: token,
        signing_token_expires: expires.toISOString(),
        signing_token_used: false,
      })
      .eq('id', doc.id);
  }

  redirect(`/portal/documents/${doc.id}/sign?token=${token}`);
}
