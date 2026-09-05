import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Server-side proxy for Bunny.net storage uploads. The storage access key
// is a server-only secret (BUNNY_STORAGE_ACCESS_KEY, no NEXT_PUBLIC_
// prefix) and never reaches the browser — clients POST the file here and
// this route authenticates the caller (Supabase session), validates
// type/size/path, then PUTs to Bunny with the key.

export const dynamic = 'force-dynamic';

// 10 MB — covers blog featured-media PDFs, cover images, and resumes, and
// stays under the runtime's multipart body ceiling so oversized uploads
// surface as a clean 413 here rather than a parser error.
const MAX_BYTES = 10 * 1024 * 1024;

// No image/svg+xml: an uploaded SVG can carry <script>. Nothing here needs
// SVG uploads, so dropping it removes the vector entirely.
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

// Lowercase segments, "/"-separated, no traversal. e.g. "resume/<uid>",
// "courses/<slug>/covers", "branding/<company>".
const PREFIX_RE = /^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*){0,4}$/;

// Top segment any signed-in user may write to (their own resume). The
// caller's id is forced into the path server-side, so the client cannot
// target another user's namespace.
const SELF_PREFIXES = ['resume'];
const CONTENT_ROLES = new Set(['admin', 'branders', 'internal_hr', 'company_hr']);

function sanitizeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'file';
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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

  // Authorization + path resolution. A `resume/*` upload is pinned to the
  // caller's own id server-side (client-supplied uid is ignored), so no one
  // can write into another user's namespace. Everything else is content
  // management and needs a privileged role.
  const topSegment = prefix.split('/')[0];
  let effectivePrefix: string;
  if (SELF_PREFIXES.includes(topSegment)) {
    effectivePrefix = `resume/${user.id}`;
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!CONTENT_ROLES.has(profile?.role ?? '')) {
      return NextResponse.json({ message: 'Not allowed to upload here' }, { status: 403 });
    }
    effectivePrefix = prefix;
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
