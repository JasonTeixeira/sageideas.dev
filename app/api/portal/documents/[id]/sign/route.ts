import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { CONTRACTS_BUCKET, uploadToBucket } from '@/lib/portal/storage';
import { badRequest, forbidden, fromZodError, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2).max(200),
  token: z.string().min(32).max(128),
});

function clientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function wrapText(text: string, maxLen: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let buf = '';
    for (const word of para.split(' ')) {
      const candidate = buf ? `${buf} ${word}` : word;
      if (candidate.length > maxLen) {
        if (buf) lines.push(buf);
        buf = word;
      } else {
        buf = candidate;
      }
    }
    lines.push(buf);
  }
  return lines;
}

async function buildReceiptPdf(input: {
  title: string;
  name: string;
  documentId: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  hash: string;
  body: string | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let y = 740;
  const left = 56;
  const right = 612 - 56;

  const draw = (text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    const size = opts?.size ?? 11;
    if (y < 60) {
      page = pdf.addPage([612, 792]);
      y = 740;
    }
    page.drawText(text, {
      x: left,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: rgb(...(opts?.color ?? [0.1, 0.1, 0.1])),
      maxWidth: right - left,
    });
    y -= size + 6;
  };

  draw('Sage Ideas Studio', { size: 9, color: [0.4, 0.4, 0.4] });
  y -= 4;
  draw('Signed document receipt', { size: 18, bold: true });
  y -= 6;
  draw(input.title, { size: 13, bold: true });
  y -= 4;
  draw(`Document ID: ${input.documentId}`, { size: 9, color: [0.45, 0.45, 0.45] });
  y -= 14;

  draw('Signer', { size: 10, bold: true });
  draw(input.name);
  y -= 4;
  draw('Signed at', { size: 10, bold: true });
  draw(input.timestamp);
  y -= 4;
  draw('Capture metadata', { size: 10, bold: true });
  draw(`IP: ${input.ip}`);
  for (const line of wrapText(`User-Agent: ${input.userAgent}`, 90)) {
    draw(line, { size: 9, color: [0.3, 0.3, 0.3] });
  }
  y -= 4;
  draw('SHA-256 of signed body', { size: 10, bold: true });
  draw(input.hash, { size: 9, color: [0.3, 0.3, 0.3] });
  y -= 10;

  if (input.body) {
    draw('Document body', { size: 10, bold: true });
    for (const line of wrapText(input.body, 90)) {
      draw(line, { size: 9, color: [0.25, 0.25, 0.25] });
    }
  }

  return pdf.save();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, token } = parsed.data;

  const sbAdmin = supabaseAdmin();
  const { data: doc } = await sbAdmin
    .from('documents')
    .select(
      'id, title, body_md, status, organization_id, signing_token, signing_token_expires, signing_token_used',
    )
    .eq('id', id)
    .maybeSingle();
  if (!doc) return notFound('Document not found');
  if (!ctx.isAdmin && (doc.organization_id as string | null) !== ctx.organizationId) {
    return forbidden();
  }
  if (doc.signing_token !== token) return badRequest('Invalid token');
  if (doc.signing_token_used || doc.status === 'signed' || doc.status === 'countersigned') {
    return NextResponse.json({ error: 'already_signed' }, { status: 409 });
  }
  const expires = doc.signing_token_expires
    ? new Date(doc.signing_token_expires as string).getTime()
    : 0;
  if (expires && expires < Date.now()) {
    return NextResponse.json({ error: 'token_expired' }, { status: 410 });
  }

  const ip = clientIp(req);
  const ua = req.headers.get('user-agent') ?? 'unknown';
  const timestamp = new Date().toISOString();
  const body = (doc.body_md as string | null) ?? '';
  const hash = createHash('sha256').update(`${name}|${timestamp}|${body}`).digest('hex');

  const { error: updErr } = await sbAdmin
    .from('documents')
    .update({
      status: 'signed',
      signed_at: timestamp,
      signature_name: name,
      signature_ip: ip,
      signature_user_agent: ua,
      signature_timestamp: timestamp,
      signature_hash: hash,
      signing_token_used: true,
    })
    .eq('id', doc.id);
  if (updErr) return serverError(updErr.message);

  // Best-effort signature_audits + audit_log writes -- failing here should
  // not surface a 500 to the user; the document is already signed.
  try {
    await sbAdmin.from('signature_audits').insert({
      document_id: doc.id,
      signer_id: ctx.user.id,
      signer_name: name,
      signer_email: ctx.user.email,
      signature_data: hash,
      ip_address: ip,
      user_agent: ua,
    });
  } catch {
    // non-fatal
  }

  try {
    await sbAdmin.from('audit_log').insert({
      action: 'document.signed',
      entity_type: 'document',
      entity_id: doc.id,
      organization_id: doc.organization_id,
      actor_id: ctx.user.id,
      after: {
        document_id: doc.id,
        signer_name: name,
        signed_at: timestamp,
        hash,
      },
    });
  } catch {
    // non-fatal
  }

  // Build + upload signed-receipt PDF. Failure here is logged but does not
  // unwind the signature -- the canonical record lives in the documents row.
  try {
    const pdfBytes = await buildReceiptPdf({
      title: (doc.title as string) ?? 'Document',
      name,
      documentId: doc.id as string,
      ip,
      userAgent: ua,
      timestamp,
      hash,
      body,
    });
    const pdfPath = `${doc.organization_id}/${doc.id}/signed-receipt.pdf`;
    const supabase = await createSupabaseServerClient();
    await uploadToBucket({
      bucket: CONTRACTS_BUCKET,
      path: pdfPath,
      bytes: pdfBytes,
      contentType: 'application/pdf',
      upsert: true,
      supabase,
    });
    await sbAdmin
      .from('documents')
      .update({ signed_pdf_path: pdfPath })
      .eq('id', doc.id);
  } catch (err) {
    console.warn('[portal/sign] signed PDF upload failed', err);
  }

  return NextResponse.json({ ok: true, document_id: doc.id, hash, timestamp });
}
