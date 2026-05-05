import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { PdfHeader, PdfFooter } from './header-footer';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface InvoicePDFProps {
  number: string;
  status: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  billTo: {
    name: string;
    address?: string | null;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  amountPaid: number | null;
  currency: string;
  notes: string | null;
}

function fmtMoney(n: number | null | undefined, currency: string) {
  const value = typeof n === 'number' ? n : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function InvoicePDF(props: InvoicePDFProps) {
  const {
    number,
    status,
    invoiceDate,
    dueDate,
    billTo,
    lineItems,
    subtotal,
    tax,
    total,
    amountPaid,
    currency,
    notes,
    paidAt,
  } = props;

  return (
    <Document title={`Invoice ${number}`} author="Sage Ideas Studio">
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader subtitle={`Invoice ${number}`} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
          <View>
            <Text style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Bill to
            </Text>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0a0a0c', marginTop: 2 }}>
              {billTo.name}
            </Text>
            {billTo.address ? (
              <Text style={{ fontSize: 9, marginTop: 2 }}>{billTo.address}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={pdfStyles.docTitle}>Invoice {number}</Text>
            <Text style={{ fontSize: 9 }}>Invoice date: {fmtDate(invoiceDate)}</Text>
            <Text style={{ fontSize: 9 }}>Due date: {fmtDate(dueDate)}</Text>
            {status ? (
              <Text
                style={{
                  fontSize: 9,
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: status === 'paid' ? '#059669' : '#0a0a0c',
                }}
              >
                Status: {status}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellDesc]}>Description</Text>
            <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellNum]}>Qty</Text>
            <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellNum]}>Unit</Text>
            <Text style={[pdfStyles.tableHeader, pdfStyles.tableCellNum]}>Amount</Text>
          </View>
          {lineItems.length === 0 ? (
            <View style={pdfStyles.tableRow}>
              <Text style={pdfStyles.tableCellDesc}>No line items.</Text>
              <Text style={pdfStyles.tableCellNum}>—</Text>
              <Text style={pdfStyles.tableCellNum}>—</Text>
              <Text style={pdfStyles.tableCellNum}>—</Text>
            </View>
          ) : (
            lineItems.map((li, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={pdfStyles.tableCellDesc}>{li.description}</Text>
                <Text style={pdfStyles.tableCellNum}>{li.quantity}</Text>
                <Text style={pdfStyles.tableCellNum}>{fmtMoney(li.unit_price, currency)}</Text>
                <Text style={pdfStyles.tableCellNum}>{fmtMoney(li.amount, currency)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={pdfStyles.totalsBlock}>
          <View style={pdfStyles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{fmtMoney(subtotal, currency)}</Text>
          </View>
          <View style={pdfStyles.totalsRow}>
            <Text>Tax</Text>
            <Text>{fmtMoney(tax, currency)}</Text>
          </View>
          <View style={pdfStyles.totalsRowEmphasis}>
            <Text>Total due</Text>
            <Text>{fmtMoney(total, currency)}</Text>
          </View>
          {typeof amountPaid === 'number' && amountPaid > 0 ? (
            <View style={pdfStyles.totalsRow}>
              <Text style={{ color: '#059669' }}>Paid</Text>
              <Text style={{ color: '#059669' }}>{fmtMoney(amountPaid, currency)}</Text>
            </View>
          ) : null}
          {paidAt ? (
            <View style={pdfStyles.totalsRow}>
              <Text style={{ fontSize: 8, color: '#71717a' }}>Paid on</Text>
              <Text style={{ fontSize: 8, color: '#71717a' }}>{fmtDate(paidAt)}</Text>
            </View>
          ) : null}
        </View>

        {notes ? (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notes
            </Text>
            <Text style={{ fontSize: 10, marginTop: 4 }}>{notes}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 9, color: '#71717a' }}>
            Net 14 unless otherwise specified. Late invoices accrue 1.5% per month or
            the legal max, whichever is lower. Reference invoice number {number} on
            payment.
          </Text>
        </View>

        <PdfFooter rightLabel={`Invoice ${number}`} />
      </Page>
    </Document>
  );
}
