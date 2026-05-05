import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { MarkdownBlocks } from './markdown-blocks';
import { PdfHeader, PdfFooter } from './header-footer';

export interface ContractPDFProps {
  title: string;
  body: string;
  signature?: {
    name: string | null;
    timestamp: string | null;
    ip: string | null;
    userAgent: string | null;
    hash: string | null;
  } | null;
}

export function ContractPDF({ title, body, signature }: ContractPDFProps) {
  return (
    <Document title={title} author="Sage Ideas Studio">
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle={title} />
        <Text style={pdfStyles.docTitle}>{title}</Text>
        <MarkdownBlocks source={body} />

        {signature ? (
          <View style={pdfStyles.receipt} wrap={false}>
            <Text style={pdfStyles.receiptHeading}>Signature receipt</Text>
            <View style={pdfStyles.receiptRow}>
              <Text style={pdfStyles.receiptLabel}>Signed by</Text>
              <Text style={pdfStyles.receiptValue}>{signature.name ?? '—'}</Text>
            </View>
            <View style={pdfStyles.receiptRow}>
              <Text style={pdfStyles.receiptLabel}>Timestamp</Text>
              <Text style={pdfStyles.receiptValue}>
                {signature.timestamp ?? '—'}
              </Text>
            </View>
            <View style={pdfStyles.receiptRow}>
              <Text style={pdfStyles.receiptLabel}>IP address</Text>
              <Text style={pdfStyles.receiptValue}>{signature.ip ?? '—'}</Text>
            </View>
            <View style={pdfStyles.receiptRow}>
              <Text style={pdfStyles.receiptLabel}>User agent</Text>
              <Text style={pdfStyles.receiptValue}>
                {signature.userAgent ?? '—'}
              </Text>
            </View>
            <View style={pdfStyles.receiptRow}>
              <Text style={pdfStyles.receiptLabel}>SHA-256</Text>
              <Text style={pdfStyles.receiptValue}>{signature.hash ?? '—'}</Text>
            </View>
          </View>
        ) : null}

        <PdfFooter rightLabel={signature ? 'Signed' : 'Draft'} />
      </Page>
    </Document>
  );
}
