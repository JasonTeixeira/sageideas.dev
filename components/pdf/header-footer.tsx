import { Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

export function PdfHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={pdfStyles.header} fixed>
      <View>
        <Text style={pdfStyles.brandName}>Sage Ideas Studio</Text>
        <Text style={pdfStyles.brandMeta}>sageideas.dev · sage@sageideas.dev</Text>
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 9, color: '#71717a' }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function PdfFooter({ rightLabel }: { rightLabel?: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text>Sage Ideas Studio · sageideas.dev</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${rightLabel ? rightLabel + ' · ' : ''}Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}
