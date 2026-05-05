import { Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './styles';

/**
 * Tiny markdown subset → react-pdf primitives.
 * Supports: # / ## / ### headings, paragraphs, blank lines as breaks,
 * - / * bullet lists, **bold** inline, _italic_ inline.
 * Tables and complex blocks fall back to plain text — fine for our templates.
 */

interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function parseInline(line: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let i = 0;
  while (i < line.length) {
    if (line.startsWith('**', i)) {
      const end = line.indexOf('**', i + 2);
      if (end !== -1) {
        runs.push({ text: line.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    if (line[i] === '_') {
      const end = line.indexOf('_', i + 1);
      if (end !== -1 && end !== i + 1) {
        runs.push({ text: line.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    // walk to next special
    let next = line.length;
    const candidates = ['**', '_'];
    for (const c of candidates) {
      const idx = line.indexOf(c, i);
      if (idx !== -1 && idx < next) next = idx;
    }
    runs.push({ text: line.slice(i, next) });
    i = next;
  }
  if (runs.length === 0) runs.push({ text: '' });
  return runs;
}

function InlineText({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontFamily: r.bold
              ? 'Helvetica-Bold'
              : r.italic
                ? 'Helvetica-Oblique'
                : 'Helvetica',
          }}
        >
          {r.text}
        </Text>
      ))}
    </>
  );
}

export function MarkdownBlocks({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(
        <Text key={key++} style={pdfStyles.h3}>
          <InlineText runs={parseInline(line.slice(4))} />
        </Text>,
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <Text key={key++} style={pdfStyles.h2}>
          <InlineText runs={parseInline(line.slice(3))} />
        </Text>,
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <Text key={key++} style={pdfStyles.h1}>
          <InlineText runs={parseInline(line.slice(2))} />
        </Text>,
      );
      i++;
      continue;
    }

    // Bulleted list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trimEnd())) {
        items.push(lines[i].trimEnd().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <View key={key++} style={{ marginBottom: 6 }}>
          {items.map((it, j) => (
            <View key={j} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>•</Text>
              <Text style={{ flex: 1 }}>
                <InlineText runs={parseInline(it)} />
              </Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trimEnd())) {
        items.push(lines[i].trimEnd().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <View key={key++} style={{ marginBottom: 6 }}>
          {items.map((it, j) => (
            <View key={j} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>{j + 1}.</Text>
              <Text style={{ flex: 1 }}>
                <InlineText runs={parseInline(it)} />
              </Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    // Skip table rows + horizontal rules (render as plain lines)
    if (line.startsWith('|') || /^---+$/.test(line.trim())) {
      blocks.push(
        <Text key={key++} style={pdfStyles.paragraph}>
          {line.replace(/\|/g, ' ').trim()}
        </Text>,
      );
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines.
    const para: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i].trimEnd();
      if (!l.trim()) break;
      if (
        l.startsWith('# ') ||
        l.startsWith('## ') ||
        l.startsWith('### ') ||
        /^[-*]\s+/.test(l) ||
        /^\d+\.\s+/.test(l) ||
        l.startsWith('|')
      ) {
        break;
      }
      para.push(l);
      i++;
    }
    blocks.push(
      <Text key={key++} style={pdfStyles.paragraph}>
        <InlineText runs={parseInline(para.join(' '))} />
      </Text>,
    );
  }

  return <>{blocks}</>;
}
