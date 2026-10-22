import mammoth from 'mammoth';

// mammoth's plain-text output puts every table cell on its own line, so a
// table becomes a long column of numbers. Its HTML output keeps the structure,
// and mammoth's HTML is simple and regular, so a few replacements turn it into
// Markdown: headings, list items, paragraphs and tables.
export async function docxToText(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return decodeEntities(
    html
      .replace(/<table>([\s\S]*?)<\/table>/g, (_, table) => `\n\n${tableToMarkdown(table)}\n\n`)
      .replace(/<h([1-6])>/g, (_, level) => `\n\n${'#'.repeat(Number(level))} `)
      .replace(/<li>/g, '\n- ')
      .replace(/<\/(p|h[1-6]|ul|ol)>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tableToMarkdown(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) =>
    [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(([, cell]) =>
      cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim(),
    ),
  );
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((row) => row.length));
  const line = (cells) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
  // The first row is the header: Markdown tables need one.
  return [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n');
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
