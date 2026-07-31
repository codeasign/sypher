import GithubSlugger from 'github-slugger';

export interface ExtractedHeading {
  id: string;
  text: string;
  level: number;
}

const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*#*$/;
const CODE_FENCE = /^```/;

function toPlainText(raw: string): string {
  return raw
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

// Walks every heading (h1-h6) through the slugger, same as rehype-slug does
// when it renders the body, so dedup suffixes ("-1", "-2", ...) land on the
// same ids here as in the rendered DOM -- even though only h2/h3 are kept
// for the TOC list itself. Skipping h1/h4-h6 from this walk would desync
// the slugger's counter from what rehype-slug produces.
export function extractHeadings(markdown: string): ExtractedHeading[] {
  const slugger = new GithubSlugger();
  const result: ExtractedHeading[] = [];
  let inCodeFence = false;

  for (const line of (markdown ?? '').split('\n')) {
    if (CODE_FENCE.test(line.trim())) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = HEADING_LINE.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = toPlainText(match[2]);
    if (!text) continue;

    const id = slugger.slug(text);
    if (level === 2 || level === 3) {
      result.push({ id, text, level });
    }
  }

  return result;
}
