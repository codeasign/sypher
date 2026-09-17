import { randomUUID } from 'node:crypto';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { UserRepository } from '../repositories/UserRepository';
import { BlogPostRepository } from '../repositories/BlogPostRepository';
import { CohortRepository } from '../repositories/CohortRepository';
import { BlogController } from './BlogController';
import { BlogCommentController } from './BlogCommentController';
import { AccessController } from './AccessController';
import { CohortController } from './CohortController';

// Covers the audit's four Cache-Control categories end to end (real DB,
// direct controller invocation — same convention as AuthController.test.ts)
// plus one representative new pagination cap, rather than one test per
// touched endpoint: the header-setting helpers are already unit-tested in
// httpCache.test.ts, so this file proves the WIRING is correct on one
// endpoint per category instead of re-proving the helper logic 30 times.

const userRepository = new UserRepository();
const blogPostRepository = new BlogPostRepository();
const cohortRepository = new CohortRepository();

function makeRequest(overrides: { headers?: Record<string, string>; user?: User } = {}): ExpressRequest {
  return {
    headers: overrides.headers ?? {},
    cookies: {},
    user: overrides.user,
  } as unknown as ExpressRequest;
}

describe('HTTP caching policy — wired end to end', () => {
  const createdUserIds: string[] = [];
  const createdBlogPostIds: string[] = [];
  const createdCohortIds: string[] = [];

  afterAll(async () => {
    await prisma.blogPost.deleteMany({ where: { id: { in: createdBlogPostIds } } });
    await prisma.cohort.deleteMany({ where: { id: { in: createdCohortIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  describe('public, shared list — Cache-Control: public, max-age=300', () => {
    it('GET /blog sets the public list directive', async () => {
      const controller = new BlogController();
      await controller.listPublished(undefined, undefined);
      expect(controller.getHeaders()['Cache-Control']).toBe('public, max-age=300');
    });
  });

  describe('public, shared detail — Cache-Control: public, max-age=600 + ETag, 304 on repeat', () => {
    let slug: string;

    beforeAll(async () => {
      const post = await blogPostRepository.create({
        title: `cache-test-${randomUUID()}`,
        description: 'test post for HTTP caching coverage',
        content: 'body',
      });
      createdBlogPostIds.push(post.id);
      await blogPostRepository.setStatus(post.id, 'published');
      slug = post.slug;
    });

    it('first request returns the post with Cache-Control + ETag set', async () => {
      const controller = new BlogController();
      const result = await controller.getBySlug(slug, makeRequest());
      expect(result).toBeTruthy();
      expect(controller.getHeaders()['Cache-Control']).toBe('public, max-age=600');
      expect(controller.getHeaders().ETag).toMatch(/^W\/"[0-9a-f]+"$/);
    });

    it('a repeat request with a matching If-None-Match gets 304 and no body', async () => {
      const first = new BlogController();
      await first.getBySlug(slug, makeRequest());
      const etag = first.getHeaders().ETag as string;

      const second = new BlogController();
      const result = await second.getBySlug(slug, makeRequest({ headers: { 'if-none-match': etag } }));

      expect(result).toBeUndefined();
      expect(second.getStatus()).toBe(304);
    });

    it('a stale If-None-Match still gets the full post back, not a 304', async () => {
      const controller = new BlogController();
      const result = await controller.getBySlug(slug, makeRequest({ headers: { 'if-none-match': 'W/"stale"' } }));
      expect(result).toBeTruthy();
      expect(controller.getStatus()).not.toBe(304);
    });
  });

  describe('frequently-changing shared list (comments) — Cache-Control: private, no-cache', () => {
    it('GET /blog-posts/{id}/comments sets private, no-cache, never public', async () => {
      const post = await blogPostRepository.create({
        title: `comments-cache-test-${randomUUID()}`,
        description: 'test post for comment-list caching coverage',
        content: 'body',
      });
      createdBlogPostIds.push(post.id);
      await blogPostRepository.setStatus(post.id, 'published');

      const controller = new BlogCommentController();
      const badRequest = () => undefined as never;
      await controller.listForBlogPost(post.id, makeRequest(), badRequest, undefined, undefined, undefined);

      const cacheControl = controller.getHeaders()['Cache-Control'];
      expect(cacheControl).toBe('private, no-cache');
      expect(cacheControl).not.toMatch(/no-store/);
      expect(cacheControl).not.toMatch(/public/);
    });
  });

  describe('personalized / user-specific — Cache-Control: private, no-store, no exceptions', () => {
    it('GET /access/my-courses never carries a cacheable directive', async () => {
      const user = await userRepository.create({
        email: `cache-test-personalized-${randomUUID()}@example.com`,
        passwordHash: await hashPassword('irrelevant-not-used-12345'),
        fullName: 'Cache Test User',
        provider: 'EMAIL',
      });
      createdUserIds.push(user.id);

      const controller = new AccessController();
      await controller.myCourses(makeRequest({ user }));

      const cacheControl = controller.getHeaders()['Cache-Control'];
      expect(cacheControl).toBe('private, no-store');
      expect(cacheControl).not.toMatch(/public/);
      expect(cacheControl).not.toMatch(/max-age/);
    });
  });

  describe('pagination — newly-added cap on CohortController.listManage', () => {
    let admin: User;
    const titlePrefix = `manage-pagination-${randomUUID()}`;

    beforeAll(async () => {
      admin = await userRepository.create({
        email: `cohort-admin-${randomUUID()}@example.com`,
        passwordHash: await hashPassword('irrelevant-not-used-12345'),
        fullName: 'Cohort Admin',
        provider: 'EMAIL',
        role: 'ADMIN',
      });
      createdUserIds.push(admin.id);

      for (let i = 0; i < 5; i++) {
        const cohort = await cohortRepository.create({ title: `${titlePrefix}-${i}`, description: 'test' });
        createdCohortIds.push(cohort.id);
      }
    });

    it('a request with no limit/offset still returns every cohort (fetch-once default)', async () => {
      const controller = new CohortController();
      const result = await controller.listManage(makeRequest({ user: admin }));
      const ours = result.filter((c) => c.title.startsWith(titlePrefix));
      expect(ours).toHaveLength(5);
    });

    it('an explicit small limit is honored, not silently ignored', async () => {
      const controller = new CohortController();
      const result = await controller.listManage(makeRequest({ user: admin }), '2', '0');
      // Exactly 2 back (not "at most 2 of ours" — the 5 seeded cohorts plus
      // whatever else exists guarantee at least 2 rows overall) proves the
      // limit actually reached the repository's take/skip, not just that
      // the controller's arithmetic compiles without erroring.
      expect(result).toHaveLength(2);
    });

    it('malformed limit values fall back to the safe default instead of erroring', async () => {
      const controller = new CohortController();
      const result = await controller.listManage(makeRequest({ user: admin }), 'not-a-number', undefined);
      const ours = result.filter((c) => c.title.startsWith(titlePrefix));
      expect(ours).toHaveLength(5);
    });
  });
});
