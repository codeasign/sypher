import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

// No CORS guard: compose-authored-course.js calls this directly
// (server-to-server), not the browser. It has no user session to
// authenticate as, so a Bearer-secret header is the verification
// mechanism here, mirroring api/revalidate's blog-webhook check.
export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.COURSES_REVALIDATE_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // { expire: 0 } for immediate expiration -- this is a script-triggered
  // revalidation after a batch write, same reasoning as api/revalidate.
  revalidateTag('courses', { expire: 0 });

  return Response.json({ revalidated: true });
}
