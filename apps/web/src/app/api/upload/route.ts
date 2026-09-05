import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/serverApi';

// Server-side proxy for Bunny.net storage uploads. The storage access key
// is a server-only secret (BUNNY_STORAGE_ACCESS_KEY, no NEXT_PUBLIC_
// prefix) and never reaches the browser — clients POST the file here and
// this route authenticates the caller, validates type/size/path, then PUTs
// to Bunny with the key. Replaces the old pattern where every editor
// shipped the key in the client bundle and PUT straight to Bunny.

// 10 MB — covers blog featured-media PDFs and cover images, and stays
// comfortably under the runtime's multipart body ceiling so oversized
// uploads surface as a clean 413 here rather than a parser error.
const MAX_BYTES = 10 * 1024 * 1024;

// No image/svg+xml: an uploaded SVG can carry <script>, and while Bunny
// serves it from a separate origin, dropping it removes the phishing /
// stored-markup vector entirely. The bundled preset avatars are static
// files in public/, not uploads, so nothing here needs SVG.
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

// Lowercase segments, "/"-separated, no traversal. e.g. "avatars/<id>",
// "courses/<slug>/covers", "blog/featured-media".
const PREFIX_RE = /^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*){0,4}$/;

// Top segments any signed-in user may write to. For these the caller's own
// id is forced into the path server-side (see below) — the client-supplied
// prefix beyond the top segment is ignored, so no one can target another
// user's namespace.
const SELF_PREFIXES = ['avatars', 'users'];
const CONTENT_ROLES = new Set(['ADMIN', 'BRANDER', 'INTERNAL_HR', 'COMPANY_HR']);

function sanitizeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'file';
}

export async function POST(request: Request): Promise<NextResponse> {
  const meRes = await serverApiFetch('/auth/me');
  if (!meRes.ok) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }
  const me = (await meRes.json()) as { id?: string; role?: string };
  if (!me.id) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const zone = process.env.BUNNY_STORAGE_ZONE;
  const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const hostname = process.env.BUNNY_STORAGE_HOSTNAME;
  const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;
  if (!zone || !accessKey || !hostname || !pullZoneUrl) {
    return NextResponse.json({ message: 'Uploads are not configured.' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  const prefix = String(form.get('prefix') ?? '').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }
  if (!PREFIX_RE.test(prefix)) {
    return NextResponse.json({ message: 'Invalid upload path' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: `Unsupported file type${file.type ? `: ${file.type}` : ''}` },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ message: 'File is empty or larger than 10 MB' }, { status: 413 });
  }

  // Authorization + path resolution. Self uploads are pinned to the
  // caller's own id server-side (the client-supplied prefix is only used
  // to pick the top-level bucket) so no one can write into another user's
  // namespace. Everything else is content management and needs a role.
  const topSegment = prefix.split('/')[0];
  let effectivePrefix: string;
  if (SELF_PREFIXES.includes(topSegment)) {
    effectivePrefix = `avatars/${me.id}`;
  } else if (CONTENT_ROLES.has(me.role ?? '')) {
    effectivePrefix = prefix;
  } else {
    return NextResponse.json({ message: 'Not allowed to upload here' }, { status: 403 });
  }

  const path = `${effectivePrefix}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const put = await fetch(`https://${hostname}/${zone}/${path}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!put.ok) {
    return NextResponse.json({ message: `Storage upload failed (${put.status})` }, { status: 502 });
  }

  return NextResponse.json({ url: `${pullZoneUrl.replace(/\/$/, '')}/${path}` });
}
