import { Body, Controller, Delete, Get, Path, Post, Query, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { BookmarkRepository } from '../repositories/BookmarkRepository';
import { DocBookmarkRepository, type DocBookmarkEntry } from '../repositories/DocBookmarkRepository';
import { AuthoredCourseBookmarkRepository } from '../repositories/AuthoredCourseBookmarkRepository';
import { AuthoredModuleBookmarkRepository, type AuthoredModuleBookmarkEntry } from '../repositories/AuthoredModuleBookmarkRepository';

const bookmarkRepository = new BookmarkRepository();
const docBookmarkRepository = new DocBookmarkRepository();
const authoredCourseBookmarkRepository = new AuthoredCourseBookmarkRepository();
const authoredModuleBookmarkRepository = new AuthoredModuleBookmarkRepository();

interface BookmarkAddDocRequest {
  docPath: string;
  courseSlug: string;
  title?: string | null;
}

interface BookmarkAddAuthoredModuleRequest {
  courseId: string;
}

// Ports src/data/{bookmarks,docBookmarks,authoredBookmarks}.js — every read/
// write there already took an explicit userId param and relied on Postgres
// RLS (`auth.uid() = user_id`) as the real enforcement. Same shape here,
// except userId always comes from the verified session (request.user.id),
// never from the client — Express is the trust boundary now, not RLS.
@Route('bookmarks')
@Tags('Bookmarks')
@Security('session')
export class BookmarksController extends Controller {
  // ---- Whole-course bookmarks (docs course catalog, slug-keyed) ----

  @Get('courses')
  public async listCourseBookmarks(@Request() request: ExpressRequest): Promise<string[]> {
    return bookmarkRepository.listSlugsForUser((request.user as User).id);
  }

  @Post('courses/{slug}')
  public async addCourseBookmark(@Path() slug: string, @Request() request: ExpressRequest): Promise<void> {
    await bookmarkRepository.add((request.user as User).id, slug);
  }

  @Delete('courses/{slug}')
  public async removeCourseBookmark(@Path() slug: string, @Request() request: ExpressRequest): Promise<void> {
    await bookmarkRepository.remove((request.user as User).id, slug);
  }

  // ---- Individual docs-page bookmarks ----

  @Get('docs')
  public async listDocBookmarks(@Request() request: ExpressRequest): Promise<DocBookmarkEntry[]> {
    return docBookmarkRepository.listForUser((request.user as User).id);
  }

  @Post('docs')
  public async addDocBookmark(@Body() body: BookmarkAddDocRequest, @Request() request: ExpressRequest): Promise<void> {
    await docBookmarkRepository.add((request.user as User).id, body);
  }

  @Delete('docs')
  public async removeDocBookmark(@Query() docPath: string, @Request() request: ExpressRequest): Promise<void> {
    await docBookmarkRepository.remove((request.user as User).id, docPath);
  }

  // ---- Authored course bookmarks (DB-backed course system, id-keyed) ----

  @Get('authored-courses')
  public async listAuthoredCourseBookmarks(@Request() request: ExpressRequest): Promise<string[]> {
    return authoredCourseBookmarkRepository.listCourseIdsForUser((request.user as User).id);
  }

  @Post('authored-courses/{courseId}')
  public async addAuthoredCourseBookmark(@Path() courseId: string, @Request() request: ExpressRequest): Promise<void> {
    await authoredCourseBookmarkRepository.add((request.user as User).id, courseId);
  }

  @Delete('authored-courses/{courseId}')
  public async removeAuthoredCourseBookmark(@Path() courseId: string, @Request() request: ExpressRequest): Promise<void> {
    await authoredCourseBookmarkRepository.remove((request.user as User).id, courseId);
  }

  // ---- Authored module bookmarks ----

  @Get('authored-modules')
  public async listAuthoredModuleBookmarks(@Request() request: ExpressRequest): Promise<AuthoredModuleBookmarkEntry[]> {
    return authoredModuleBookmarkRepository.listForUser((request.user as User).id);
  }

  @Post('authored-modules/{moduleId}')
  public async addAuthoredModuleBookmark(
    @Path() moduleId: string,
    @Body() body: BookmarkAddAuthoredModuleRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    await authoredModuleBookmarkRepository.add((request.user as User).id, moduleId, body.courseId);
  }

  @Delete('authored-modules/{moduleId}')
  public async removeAuthoredModuleBookmark(@Path() moduleId: string, @Request() request: ExpressRequest): Promise<void> {
    await authoredModuleBookmarkRepository.remove((request.user as User).id, moduleId);
  }
}
