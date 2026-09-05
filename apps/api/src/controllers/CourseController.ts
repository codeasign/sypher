import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Course, CourseModule, Role, User } from '@prisma/client';
import { CourseRepository } from '../repositories/CourseRepository';
import { CourseModuleRepository, type GettingStartedModuleEntry, type ModuleWithCourseEntry } from '../repositories/CourseModuleRepository';
import { AuthoredCourseAccessRepository } from '../repositories/AuthoredCourseAccessRepository';
import { AuthoredCompanyCourseAccessRepository } from '../repositories/AuthoredCompanyCourseAccessRepository';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { ModuleProgressRepository } from '../repositories/ModuleProgressRepository';
import { CourseCompletionRepository } from '../repositories/CourseCompletionRepository';
import { requireCanManageCourses } from '../lib/contentAuthz';
import { hasCourseAccess } from '../lib/accessControl';
import { isModuleFreelyVisible } from '../lib/coursePreview';
import { getOrSet, purge } from '../lib/cache';
import { assertNoReplacementChar } from '../lib/textSanitize';

const courseRepository = new CourseRepository();
const courseModuleRepository = new CourseModuleRepository();
const authoredCourseAccessRepository = new AuthoredCourseAccessRepository();
const authoredCompanyCourseAccessRepository = new AuthoredCompanyCourseAccessRepository();
const companyDirectoryRepository = new CompanyDirectoryRepository();
const moduleProgressRepository = new ModuleProgressRepository();
const courseCompletionRepository = new CourseCompletionRepository();

const GETTING_STARTED_CACHE_TTL_MS = 60_000;

interface CourseCreateRequest {
  name: string;
  // Optional explicit URL slug. When absent the slug derives from `name`
  // (previous behavior, unchanged). Authored-course imports pass this so a
  // requested course slug can differ from the display name.
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  // "tech" | "life-skills" (free-form string so new categories don't need
  // schema changes).
  category?: string | null;
  // Comma-separated slugs of related courses (CSV), e.g.
  // "api-testing-python,api-testing-typescript".
  relatedCourses?: string | null;
  // Target audience role for catalog grouping, e.g. "developer" | "qa" |
  // "engineering-manager". Free-form like category; distinct from the
  // billing/access roles (FREE_USER etc.) — this describes WHO THE COURSE
  // TEACHES, not who may open it.
  audienceRole?: string | null;
}

// Dedicated update DTO rather than Partial<CourseCreateRequest>: tsoa expands
// the Partial<> mapped type inline and drops the `| null` from every member, so
// PUT /courses/{id} rejected an explicit `coverImageUrl: null` ("invalid string
// value") even though POST /courses accepts it — which blocked publishing any
// course without a cover image. Also intentionally omits `slug` so an update
// can't silently rename the course out from under its /learn/[slug] URLs.
interface CourseUpdateRequest {
  name?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  relatedCourses?: string | null;
  audienceRole?: string | null;
}

interface CourseSetStatusRequest {
  status: 'draft' | 'published';
}

interface CourseModuleCreateRequest {
  title: string;
  bodyMdx?: string;
  showInGettingStarted?: boolean;
}

interface CourseModuleReorderRequest {
  direction: 'up' | 'down';
}

interface CourseSetRolesRequest {
  allowedRoles: Role[];
}

interface CourseSetCompanyGrantRequest {
  allowed: boolean;
}

interface CourseWithAccess extends Course {
  hasFullAccess: boolean;
  // Has the user completed at least one module of this course (ever) —
  // Enroll (false) vs Resume (true) on the course card. A fully completed
  // course still reads true here (ModuleProgress rows persist forever),
  // so revisiting it never resets or re-tracks anything.
  started: boolean;
  // Progress bar on the My Courses / Browse Courses card. completedModules
  // is clamped to totalModules so a course that has since lost modules
  // can't report over 100%. totalModules is the course's CURRENT module
  // count (0 for an empty course — render no bar).
  completedModules: number;
  totalModules: number;
}

interface CourseByIdsRequest {
  ids: string[];
}

interface CourseModuleWithProgress extends CourseModule {
  completed: boolean;
  locked: boolean;
}

// One earned course completion as listed on /mock-tests — the course is
// embedded so the page renders name/link without a second round-trip.
interface MockTestEntry {
  course: Course;
  completedAt: Date;
}

interface CourseAccessInfo {
  hasFullAccess: boolean;
  visible: boolean;
}

// Every authored-course read is access-gated per user (unlike Blog/Cohort's
// fully public reads), so results can never go through the shared getOrSet
// cache — a single cross-request cache entry would leak one user's access
// into another's response. Same reasoning as apps/app's
// listAccessibleAuthoredCourses. Only the getting-started list (identical
// for every signed-in user) is safe to cache.
async function courseAccessInfo(user: User, course: Course): Promise<CourseAccessInfo> {
  const allowedRoles = await authoredCourseAccessRepository.getAllowedRoles(course.id);
  let companyAllowedIds: Set<string> | undefined;
  if (user.companyId) {
    // Company employees get courses via their GROUPS (managed on the
    // corporate portal), not straight from the company-wide grant — that
    // grant is now only the ceiling the portal admin picks from. Union
    // across the employee's groups; lapsed accessUntil ⇒ empty.
    companyAllowedIds = new Set(await companyDirectoryRepository.listCourseIdsForUserGroups(user.companyId, user.id));
  }
  const hasFullAccess = hasCourseAccess(user.role, allowedRoles, { companyAllowedSlugs: companyAllowedIds, slug: course.id });
  if (hasFullAccess) return { hasFullAccess: true, visible: true };
  // Confirmed 2026-08-22, role-agnostic (applies to anyone without
  // hasFullAccess, ungranted company employees included, not scoped to
  // FREE_USER specifically): computeFreePreviewCount(n) is always >= 1 for
  // n >= 1, so any course with at least one module always has *something*
  // free to preview — visible no longer needs its own separate
  // getting-started check, a non-empty course is unconditionally visible
  // now (a getting-started module, if present, is itself one of the
  // module rows counted here, so this fully subsumes the old check rather
  // than needing both).
  const moduleCount = await courseModuleRepository.countForCourse(course.id);
  return { hasFullAccess: false, visible: moduleCount > 0 };
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
// Higher cap for the admin manage-list endpoint only — the frontend fetches
// the full course set once and does search/pagination client-side (user's
// explicit call 2026-08-27: avoid a network round trip per keystroke/page),
// so this needs to comfortably exceed any realistic course count, unlike
// the public-facing MAX_PAGE_SIZE above which bounds real per-request cost.
const MAX_MANAGE_PAGE_SIZE = 1000;

export interface CoursePage {
  courses: CourseWithAccess[];
  total: number;
}

// Shared by listVisible/listBrowse below — computes access+started for
// every published course once, so both endpoints paginate the SAME
// already-filtered-or-not array rather than re-deriving it. Course counts
// are still small enough (dozens, not hundreds) that computing access for
// all of them up front and paginating in memory is simpler and fast
// enough; revisit with real DB-level pagination if that stops being true.
async function computeAllWithAccess(user: User): Promise<CourseWithAccess[]> {
  const courses = await courseRepository.listPublished();
  const startedIds = await moduleProgressRepository.listStartedCourseIds(user.id);
  const completedByCourse = await moduleProgressRepository.countCompletedByCourse(user.id);
  const totalByCourse = await courseModuleRepository.countByCourse(courses.map((c) => c.id));
  const results: CourseWithAccess[] = [];
  for (const course of courses) {
    const info = await courseAccessInfo(user, course);
    const totalModules = totalByCourse.get(course.id) ?? 0;
    const completedModules = Math.min(completedByCourse.get(course.id) ?? 0, totalModules);
    results.push({
      ...course,
      hasFullAccess: info.hasFullAccess,
      started: startedIds.has(course.id),
      completedModules,
      totalModules,
    });
  }
  return results;
}

function paginate<T>(items: T[], limit?: string, offset?: string): { items: T[]; total: number } {
  const parsedLimit = limit === undefined ? DEFAULT_PAGE_SIZE : Number.parseInt(limit, 10);
  const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
  const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  return { items: items.slice(pageOffset, pageOffset + pageSize), total: items.length };
}

@Route('courses')
@Tags('Courses')
export class CourseController extends Controller {
  // ---- Public reads (session required — an authored course never has a
  // truly anonymous path, matching the old system's auth.uid() is not null
  // requirement on every access branch, getting-started included) ----

  // "My Courses" (apps/web's /learn page): only courses the user has FULL
  // access to — not the broader "visible" set (which also includes
  // locked-but-freely-previewable courses; those now live on the Browse
  // Courses catalog instead, via listBrowse below, with a Preview button).
  // Narrowed 2026-08-27 at the user's request: My Courses should read as
  // "what you're enrolled in / can fully take", not a mixed list.
  // Paginated (20/page default) — same shape as GET /blog and
  // GET /mock-exams/page.
  @Get()
  @Security('session')
  public async listVisible(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() role?: string,
  ): Promise<CoursePage> {
    const user = request.user as User;
    const all = await computeAllWithAccess(user);
    const filtered = all.filter((c) => c.hasFullAccess && (role === undefined || c.audienceRole === role));
    const { items, total } = paginate(filtered, limit, offset);
    return { courses: items, total };
  }

  // Every published course, access-aware — the Browse Courses catalog
  // (apps/web's /courses page, 2026-08-27): Enroll/Resume/Preview per
  // card depending on hasFullAccess/started. Paginated like listVisible.
  @Get('browse')
  @Security('session')
  public async listBrowse(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() role?: string,
  ): Promise<CoursePage> {
    const user = request.user as User;
    const all = await computeAllWithAccess(user);
    const filtered = role === undefined ? all : all.filter((c) => c.audienceRole === role);
    const { items, total } = paginate(filtered, limit, offset);
    return { courses: items, total };
  }

  // Deliberately unfiltered by visible AND unpaginated — every published
  // course appears, regardless of access, in one shot. Confirmed with the
  // user 2026-08-22: the /learn sidebar course-switcher needs locked
  // courses to be discoverable (shown with a lock icon) rather than
  // hidden. Kept separate from listBrowse above (which paginates) because
  // the switcher is a small in-page dropdown, not a browse-everything view
  // — it needs the full list in one request every time, not pages of it.
  @Get('sidebar-list')
  @Security('session')
  public async listForSidebar(@Request() request: ExpressRequest): Promise<CourseWithAccess[]> {
    const user = request.user as User;
    const results = await computeAllWithAccess(user);
    return results;
  }

  // Batch lookup for /bookmarks — a bookmarked course/module should still
  // display (name/title) even if its course was since unpublished or the
  // caller's access was revoked; a bookmark is a personal record, not an
  // access grant. Any signed-in user may resolve arbitrary ids: the fields
  // returned (name/slug/description) carry no more sensitivity than the
  // public catalog already exposes, and no module body content is included.
  @Post('by-ids')
  @Security('session')
  public async getByIds(@Body() body: CourseByIdsRequest): Promise<Course[]> {
    return courseRepository.findByIds(body.ids);
  }

  @Post('modules/by-ids')
  @Security('session')
  public async getModulesByIds(@Body() body: CourseByIdsRequest): Promise<ModuleWithCourseEntry[]> {
    return courseModuleRepository.findByIdsWithCourse(body.ids);
  }

  // Paginated (10/page default per the user's /manage-courses request),
  // optional ?search= over the course name — same shape convention as
  // CoursePage.
  @Get('manage/list')
  @Security('session')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() search?: string,
  ): Promise<{ courses: Course[]; total: number }> {
    await requireCanManageCourses(request.user as User);
    const parsedLimit = limit === undefined ? 10 : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : 10;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    return courseRepository.listAllPage(pageSize, pageOffset, search);
  }

  @Get('manage/{id}')
  @Security('session')
  public async getManage(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<Course | void> {
    await requireCanManageCourses(request.user as User);
    const course = await courseRepository.findById(id);
    if (!course) return notFound(404);
    return course;
  }

  @Get('getting-started')
  @Security('session')
  public async gettingStarted(): Promise<GettingStartedModuleEntry[]> {
    return getOrSet('courses:getting-started', GETTING_STARTED_CACHE_TTL_MS, () => courseModuleRepository.listGettingStarted());
  }

  // Data for the /mock-tests page: every course the calling user has fully
  // completed, newest first. Published courses only — a draft/unpublished
  // course would leak draft metadata into the response and link to a dead
  // /learn/[slug] page. Deliberately NOT access-gated beyond that (unlike
  // listVisible): a completion is an earned personal record, same rule as
  // the bookmarks by-ids lookup above — it doesn't vanish when access is
  // revoked later.
  @Get('mock-tests')
  @Security('session')
  public async listMockTests(@Request() request: ExpressRequest): Promise<MockTestEntry[]> {
    const user = request.user as User;
    const completions = await courseCompletionRepository.listForUser(user.id);
    const courses = await courseRepository.findByIds(completions.map((c) => c.courseId));
    const publishedById = new Map(courses.filter((c) => c.status === 'published').map((c) => [c.id, c]));
    return completions.flatMap((completion) => {
      const course = publishedById.get(completion.courseId);
      return course ? [{ course, completedAt: completion.completedAt }] : [];
    });
  }

  // Returns EVERY module, not just accessible ones — confirmed 2026-08-22
  // as a deliberate, narrowly-scoped exception to this codebase's usual
  // hide-on-403 rule: modules beyond the free preview within an otherwise-
  // visible course must be discoverable (locked: true, shown with a lock
  // icon and an upgrade prompt), not hidden as if they didn't exist. This
  // does NOT extend to courses themselves — a course you have zero access
  // to (fails courseAccessInfo's visible check entirely: draft, company-
  // gated with no grant, etc.) still 404s exactly as before, unchanged.
  // bodyMdx is stripped from locked entries so the list response itself
  // never leaks paid content — a locked module's title/metadata are fine
  // to show, its content is not.
  @Get('{slug}/modules')
  @Security('session')
  public async listModules(
    @Path() slug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CourseModuleWithProgress[] | void> {
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const modules = await courseModuleRepository.listForCourse(course.id);
    const completedIds = await moduleProgressRepository.listCompletedModuleIds(user.id, course.id);
    return modules.map((m) => {
      const locked = !info.hasFullAccess && !isModuleFreelyVisible(m, modules);
      return { ...m, bodyMdx: locked ? '' : m.bodyMdx, completed: completedIds.has(m.id), locked };
    });
  }

  // Same discoverability exception as listModules above — a module beyond
  // the free preview still returns (title/metadata, locked: true,
  // bodyMdx stripped), it doesn't 404. Only a nonexistent module or an
  // entirely-invisible course still 404s.
  @Get('{slug}/modules/{moduleSlug}')
  @Security('session')
  public async getModule(
    @Path() slug: string,
    @Path() moduleSlug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CourseModuleWithProgress | void> {
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const mod = await courseModuleRepository.findBySlug(course.id, moduleSlug);
    if (!mod) return notFound(404);
    const modules = await courseModuleRepository.listForCourse(course.id);
    const locked = !info.hasFullAccess && !isModuleFreelyVisible(mod, modules);
    const completedIds = await moduleProgressRepository.listCompletedModuleIds(user.id, course.id);
    return { ...mod, bodyMdx: locked ? '' : mod.bodyMdx, completed: completedIds.has(mod.id), locked };
  }

  // Marks the module read/completed for the calling user. Idempotent —
  // called unconditionally every time a module page loads (see
  // /learn/[slug]/[moduleSlug]/page.tsx's client-side effect); revisiting
  // an already-completed module is a no-op, not a duplicate or a reset.
  @Post('{slug}/modules/{moduleSlug}/complete')
  @Security('session')
  public async completeModule(
    @Path() slug: string,
    @Path() moduleSlug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<void> {
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const mod = await courseModuleRepository.findBySlug(course.id, moduleSlug);
    if (!mod) return notFound(404);
    // Unlike the read endpoints above, completion is a mutation with no
    // legitimate reason to fire for content the caller can't actually
    // read — a locked module still 404s here, it isn't discoverable in
    // the sense the read endpoints mean.
    if (!info.hasFullAccess) {
      const modules = await courseModuleRepository.listForCourse(course.id);
      if (!isModuleFreelyVisible(mod, modules)) return notFound(404);
    }
    await moduleProgressRepository.markComplete(user.id, mod.id, course.id);
    await courseCompletionRepository.markCompleteIfAllModulesDone(user.id, course.id);
  }

  // ---- Management (courses) ----

  @Post('revalidate')
  @Security('session')
  public async revalidate(@Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    purge('courses');
  }

  @Post()
  @Security('session')
  public async create(@Body() body: CourseCreateRequest, @Request() request: ExpressRequest): Promise<Course> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    assertNoReplacementChar(body.name, 'Name');
    assertNoReplacementChar(body.description, 'Description');
    return courseRepository.create({ ...body, authorId: user.id });
  }

  @Put('{id}')
  @Security('session')
  public async update(@Path() id: string, @Body() body: CourseUpdateRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    assertNoReplacementChar(body.name, 'Name');
    assertNoReplacementChar(body.description, 'Description');
    await courseRepository.update(id, body);
    purge('courses');
  }

  @Put('{id}/status')
  @Security('session')
  public async updateStatus(@Path() id: string, @Body() body: CourseSetStatusRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await courseRepository.setStatus(id, body.status);
    purge('courses');
  }

  @Delete('{id}')
  @Security('session')
  public async remove(@Path() id: string, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await courseRepository.delete(id);
    purge('courses');
  }

  // ---- Management (modules) ----

  @Get('{courseId}/manage/modules')
  @Security('session')
  public async listManageModules(@Path() courseId: string, @Request() request: ExpressRequest): Promise<CourseModule[]> {
    await requireCanManageCourses(request.user as User);
    return courseModuleRepository.listForCourse(courseId);
  }

  @Post('{courseId}/modules')
  @Security('session')
  public async createModule(
    @Path() courseId: string,
    @Body() body: CourseModuleCreateRequest,
    @Request() request: ExpressRequest,
  ): Promise<CourseModule> {
    await requireCanManageCourses(request.user as User);
    assertNoReplacementChar(body.title, 'Title');
    const mod = await courseModuleRepository.create(courseId, body);
    purge('courses');
    return mod;
  }

  @Put('{courseId}/modules/{moduleId}')
  @Security('session')
  public async updateModule(
    @Path() courseId: string,
    @Path() moduleId: string,
    @Body() body: Partial<CourseModuleCreateRequest>,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    await requireCanManageCourses(request.user as User);
    assertNoReplacementChar(body.title, 'Title');
    await courseModuleRepository.update(moduleId, body);
    purge('courses');
  }

  @Put('{courseId}/modules/{moduleId}/reorder')
  @Security('session')
  public async reorderModule(
    @Path() courseId: string,
    @Path() moduleId: string,
    @Body() body: CourseModuleReorderRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await courseModuleRepository.reorder(courseId, moduleId, body.direction);
    purge('courses');
  }

  @Delete('{courseId}/modules/{moduleId}')
  @Security('session')
  public async removeModule(@Path() courseId: string, @Path() moduleId: string, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await courseModuleRepository.delete(moduleId);
    purge('courses');
  }

  // ---- Management (access) ----

  @Get('{courseId}/access')
  @Security('session')
  public async getAccess(@Path() courseId: string, @Request() request: ExpressRequest): Promise<{ allowedRoles: Role[] }> {
    await requireCanManageCourses(request.user as User);
    return { allowedRoles: await authoredCourseAccessRepository.getAllowedRoles(courseId) };
  }

  @Put('{courseId}/access/roles')
  @Security('session')
  public async setAccessRoles(@Path() courseId: string, @Body() body: CourseSetRolesRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await authoredCourseAccessRepository.setAllowedRoles(courseId, body.allowedRoles);
  }

  @Get('{courseId}/access/companies')
  @Security('session')
  public async getAccessCompanies(@Path() courseId: string, @Request() request: ExpressRequest): Promise<string[]> {
    await requireCanManageCourses(request.user as User);
    return authoredCompanyCourseAccessRepository.listCompanyIdsForCourse(courseId);
  }

  @Put('{courseId}/access/companies/{companyId}')
  @Security('session')
  public async setAccessCompany(
    @Path() courseId: string,
    @Path() companyId: string,
    @Body() body: CourseSetCompanyGrantRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    await requireCanManageCourses(request.user as User);
    if (body.allowed) {
      await authoredCompanyCourseAccessRepository.grant(companyId, courseId);
    } else {
      await authoredCompanyCourseAccessRepository.revoke(companyId, courseId);
    }
  }

  // Wildcard single-segment GET — must stay registered AFTER every other
  // fixed single-segment GET route above (getting-started in particular),
  // same rule as CohortController's {slug} route.
  @Get('{slug}')
  @Security('session')
  public async getBySlug(
    @Path() slug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CourseWithAccess | void> {
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const startedIds = await moduleProgressRepository.listStartedCourseIds(user.id);
    const completedIds = await moduleProgressRepository.listCompletedModuleIds(user.id, course.id);
    const totalModules = await courseModuleRepository.countForCourse(course.id);
    return {
      ...course,
      hasFullAccess: info.hasFullAccess,
      started: startedIds.has(course.id),
      completedModules: Math.min(completedIds.size, totalModules),
      totalModules,
    };
  }
}
