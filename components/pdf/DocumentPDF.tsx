import { Document, Page, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { MarkdownBlocks } from './markdown-blocks';
import { PdfHeader, PdfFooter } from './header-footer';

export interface DocumentPDFProps {
  title: string;
  body: string;
  type?: string | null;
}

export function DocumentPDF({ title, body, type }: DocumentPDFProps) {
  return (
    <Document title={title} author="Sage Ideas Studio">
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle={type ?? undefined} />
        <Text style={pdfStyles.docTitle}>{title}</Text>
        <MarkdownBlocks source={body} />
        <PdfFooter />
      </Page>
    </Document>
  );
}
