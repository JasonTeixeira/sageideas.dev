import { NextResponse } from 'next/server';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireAdminApi } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function textFromHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text: string, max = 88) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (`${line} ${word}`.trim().length > max) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) lines.push(line);
    lines.push('');
  }
  return lines;
}

async function buildPdf(content: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 744;
  const lines = wrapText(textFromHtml(content), 92);
  for (const line of lines) {
    if (y < 54) {
      page = pdf.addPage([612, 792]);
      y = 744;
    }
    const isHeading = line.startsWith('#') || line === line.toUpperCase() && line.length > 12;
    page.drawText(line.replace(/^#+\s*/, ''), {
      x: 54,
      y,
      size: isHeading ? 13 : 10,
      font: isHeading ? bold : font,
      color: isHeading ? rgb(0.04, 0.29, 0.36) : rgb(0.08, 0.08, 0.09),
    });
    y -= line ? 15 : 8;
  }
  return Buffer.from(await pdf.save());
}

async function buildDocx(content: string) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    archive.on('error', reject);
  });
  archive.pipe(stream);
  archive.append(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`, { name: '[Content_Types].xml' });
  archive.append(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`, { name: '_rels/.rels' });
  const paragraphs = wrapText(textFromHtml(content), 96)
    .filter((line) => line.length > 0)
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line.replace(/^#+\s*/, ''))}</w:t></w:r></w:p>`)
    .join('');
  archive.append(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`, { name: 'word/document.xml' });
  await archive.finalize();
  return done;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: artifact, error } = await sb
    .from('job_os_resume_artifacts')
    .select('filename, artifact_type, content')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!artifact) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const format = new URL(request.url).searchParams.get('format');
  if (format === 'pdf') {
    const pdf = await buildPdf(artifact.content);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${artifact.filename.replace(/\.[^.]+$/, '')}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  }
  if (format === 'docx') {
    const docx = await buildDocx(artifact.content);
    return new Response(new Uint8Array(docx), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'content-disposition': `attachment; filename="${artifact.filename.replace(/\.[^.]+$/, '')}.docx"`,
        'cache-control': 'no-store',
      },
    });
  }

  const mimeType = artifact.artifact_type === 'pdf_ready_html'
    ? 'text/html; charset=utf-8'
    : artifact.artifact_type === 'docx_manifest'
      ? 'application/json; charset=utf-8'
      : 'text/markdown; charset=utf-8';

  return new Response(artifact.content, {
    headers: {
      'content-type': mimeType,
      'content-disposition': `attachment; filename="${artifact.filename}"`,
      'cache-control': 'no-store',
    },
  });
}
