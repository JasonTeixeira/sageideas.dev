import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

export async function renderPdfBuffer(
  element: ReactElement<DocumentProps>,
): Promise<Buffer> {
  return renderToBuffer(element);
}

export function pdfResponse(buf: Buffer, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '_');
  // Use a fresh ArrayBuffer copy so the Response body is a clean ArrayBuffer
  // (not a SharedArrayBuffer-typed slice from Node's Buffer pool).
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Response(ab, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${safeName}"`,
      'cache-control': 'private, no-store',
    },
  });
}
