import { NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/serverApi';
import { summarizeZip, isZipBomb } from '@/lib/zipGuard';

// Server-side proxy for Bunny.net storage uploads. The storage access key
// is a server-only secret (BUNNY_STORAGE_ACCESS_KEY, no NEXT_PUBLIC_
// prefix) and never reaches the browser — clients POST the file here and
// this route authenticates the caller, validates type/size/path, then PUTs
// to Bunny with the key. Replaces the old pattern where every editor
// shipped the key in the client bundle and PUT straight to Bunny.

// Configurable via .env (user request 2026-09-16) rather than hardcoded —
// MB values, converted to bytes below. Falls back to the previous
// defaults if unset/invalid so this never silently disables the caps.
function mbFromEnv(name: string, fallbackMb: number): number {
  const parsed = Number.parseFloat(process.env[name] ?? '');
  return (Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMb) * 1024 * 1024;
}

// 10 MB — covers blog featured-media PDFs and cover images, and stays
// comfortably under the runtime's multipart body ceiling so oversized
// uploads surface as a clean 413 here rather than a parser error.
const MAX_BYTES = mbFromEnv('UPLOAD_MAX_MB', 10);

// Manage Videos' video-file uploads (mp4 only, capped at 50 MB by default).
const MAX_VIDEO_BYTES = mbFromEnv('UPLOAD_MAX_VIDEO_MB', 50);

// Video resource downloads (zip only). Capped well short of the general
// limit by default since resource attachments are meant to be small
// handouts, not bulk archives.
const MAX_ZIP_BYTES = mbFromEnv('UPLOAD_MAX_ZIP_MB', 10);
// Zip-bomb guard thresholds — see lib/zipGuard.ts. 200 MB uncompressed is
// generous for a resource handout; 100x is well above ordinary
// compression ratios for real documents (typically 2-10x) but far below
// what a crafted bomb reaches (often 1000x+).
const MAX_ZIP_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_ZIP_RATIO = 100;

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
  'video/mp4',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
]);

const VIDEO_TYPES = new Set(['video/mp4']);
const ZIP_TYPES = new Set(['application/zip', 'application/x-zip-compressed', 'application/x-zip']);

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
  const isVideo = VIDEO_TYPES.has(file.type);
  const isZip = ZIP_TYPES.has(file.type);
  const sizeLimit = isVideo ? MAX_VIDEO_BYTES : isZip ? MAX_ZIP_BYTES : MAX_BYTES;
  if (file.size <= 0 || file.size > sizeLimit) {
    return NextResponse.json({ message: `File is empty or larger than ${Math.round(sizeLimit / (1024 * 1024))} MB` }, { status: 413 });
  }

  const fileArrayBuffer = await file.arrayBuffer();
  if (isZip) {
    const summary = summarizeZip(Buffer.from(fileArrayBuffer));
    if (!summary) {
      return NextResponse.json({ message: 'Not a valid zip file' }, { status: 415 });
    }
    if (isZipBomb(summary, MAX_ZIP_UNCOMPRESSED_BYTES, MAX_ZIP_RATIO)) {
      return NextResponse.json({ message: 'Zip rejected — its contents are too large or too compressed to be legitimate' }, { status: 413 });
    }
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
    body: fileArrayBuffer,
  });

  if (!put.ok) {
    return NextResponse.json({ message: `Storage upload failed (${put.status})` }, { status: 502 });
  }

  return NextResponse.json({ url: `${pullZoneUrl.replace(/\/$/, '')}/${path}` });
}
