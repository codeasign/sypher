import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Course, CourseModule, User } from '@prisma/client';
import type { Role } from '../lib/apiEnums';
import { CourseRepository } from '../repositories/CourseRepository';
import {
  CourseModuleRepository,
  type CourseModuleSummary,
  type GettingStartedModuleEntry,
  type ModuleWithCourseEntry,
  type ImportCourseModuleInput,
} from '../repositories/CourseModuleRepository';
import { AuthoredCourseAccessRepository } from '../repositories/AuthoredCourseAccessRepository';
import { AuthoredCompanyCourseAccessRepository } from '../repositories/AuthoredCompanyCourseAccessRepository';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { ModuleProgressRepository } from '../repositories/ModuleProgressRepository';
import { CourseCompletionRepository } from '../repositories/CourseCompletionRepository';
import { requireCanManageCourses, canEditModuleContentDirectly } from '../lib/contentAuthz';
import { ForbiddenError } from '../lib/authz';
import { hasCourseAccess } from '../lib/accessControl';
import { isModuleFreelyVisible } from '../lib/coursePreview';
import { getOrSet, purge } from '../lib/cache';
import { setPublicListCache, setPrivateNoStoreCache } from '../lib/httpCache';
import { assertNoReplacementChar } from '../lib/textSanitize';
import { HttpError } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { assertImportedDiagramCaptions } from '../lib/diagramMarkup';

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

// Response shape for a course. An explicit DTO instead of Prisma's `Course`
// model type, which leaks Prisma's `DefaultSelection` payload wrapper into
// the OpenAPI spec. Same columns as the model, with honest nullability.
/** A course. */
export interface CourseResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  /** Comma-separated slugs of related courses. */
  relatedCourses: string | null;
  audienceRole: string | null;
  /** draft | published */
  status: string;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface CourseListResponse {
  courses: CourseResponse[];
  total: number;
}

function toCourseResponse(course: Course): CourseResponse {
  return {
    id: course.id,
    slug: course.slug,
    name: course.name,
    description: course.description,
    coverImageUrl: course.coverImageUrl,
    category: course.category,
    relatedCourses: course.relatedCourses,
    audienceRole: course.audienceRole,
    status: course.status,
    authorId: course.authorId,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    publishedAt: course.publishedAt,
  };
}

interface CourseWithAccess extends CourseResponse {
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

/** Response shape for a course module (lesson), including its body. Explicit DTO instead of Prisma's `CourseModule` model type. */
export interface CourseModuleResponse {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  /** content | assignment | video | mcq */
  moduleType: string;
  isCertification: boolean;
  bodyMdx: string;
  orderIndex: number;
  sectionLabel: string | null;
  sectionOrder: number | null;
  /** manual | generated */
  authoringMode: string;
  showInGettingStarted: boolean;
  gettingStartedOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A module without its (large) body, for navigation lists. */
export type CourseModuleSummaryResponse = Omit<CourseModuleResponse, 'bodyMdx'>;

function toCourseModuleSummaryResponse(mod: CourseModuleSummary): CourseModuleSummaryResponse {
  return {
    id: mod.id,
    courseId: mod.courseId,
    slug: mod.slug,
    title: mod.title,
    moduleType: mod.moduleType,
    isCertification: mod.isCertification,
    orderIndex: mod.orderIndex,
    sectionLabel: mod.sectionLabel,
    sectionOrder: mod.sectionOrder,
    authoringMode: mod.authoringMode,
    showInGettingStarted: mod.showInGettingStarted,
    gettingStartedOrder: mod.gettingStartedOrder,
    createdAt: mod.createdAt,
    updatedAt: mod.updatedAt,
  };
}

function toCourseModuleResponse(mod: CourseModule): CourseModuleResponse {
  return { ...toCourseModuleSummaryResponse(mod), bodyMdx: mod.bodyMdx };
}

interface CourseModuleWithProgress extends CourseModuleResponse {
  completed: boolean;
  locked: boolean;
}

interface CourseModuleSummaryWithProgress extends CourseModuleSummaryResponse {
  completed: boolean;
  locked: boolean;
}

// One earned course completion as listed on /mock-tests — the course is
// embedded so the page renders name/link without a second round-trip.
interface MockTestEntry {
  course: CourseResponse;
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
// `knownTotalModules` lets a caller that's already batched the module count
// (computeAllWithAccess, via countByCourse) pass it straight in instead of
// this function re-querying it per course — callers that don't have it yet
// (listModules/getModule/completeModule/getBySlug, which only ever check
// one course at a time) simply omit it and keep the original single query.
async function courseAccessInfo(user: User, course: Course, knownTotalModules?: number): Promise<CourseAccessInfo> {
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
  const moduleCount = knownTotalModules ?? (await courseModuleRepository.countForCourse(course.id));
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
// Cap on by-ids/modules-by-ids batch lookups — same defense-in-depth
// reasoning as the page-size caps above: an authenticated caller shouldn't
// be able to force an unbounded IN (...) query.
const MAX_IDS_PER_REQUEST = 200;

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
  const [startedIds, completedByCourse, totalByCourse] = await Promise.all([
    moduleProgressRepository.listStartedCourseIds(user.id),
    moduleProgressRepository.countCompletedByCourse(user.id),
    courseModuleRepository.countByCourse(courses.map((c) => c.id)),
  ]);
  // Per-course access checks are independent of each other — run them
  // concurrently instead of one at a time, and hand each one the module
  // count already batched above so courseAccessInfo never re-queries it.
  const results = await Promise.all(
    courses.map(async (course) => {
      const totalModules = totalByCourse.get(course.id) ?? 0;
      const info = await courseAccessInfo(user, course, totalModules);
      const completedModules = Math.min(completedByCourse.get(course.id) ?? 0, totalModules);
      return {
        ...toCourseResponse(course),
        hasFullAccess: info.hasFullAccess,
        started: startedIds.has(course.id),
        completedModules,
        totalModules,
      };
    }),
  );
  return results;
}

function paginate<T>(items: T[], limit?: string, offset?: string): { items: T[]; total: number } {
  const parsedLimit = limit === undefined ? DEFAULT_PAGE_SIZE : Number.parseInt(limit, 10);
  const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
  const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  return { items: items.slice(pageOffset, pageOffset + pageSize), total: items.length };
}

const logger = createLogger('courses');

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
    setPrivateNoStoreCache(this);
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
    setPrivateNoStoreCache(this);
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
  // Reviewed in the pagination audit (2026-09): left unpaginated on
  // purpose — course count is bounded by admin-authored catalog size
  // (dozens, not user-generated volume), and a paginated switcher would
  // silently hide courses from the dropdown.
  @Get('sidebar-list')
  @Security('session')
  public async listForSidebar(@Request() request: ExpressRequest): Promise<CourseWithAccess[]> {
    setPrivateNoStoreCache(this);
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
  public async getByIds(
    @Body() body: CourseByIdsRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
  ): Promise<CourseResponse[] | void> {
    if (body.ids.length > MAX_IDS_PER_REQUEST) {
      return badRequest(400, { message: `Too many ids — max ${MAX_IDS_PER_REQUEST} per request` });
    }
    return (await courseRepository.findByIds(body.ids)).map(toCourseResponse);
  }

  @Post('modules/by-ids')
  @Security('session')
  public async getModulesByIds(
    @Body() body: CourseByIdsRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
  ): Promise<ModuleWithCourseEntry[] | void> {
    if (body.ids.length > MAX_IDS_PER_REQUEST) {
      return badRequest(400, { message: `Too many ids — max ${MAX_IDS_PER_REQUEST} per request` });
    }
    return courseModuleRepository.findByIdsWithCourse(body.ids);
  }

  // Paginated (10/page default per the user's /manage-courses request),
  // optional ?search= over the course name — same shape convention as
  // CoursePage.
  @Get('manage/list')
  @Security('session')
  @Security('importTool')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
    @Query() search?: string,
  ): Promise<CourseListResponse> {
    setPrivateNoStoreCache(this);
    await requireCanManageCourses(request.user as User);
    const parsedLimit = limit === undefined ? 10 : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : 10;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const { courses, total } = await courseRepository.listAllPage(pageSize, pageOffset, search);
    return { courses: courses.map(toCourseResponse), total };
  }

  @Get('manage/{id}')
  @Security('session')
  public async getManage(@Path() id: string, @Request() request: ExpressRequest, @Res() notFound: TsoaResponse<404, void>): Promise<CourseResponse | void> {
    setPrivateNoStoreCache(this);
    await requireCanManageCourses(request.user as User);
    const course = await courseRepository.findById(id);
    if (!course) return notFound(404);
    return toCourseResponse(course);
  }

  // Identical for every signed-in user (no per-user branching at all) —
  // the one CourseController read that's genuinely safe as a shared,
  // public cache entry, same as Blog/Cohort/Video's public catalogs.
  @Get('getting-started')
  @Security('session')
  public async gettingStarted(): Promise<GettingStartedModuleEntry[]> {
    setPublicListCache(this);
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
    setPrivateNoStoreCache(this);
    const user = request.user as User;
    const completions = await courseCompletionRepository.listForUser(user.id);
    const courses = await courseRepository.findByIds(completions.map((c) => c.courseId));
    const publishedById = new Map(courses.filter((c) => c.status === 'published').map((c) => [c.id, c]));
    return completions.flatMap((completion) => {
      const course = publishedById.get(completion.courseId);
      return course ? [{ course: toCourseResponse(course), completedAt: completion.completedAt }] : [];
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
  // The list is metadata-only for every entry. Lesson bodies are fetched
  // individually from getModule, which keeps this navigation response small
  // even for courses with hundreds of long lessons.
  @Get('{slug}/modules')
  @Security('session')
  public async listModules(
    @Path() slug: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, void>,
  ): Promise<CourseModuleSummaryWithProgress[] | void> {
    setPrivateNoStoreCache(this);
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const [modules, completedIds] = await Promise.all([
      courseModuleRepository.listMetadataForCourse(course.id),
      moduleProgressRepository.listCompletedModuleIds(user.id, course.id),
    ]);
    return modules.map((m) => {
      const locked = !info.hasFullAccess && !isModuleFreelyVisible(m, modules);
      return { ...toCourseModuleSummaryResponse(m), completed: completedIds.has(m.id), locked };
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
    setPrivateNoStoreCache(this);
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    const [mod, modules, completedIds] = await Promise.all([
      courseModuleRepository.findBySlug(course.id, moduleSlug),
      courseModuleRepository.listMetadataForCourse(course.id),
      moduleProgressRepository.listCompletedModuleIds(user.id, course.id),
    ]);
    if (!mod) return notFound(404);
    const locked = !info.hasFullAccess && !isModuleFreelyVisible(mod, modules);
    return { ...toCourseModuleResponse(mod), bodyMdx: locked ? '' : mod.bodyMdx, completed: completedIds.has(mod.id), locked };
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
      // Metadata-only — isModuleFreelyVisible only needs id/
      // showInGettingStarted, so there's no reason to pull every module's
      // full bodyMdx just to answer a visibility check that fires on every
      // module-page load.
      const modules = await courseModuleRepository.listMetadataForCourse(course.id);
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
  @Security('importTool')
  public async create(@Body() body: CourseCreateRequest, @Request() request: ExpressRequest): Promise<CourseResponse> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    assertNoReplacementChar(body.name, 'Name');
    assertNoReplacementChar(body.description, 'Description');
    return toCourseResponse(await courseRepository.create({ ...body, authorId: user.id }));
  }

  @Put('{id}')
  @Security('session')
  @Security('importTool')
  public async update(@Path() id: string, @Body() body: CourseUpdateRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    assertNoReplacementChar(body.name, 'Name');
    assertNoReplacementChar(body.description, 'Description');
    await courseRepository.update(id, body);
    purge('courses');
  }

  @Put('{id}/status')
  @Security('session')
  @Security('importTool')
  public async updateStatus(@Path() id: string, @Body() body: CourseSetStatusRequest, @Request() request: ExpressRequest): Promise<void> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    const { from, to } = await courseRepository.setStatus(id, body.status, user.id);
    logger.info(`course status changed: ${id} ${from} -> ${to} by ${user.email} (${user.id})`);
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

  // Unpaginated by necessity, not oversight — the reorder UI (PUT
  // .../modules/{moduleId}/reorder, adjacent orderIndex swap) needs the
  // COMPLETE ordered list to make sense; a paginated page-2 module
  // couldn't be reordered against a page-1 neighbor. Reviewed in the
  // pagination audit (2026-09): module count per course is bounded by
  // admin-authored content, not user-generated volume.
  @Get('{courseId}/manage/modules')
  @Security('session')
  @Security('importTool')
  public async listManageModules(@Path() courseId: string, @Request() request: ExpressRequest): Promise<CourseModuleResponse[]> {
    setPrivateNoStoreCache(this);
    await requireCanManageCourses(request.user as User);
    return (await courseModuleRepository.listForCourse(courseId)).map(toCourseModuleResponse);
  }

  @Post('{courseId}/modules')
  @Security('session')
  @Security('importTool')
  public async createModule(
    @Path() courseId: string,
    @Body() body: CourseModuleCreateRequest,
    @Request() request: ExpressRequest,
  ): Promise<CourseModuleResponse> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    // Same content gate as updateModule — non-Admins can still create the
    // module (title, settings), just not with live content attached.
    if (body.bodyMdx && !canEditModuleContentDirectly(user)) {
      throw new ForbiddenError('Content edits require Course Auditor approval — submit via /module-edit-requests instead');
    }
    assertNoReplacementChar(body.title, 'Title');
    assertImportedDiagramCaptions(body.bodyMdx);
    const mod = await courseModuleRepository.create(courseId, body);
    purge('courses');
    return toCourseModuleResponse(mod);
  }

  // Migration imports retain stable source slugs, section metadata and order.
  // Use the same management authorization as ordinary module creation.
  @Post('{courseId}/modules/import')
  @Security('session')
  @Security('importTool')
  public async importModule(
    @Path() courseId: string,
    @Body() body: ImportCourseModuleInput,
    @Request() request: ExpressRequest,
  ): Promise<CourseModuleResponse> {
    await requireCanManageCourses(request.user as User);
    if (!await courseRepository.findById(courseId)) throw new HttpError(404, 'Course not found');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) throw new HttpError(400, 'Invalid module slug');
    if (!Number.isInteger(body.orderIndex) || body.orderIndex < 0) throw new HttpError(400, 'Invalid module order');
    assertNoReplacementChar(body.title, 'Title');
    assertNoReplacementChar(body.bodyMdx, 'Body');
    assertImportedDiagramCaptions(body.bodyMdx);
    const mod = await courseModuleRepository.upsertImported(courseId, body);
    purge('courses');
    return toCourseModuleResponse(mod);
  }

  @Put('{courseId}/modules/{moduleId}')
  @Security('session')
  @Security('importTool')
  public async updateModule(
    @Path() courseId: string,
    @Path() moduleId: string,
    @Body() body: Partial<CourseModuleCreateRequest>,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    const user = request.user as User;
    await requireCanManageCourses(user);
    // Content (bodyMdx) can only go live directly for Admins — everyone
    // else who canManageCourses (Reviewer included) must submit a
    // ModuleEditRequest instead (POST /module-edit-requests) for a Course
    // Auditor to approve (user request 2026-09-16). Non-content fields
    // (title, showInGettingStarted) are unaffected.
    if (body.bodyMdx !== undefined && !canEditModuleContentDirectly(user)) {
      throw new ForbiddenError('Content edits require Course Auditor approval — submit via /module-edit-requests instead');
    }
    assertNoReplacementChar(body.title, 'Title');
    assertImportedDiagramCaptions(body.bodyMdx);
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
    setPrivateNoStoreCache(this);
    await requireCanManageCourses(request.user as User);
    return { allowedRoles: await authoredCourseAccessRepository.getAllowedRoles(courseId) };
  }

  @Put('{courseId}/access/roles')
  @Security('session')
  @Security('importTool')
  public async setAccessRoles(@Path() courseId: string, @Body() body: CourseSetRolesRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
    await authoredCourseAccessRepository.setAllowedRoles(courseId, body.allowedRoles);
  }

  @Get('{courseId}/access/companies')
  @Security('session')
  public async getAccessCompanies(@Path() courseId: string, @Request() request: ExpressRequest): Promise<string[]> {
    setPrivateNoStoreCache(this);
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
    setPrivateNoStoreCache(this);
    const user = request.user as User;
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) return notFound(404);
    const info = await courseAccessInfo(user, course);
    if (!info.visible) return notFound(404);
    // Independent of each other and of `info` above — no reason to await
    // them one at a time.
    const [startedIds, completedIds, totalModules] = await Promise.all([
      moduleProgressRepository.listStartedCourseIds(user.id),
      moduleProgressRepository.listCompletedModuleIds(user.id, course.id),
      courseModuleRepository.countForCourse(course.id),
    ]);
    return {
      ...toCourseResponse(course),
      hasFullAccess: info.hasFullAccess,
      started: startedIds.has(course.id),
      completedModules: Math.min(completedIds.size, totalModules),
      totalModules,
    };
  }
}
