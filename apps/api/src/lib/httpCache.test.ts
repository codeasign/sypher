import type { Request as ExpressRequest } from 'express';
import { describe, expect, it } from 'vitest';
import {
  applyPublicDetailCache,
  setPrivateNoCacheCache,
  setPrivateNoStoreCache,
  setPublicListCache,
  weakEtagFor,
} from './httpCache';

// Minimal stand-in for tsoa's Controller — only setHeader/getHeader are
// exercised by httpCache.ts, so a real Controller instance (and the tsoa
// machinery around it) isn't needed to prove this logic.
function fakeController() {
  const headers: Record<string, string> = {};
  return {
    setHeader: (name: string, value?: unknown) => {
      if (value !== undefined) headers[name] = String(value);
    },
    headers,
  };
}

function fakeRequest(ifNoneMatch?: string): ExpressRequest {
  return { headers: ifNoneMatch === undefined ? {} : { 'if-none-match': ifNoneMatch } } as unknown as ExpressRequest;
}

describe('cache-control setters', () => {
  it('setPublicListCache sets public, max-age=300', () => {
    const c = fakeController();
    setPublicListCache(c as never);
    expect(c.headers['Cache-Control']).toBe('public, max-age=300');
  });

  it('setPrivateNoCacheCache sets private, no-cache', () => {
    const c = fakeController();
    setPrivateNoCacheCache(c as never);
    expect(c.headers['Cache-Control']).toBe('private, no-cache');
  });

  it('setPrivateNoStoreCache sets private, no-store — and never anything cacheable', () => {
    const c = fakeController();
    setPrivateNoStoreCache(c as never);
    expect(c.headers['Cache-Control']).toBe('private, no-store');
    expect(c.headers['Cache-Control']).not.toMatch(/public/);
    expect(c.headers['Cache-Control']).not.toMatch(/max-age/);
  });
});

describe('weakEtagFor', () => {
  it('is deterministic for the same version marker', () => {
    const d = new Date('2026-09-17T00:00:00.000Z');
    expect(weakEtagFor(d)).toBe(weakEtagFor(new Date('2026-09-17T00:00:00.000Z')));
  });

  it('differs when the version marker differs', () => {
    const a = weakEtagFor(new Date('2026-09-17T00:00:00.000Z'));
    const b = weakEtagFor(new Date('2026-09-17T00:00:01.000Z'));
    expect(a).not.toBe(b);
  });

  it('is a weak validator (W/ prefix, quoted)', () => {
    expect(weakEtagFor(new Date())).toMatch(/^W\/"[0-9a-f]+"$/);
  });
});

describe('applyPublicDetailCache', () => {
  const updatedAt = new Date('2026-09-17T12:00:00.000Z');

  it('sets Cache-Control: public, max-age=600 and an ETag header', () => {
    const c = fakeController();
    applyPublicDetailCache(c as never, fakeRequest(), updatedAt);
    expect(c.headers['Cache-Control']).toBe('public, max-age=600');
    expect(c.headers.ETag).toBe(weakEtagFor(updatedAt));
  });

  it('returns false when there is no If-None-Match header', () => {
    const c = fakeController();
    expect(applyPublicDetailCache(c as never, fakeRequest(), updatedAt)).toBe(false);
  });

  it('returns false when If-None-Match does not match', () => {
    const c = fakeController();
    expect(applyPublicDetailCache(c as never, fakeRequest('W/"stale-value"'), updatedAt)).toBe(false);
  });

  it('returns true when If-None-Match matches the computed ETag exactly', () => {
    const c = fakeController();
    const etag = weakEtagFor(updatedAt);
    expect(applyPublicDetailCache(c as never, fakeRequest(etag), updatedAt)).toBe(true);
  });

  it('returns true when If-None-Match is a comma-separated list containing the match', () => {
    const c = fakeController();
    const etag = weakEtagFor(updatedAt);
    expect(applyPublicDetailCache(c as never, fakeRequest(`W/"other-one", ${etag}`), updatedAt)).toBe(true);
  });

  it('returns true for a wildcard If-None-Match', () => {
    const c = fakeController();
    expect(applyPublicDetailCache(c as never, fakeRequest('*'), updatedAt)).toBe(true);
  });

  it('accepts a string or number version marker, not just Date', () => {
    const c = fakeController();
    applyPublicDetailCache(c as never, fakeRequest(), 'v1');
    const etag = c.headers.ETag;
    const c2 = fakeController();
    expect(applyPublicDetailCache(c2 as never, fakeRequest(etag), 'v1')).toBe(true);
  });
});
