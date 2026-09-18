import { Controller, Delete, Get, Path, Post, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { CodingProblemRepository, type CodingProblemDetail, type CodingProblemSummary } from '../repositories/CodingProblemRepository';
import { CodingProblemBookmarkRepository } from '../repositories/CodingProblemBookmarkRepository';
import { setPrivateNoStoreCache } from '../lib/httpCache';

const codingProblemRepository = new CodingProblemRepository();
const codingProblemBookmarkRepository = new CodingProblemBookmarkRepository();

// Catalog for the "Practice Coding" feature migrated from apps/docs's
// coding-bootcamp course (2026-09-17) — problems are grouped by `category`
// (the 26 former pattern slugs: arrays, dynamic-programming, ...), same
// free-form-string convention CourseSectionsBoard already reads for My
// Courses / Bookmarked Courses, so the same categorized card-grid component
// renders this catalog unchanged.
//
// 2026-09-18 compliance pass: every method in this app requires a session,
// including the two below that were previously left public — decided to
// keep the "everything behind login" rule uniform rather than carve out a
// public-content exception here.
@Route('coding-problems')
@Tags('CodingProblems')
export class CodingProblemsController extends Controller {
  @Get()
  @Security('session')
  public async list(): Promise<CodingProblemSummary[]> {
    setPrivateNoStoreCache(this);
    return codingProblemRepository.listSummaries();
  }

  // Same "needs the complete id set for card-grid bookmark icons" reasoning
  // as BookmarksController's other list endpoints. MUST be declared before
  // getBySlug below — tsoa/Express match routes in registration order, and
  // getBySlug's `{category}/{problemSlug}` wildcard would otherwise swallow
  // this literal path first (category="bookmarks", problemSlug="mine"),
  // silently returning a 204 instead of ever reaching this handler (bug
  // found live 2026-09-17: the client's res.json() threw on the empty body).
  @Get('bookmarks/mine')
  @Security('session')
  public async listMyBookmarks(@Request() request: ExpressRequest): Promise<string[]> {
    setPrivateNoStoreCache(this);
    return codingProblemBookmarkRepository.listProblemIdsForUser((request.user as User).id);
  }

  // Slug is "<category>/<problem-slug>" (e.g. "arrays/two-sum") — a single
  // {slug} path param can't capture the embedded "/" (Express stops a
  // named param at the next segment boundary), so this takes the category
  // and problem slug as two path params and rejoins them for the lookup.
  // Declared last among the GET routes — see listMyBookmarks's comment.
  @Get('{category}/{problemSlug}')
  @Security('session')
  public async getBySlug(@Path() category: string, @Path() problemSlug: string): Promise<CodingProblemDetail | null> {
    setPrivateNoStoreCache(this);
    return codingProblemRepository.findBySlug(`${category}/${problemSlug}`);
  }

  @Post('{problemId}/bookmark')
  @Security('session')
  public async addBookmark(@Path() problemId: string, @Request() request: ExpressRequest): Promise<void> {
    await codingProblemBookmarkRepository.add((request.user as User).id, problemId);
  }

  @Delete('{problemId}/bookmark')
  @Security('session')
  public async removeBookmark(@Path() problemId: string, @Request() request: ExpressRequest): Promise<void> {
    await codingProblemBookmarkRepository.remove((request.user as User).id, problemId);
  }
}
