import { createHash } from 'node:crypto';
import type { Request as ExpressRequest } from 'express';
import type { Controller } from 'tsoa';

/**
 * Client-side HTTP caching policy, applied consistently across every GET
 * endpoint (audit pass, 2026-09). Four buckets, chosen per endpoint by
 * whether the response is shared/public, personalized, or a frequently-
 * changing shared list — never by convenience. The controller is a FRESH
 * instance per request (tsoa's generated routes.ts does `new XController()`
 * per call), so setHeader here is per-request state, not a shared/leaked
 * singleton.
 *
 * `private, no-store` is the non-negotiable default for anything that
 * reads request.user or otherwise varies per caller — see
 * setPrivateNoStoreCache's own note. When in doubt, that's the one to use.
 */

/** Public, shared, rarely-changing list (course/blog/cohort catalogs). */
export function setPublicListCache(controller: Controller): void {
  controller.setHeader('Cache-Control', 'public, max-age=300');
}

/** Frequently-changing shared list (comments/discussion) — revalidate every time, never reuse blindly. */
export function setPrivateNoCacheCache(controller: Controller): void {
  controller.setHeader('Cache-Control', 'private, no-cache');
}

/**
 * Anything personalized or user-specific — dashboard, "my courses," any
 * endpoint reading request.user. Non-negotiable: a cached response here on
 * a shared/family device could leak one user's data to another. Apply this
 * even when the endpoint LOOKS safe to cache — the rule is "reads
 * request.user," not "looks sensitive."
 */
export function setPrivateNoStoreCache(controller: Controller): void {
  controller.setHeader('Cache-Control', 'private, no-store');
}

/** Weak ETag derived from a resource's version marker (its updatedAt) — never the body. */
export function weakEtagFor(version: Date | string | number): string {
  const raw = version instanceof Date ? version.toISOString() : String(version);
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 16);
  return `W/"${hash}"`;
}

function ifNoneMatchHits(request: ExpressRequest, etag: string): boolean {
  const header = request.headers['if-none-match'];
  if (!header) return false;
  const values = Array.isArray(header) ? header : header.split(',');
  return values.some((v) => v.trim() === etag || v.trim() === '*');
}

/**
 * Public, shared, single-item detail view: max-age=600 plus an ETag built
 * from the resource's updatedAt so a repeat GET after a no-op refresh can
 * 304 instead of re-sending the body. Returns true when the caller's
 * If-None-Match already matches — the controller method should
 * `this.setStatus(304); return;` in that case (same `| void` early-return
 * shape this codebase already uses for 404s via @Res(), just via setStatus
 * since a 304 carries no body).
 */
export function applyPublicDetailCache(controller: Controller, request: ExpressRequest, updatedAt: Date | string | number): boolean {
  const etag = weakEtagFor(updatedAt);
  controller.setHeader('Cache-Control', 'public, max-age=600');
  controller.setHeader('ETag', etag);
  return ifNoneMatchHits(request, etag);
}
