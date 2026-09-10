import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { HttpError } from './errors';

// JSX attributes have already supplied authored descriptions. An explicit
// caption or a short title is a genuine figure caption; the alt attribute is a
// long description for assistive tech and is NOT reused as a visible caption
// (that only duplicates it under the image). Returns undefined when neither an
// authored caption nor title exists, leaving the figure caption-less.
export function diagramCaption(caption?: string | null, title?: string | null): string | undefined {
  const value = [caption, title].find(text => text?.trim())?.trim();
  return value ? decodeDiagramText(value) : undefined;
}

export function decodeDiagramText(value: string): string {
  // Decode once, as JSX/HTML attributes do, without treating the text as markup.
  return value.replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/g, entity => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'",
  })[entity] ?? entity);
}

export function escapeDiagramText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderDiagramFigure(url: string, alt: string, caption?: string | null): string {
  const img = `<img src="${escapeDiagramText(url)}" alt="${escapeDiagramText(decodeDiagramText(alt))}" />`;
  const trimmed = caption?.trim();
  const figcaption = trimmed ? `<figcaption>${escapeDiagramText(trimmed)}</figcaption>` : '';
  return `<figure>${img}${figcaption}</figure>`;
}

type HtmlNode = DefaultTreeAdapterMap['node'];
function textContent(node: HtmlNode): string {
  if ('value' in node) return node.value;
  return 'childNodes' in node ? node.childNodes.map(textContent).join('') : '';
}

export function assertImportedDiagramCaptions(body?: string): void {
  if (!body || !body.includes('/svgs/')) return;
  let fence: { char: string; length: number } | undefined;
  const html = body.split(/\r?\n/).filter(line => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (match) {
      if (!fence) fence = { char: match[1][0], length: match[1].length };
      else if (match[1][0] === fence.char && match[1].length >= fence.length && !match[2].trim()) fence = undefined;
      return false;
    }
    return !fence;
  }).join('\n');
  function walk(node: HtmlNode, figure?: DefaultTreeAdapterMap['element']): void {
    if ('tagName' in node) {
      if (node.tagName === 'figure') figure = node;
      if (node.tagName === 'img' && node.attrs.some(a => a.name === 'src' && /\/svgs\/.*\.svg(?:[?#]|$)/i.test(a.value))) {
        if (!figure) {
          throw new HttpError(400, 'Imported diagram image must be wrapped in a <figure>');
        }
        // A caption is optional (some source diagrams have only alt text), but a
        // present <figcaption> must be single and non-empty.
        const captions = figure.childNodes.filter(n => 'tagName' in n && n.tagName === 'figcaption');
        if (captions.length > 1) {
          throw new HttpError(400, 'Imported diagram figure must not have multiple <figcaption> elements');
        }
        if (captions.length === 1 && !textContent(captions[0]).trim()) {
          throw new HttpError(400, 'Imported diagram <figcaption> must not be empty');
        }
      }
    }
    if ('childNodes' in node) for (const child of node.childNodes) walk(child, figure);
  }
  walk(parseFragment(html));
}
