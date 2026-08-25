import { Body, Controller, Delete, Get, Path, Post, Put, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Course, CourseModule, Role, User } from '@prisma/client';
import { CourseRepository } from '../repositories/CourseRepository';
import { CourseModuleRepository, type GettingStartedModuleEntry, type ModuleWithCourseEntry } from '../repositories/CourseModuleRepository';
import { AuthoredCourseAccessRepository } from '../repositories/AuthoredCourseAccessRepository';
import { AuthoredCompanyCourseAccessRepository } from '../repositories/AuthoredCompanyCourseAccessRepository';
import { ModuleProgressRepository } from '../repositories/ModuleProgressRepository';
import { CourseCompletionRepository } from '../repositories/CourseCompletionRepository';
import { requireCanManageCourses } from '../lib/contentAuthz';
import { hasCourseAccess } from '../lib/accessControl';
import { isModuleFreelyVisible } from '../lib/coursePreview';
import { getOrSet, purge } from '../lib/cache';

const courseRepository = new CourseRepository();
const courseModuleRepository = new CourseModuleRepository();
const authoredCourseAccessRepository = new AuthoredCourseAccessRepository();
const authoredCompanyCourseAccessRepository = new AuthoredCompanyCourseAccessRepository();
const moduleProgressRepository = new ModuleProgressRepository();
const courseCompletionRepository = new CourseCompletionRepository();

const GETTING_STARTED_CACHE_TTL_MS = 60_000;

interface CourseCreateRequest {
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
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
    companyAllowedIds = new Set(await authoredCompanyCourseAccessRepository.listCourseIdsForCompany(user.companyId));
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

@Route('courses')
@Tags('Courses')
export class CourseController extends Controller {
  // ---- Public reads (session required — an authored course never has a
  // truly anonymous path, matching the old system's auth.uid() is not null
  // requirement on every access branch, getting-started included) ----

  @Get()
  @Security('session')
  public async listVisible(@Request() request: ExpressRequest): Promise<CourseWithAccess[]> {
    const user = request.user as User;
    const courses = await courseRepository.listPublished();
    const results: CourseWithAccess[] = [];
    for (const course of courses) {
      const info = await courseAccessInfo(user, course);
      if (info.visible) results.push({ ...course, hasFullAccess: info.hasFullAccess });
    }
    return results;
  }

  // Deliberately unfiltered by visible — every published course appears,
  // regardless of access. Confirmed with the user 2026-08-22: the /learn
  // sidebar course-switcher needs locked courses to be discoverable (shown
  // with a lock icon) rather than hidden, since free users will eventually
  // get a partial preview of every course — that deeper per-course
  // partial-access model is separate, bigger, scoped-later work; this
  // endpoint only fixes the sidebar's own visibility gate. listVisible
  // above is untouched, still used by /learn's own course grid and
  // anywhere else "hide what I can't see at all" is still the right rule.
  @Get('sidebar-list')
  @Security('session')
  public async listForSidebar(@Request() request: ExpressRequest): Promise<CourseWithAccess[]> {
    const user = request.user as User;
    const courses = await courseRepository.listPublished();
    const results: CourseWithAccess[] = [];
    for (const course of courses) {
      const info = await courseAccessInfo(user, course);
      results.push({ ...course, hasFullAccess: info.hasFullAccess });
    }
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

  @Get('manage/list')
  @Security('session')
  public async listManage(@Request() request: ExpressRequest): Promise<Course[]> {
    await requireCanManageCourses(request.user as User);
    return courseRepository.listAll();
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
    return courseRepository.create({ ...body, authorId: user.id });
  }

  @Put('{id}')
  @Security('session')
  public async update(@Path() id: string, @Body() body: Partial<CourseCreateRequest>, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCourses(request.user as User);
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
    return { ...course, hasFullAccess: info.hasFullAccess };
  }
}
