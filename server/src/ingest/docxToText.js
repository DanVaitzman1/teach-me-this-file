import mammoth from 'mammoth';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { transcribe } from '../ai/transcribe.js';
import { AppError } from '../errors.js';

const needsPdf = () => new AppError(422, 'DOCX_NEEDS_PDF', 'This Word file contains equations or unsupported drawings. Export it as PDF to preserve them.');

// Inspect before Mammoth: it ignores native Word equations. Refuse that input
// with a recovery path rather than teaching a document with missing formulas.
export async function docxToText(buffer, { apiKey, signal } = {}) {
  const zip = await JSZip.loadAsync(buffer);
  // JSZip 3.10 exposes central-directory sizes on its compressed entries.
  // Check before inflation, including unused media, to bound compressed DOCX input.
  const unpacked = Object.values(zip.files).reduce((sum, entry) => sum + (entry._data?.uncompressedSize ?? 0), 0);
  if (unpacked > 50 * 1024 * 1024) throw new AppError(413, 'DOCX_EXPANDED_TOO_LARGE', 'This Word file expands beyond 50 MB. Export a chapter as PDF.');
  if (Object.keys(zip.files).filter((name) => /^word\/media\//.test(name) && !zip.files[name].dir).length > 20) throw needsPdf();
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('Missing Word document');
  if (/<(?:\w+:)?(?:oMath|oMathPara|pict)\b/.test(xml)) throw needsPdf();

  let images = 0;
  let imageError;
  let imageQueue = Promise.resolve();
  const imageTexts = [];
  const { value: html, messages } = await mammoth.convertToHtml({ buffer }, {
    // A shared serial queue prevents a Word document's many images from starting
    // unbounded concurrent AI calls. Placeholders retain each image's position.
    convertImage: mammoth.images.imgElement((image) => {
      const index = images++;
      const task = imageQueue.then(async () => {
        signal?.throwIfAborted();
        if (imageError) throw imageError;
        if (index >= 20 || !['image/png', 'image/jpeg', 'image/webp'].includes(image.contentType)) throw needsPdf();
        const pages = await transcribe({ apiKey, buffer: await image.readAsBuffer(), mimeType: image.contentType, signal });
        imageTexts[index] = pages.map((page) => page.text).join('\n\n');
        return { src: `extracted-image-${index}` };
      }).catch((err) => { imageError ??= err; return { src: `extracted-image-${index}` }; });
      imageQueue = task;
      return task;
    }),
  });
  if (imageError) throw imageError;
  if (messages.some((message) => message.type === 'error')) throw needsPdf();
  // Unknown Word structures can contain teaching material; do not silently omit them.
  if (messages.some((message) => /unrecognised element.*(?:chart|object|drawing|AlternateContent)/i.test(message.message))) throw needsPdf();
  return { text: htmlToMarkdown(html, imageTexts).trim(), images };
}

export function htmlToMarkdown(html, imageTexts = []) {
  const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  function children(node) { return Array.from(node.childNodes ?? []).map(render).join(''); }
  function render(node) {
    if (node.nodeType === 3) return node.data;
    const tag = node.nodeName.toLowerCase();
    if (tag === 'img') {
      const index = Number(node.getAttribute('src').replace('extracted-image-', ''));
      return `\n\n${imageTexts[index] ?? ''}\n\n`;
    }
    if (tag === 'table') return `\n\n${table(node)}\n\n`;
    if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${children(node)}\n\n`;
    if (tag === 'p') return `${children(node)}\n\n`;
    if (tag === 'li') return `- ${children(node).trim()}\n`;
    if (tag === 'br') return '\n';
    if (tag === 'sup' || tag === 'sub') return `$${tag === 'sup' ? '^' : '_'}{${children(node)}}$`;
    return children(node);
  }
  function table(node) {
    // Only immediate rows belong to this table; nested rows stay in their cell.
    const rows = Array.from(node.childNodes).flatMap((child) =>
      /^(tbody|thead|tfoot)$/i.test(child.nodeName) ? Array.from(child.childNodes) : [child])
      .filter((child) => child.nodeName.toLowerCase() === 'tr')
      .map((row) => Array.from(row.childNodes).filter((child) => /^(td|th)$/i.test(child.nodeName))
        .map((cell) => children(cell).trim().replace(/\n+/g, ' / ').replace(/\|/g, '\\|')));
    if (!rows.length) return '';
    const width = Math.max(...rows.map((row) => row.length));
    const line = (cells) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
    return [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n');
  }
  return render(document.documentElement).replace(/\n{3,}/g, '\n\n');
}
