import type { Request, Response } from 'express';
import { VideoRepository } from '../repositories/VideoRepository';
import { resolveOptionalUser } from './tsoaAuth';
import { signBunnyUrl } from './bunnySign';
import { env } from './env';
import { createLogger } from './logger';

const logger = createLogger('videoStream');
const videoRepository = new VideoRepository();

// The whole point of this route (user request 2026-09-16: "URL should not
// be exposed at all"): the browser's <video src> only ever points at OUR
// domain (/videos/{slug}/stream). The real Bunny pull-zone URL is fetched
// server-side and never appears in any client-visible response, DOM
// attribute, or JS variable — there is nothing in the page for a viewer to
// read out of DevTools/view-source, unlike a signed-URL approach where the
// (time-limited) URL is still sitting right there in the HTML/JSON.
//
// Two lightweight gates layered on top of that, since this bypasses tsoa's
// @Security entirely (raw Express route, registered before RegisterRoutes
// in server.ts — needed for direct control over Range/206 passthrough,
// which tsoa's JSON-response model doesn't support):
//   1. Session cookie required — same-site subresource requests (video/img)
//      carry cookies automatically, so a signed-in browser tab just works;
//      a bare URL pasted into curl/another browser with no session does not.
//   2. Referer must be one of our own origins — blocks the common "some
//      other site hotlinks the stream URL" case. Spoofable by a determined
//      caller with control over request headers (curl, a script) — this is
//      a deterrent against casual reuse, not a cryptographic guarantee.
function isAllowedReferer(req: Request): boolean {
  const referer = req.headers.referer ?? req.headers.origin;
  if (!referer) return false;
  try {
    const origin = new URL(referer).origin;
    return env.corsOrigins.some((allowed) => origin === allowed.trim());
  } catch {
    return false;
  }
}

export async function videoStreamHandler(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug;

  const user = await resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  if (!isAllowedReferer(req)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const video = await videoRepository.findBySlugPublished(slug);
  if (!video || !video.videoUrl) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const upstreamUrl = signBunnyUrl(video.videoUrl, 60);
  const range = req.headers.range;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: range ? { Range: range } : undefined,
    });
  } catch (error) {
    logger.error('Upstream fetch failed', error);
    res.status(502).json({ message: 'Could not reach video storage' });
    return;
  }

  if (!upstream.ok && upstream.status !== 206) {
    res.status(upstream.status === 404 ? 404 : 502).json({ message: 'Could not load video' });
    return;
  }

  res.status(upstream.status);
  const passthroughHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  // Never let an intermediary (or the browser disk cache) persist a copy
  // keyed by a URL that's otherwise invisible — every request re-checks
  // auth above instead.
  res.setHeader('Cache-Control', 'private, no-store');
  // helmet()'s default Cross-Origin-Resource-Policy: same-origin (set
  // globally in server.ts) silently blocks the browser's own <video>
  // element from playing this — apps/web (next.sypher.local) embedding a
  // video from apps/api (api-next.sypher.local) IS a cross-origin embed by
  // definition, that's the whole point of this route. curl doesn't
  // enforce CORP (it's a browser rendering-layer policy), so this bug
  // only showed up as an unexplained infinite "stalled" <video> with zero
  // network activity in a real browser, never in a direct HTTP test
  // (found 2026-09-16 chasing exactly that report). Referer/Origin allow-
  // listing above is what actually gates who can embed this, same as
  // before.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (!upstream.body) {
    res.end();
    return;
  }
  const reader = upstream.body.getReader();
  req.on('close', () => {
    reader.cancel().catch(() => {});
  });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise<void>((resolve) => res.once('drain', resolve));
      }
    }
  } catch (error) {
    logger.error('Stream relay failed', error);
  } finally {
    res.end();
  }
}
