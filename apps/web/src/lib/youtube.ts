// Accepts what an author is likely to paste -- a full watch/share/embed URL
// in any of YouTube's common shapes, or a bare 11-character video ID typed
// directly -- and returns just the ID, or null if it doesn't look like a
// YouTube URL/ID at all.
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!/(^|\.)youtube(-nocookie)?\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;

  if (url.hostname.includes('youtu.be')) {
    const id = url.pathname.slice(1);
    return /^[\w-]{11}$/.test(id) ? id : null;
  }

  const vParam = url.searchParams.get('v');
  if (vParam && /^[\w-]{11}$/.test(vParam)) return vParam;

  const embedMatch = /\/embed\/([\w-]{11})/.exec(url.pathname);
  if (embedMatch) return embedMatch[1];

  const shortsMatch = /\/shorts\/([\w-]{11})/.exec(url.pathname);
  if (shortsMatch) return shortsMatch[1];

  return null;
}
