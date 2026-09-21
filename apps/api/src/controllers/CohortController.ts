import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Cohort, User } from '@prisma/client';
import { CohortRepository } from '../repositories/CohortRepository';
import { CohortMemberRepository, type RosterEntry } from '../repositories/CohortMemberRepository';
import { CohortManagerRepository, type ManagerEntry } from '../repositories/CohortManagerRepository';
import { CohortCourseAccessRepository } from '../repositories/CohortCourseAccessRepository';
import { CohortMemberCourseAccessRepository, type MemberCourseAccessEntry } from '../repositories/CohortMemberCourseAccessRepository';
import { UserRepository } from '../repositories/UserRepository';
import { requireAdmin } from '../lib/authz';
import { canManageCohorts, requireCanManageCohorts, requireCanManageCohortRoster, rosterPickerScope } from '../lib/contentAuthz';
import { ForbiddenError } from '../lib/authz';
import { getOrSet, purge } from '../lib/cache';
import { applyPublicDetailCache, setPrivateNoStoreCache, setPublicListCache } from '../lib/httpCache';
import { assertNoReplacementChar } from '../lib/textSanitize';
import { sendCohortWelcomeEmail } from '../lib/email';
import { ensureUserByEmail } from '../lib/userProvisioning';

const cohortRepository = new CohortRepository();
const cohortMemberRepository = new CohortMemberRepository();
const cohortManagerRepository = new CohortManagerRepository();
const cohortCourseAccessRepository = new CohortCourseAccessRepository();
const cohortMemberCourseAccessRepository = new CohortMemberCourseAccessRepository();
const userRepository = new UserRepository();

const PUBLIC_CACHE_TTL_MS = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same "fetch-once, bounded" convention as Course/Blog/Video's manage
// endpoints — the launch-cohort admin table and the roster table both
// fetch their full list client-side (no limit/offset passed today) and
// paginate/search in the browser, so the default has to stay large enough
// to mean "everyone" while still capping the worst case.
const MAX_MANAGE_PAGE_SIZE = 1000;
const DEFAULT_ROSTER_PAGE_SIZE = 1000;
const MAX_ROSTER_PAGE_SIZE = 2000;

// Fire-and-forget cohort-welcome email on a fresh enrolment / reactivation
// (never on a no-op re-set). A send failure never fails the roster change —
// the membership is already committed by the time this runs.
function maybeSendCohortWelcome(cohortId: string, userId: string, activated: boolean): void {
  if (!activated) return;
  void (async () => {
    const [member, cohort] = await Promise.all([
      userRepository.findById(userId),
      cohortRepository.findById(cohortId),
    ]);
    if (member && cohort) {
      await sendCohortWelcomeEmail(member.email, member.fullName, cohort.title, cohort.slug);
    }
  })();
}

interface CreateCohortRequest {
  title: string;
  description: string;
  content?: string;
  coverImageUrl?: string | null;
  startDate?: string | null;
  durationWeeks?: number | null;
  seatsTotal?: number | null;
  priceLabel?: string | null;
}

interface SetCohortStatusRequest {
  status: 'draft' | 'live' | 'closed';
}

interface CohortSetActiveRequest {
  active: boolean;
}

interface CohortSetAllowedRequest {
  allowed: boolean;
}

interface CohortAddManagerRequest {
  userId: string;
}

interface CohortAddByEmailRequest {
  email: string;
  /** Used only when the email has no account yet and one is provisioned. */
  fullName?: string;
}

interface CohortMessageResponse {
  message: string;
}

interface CohortLookupUser {
  id: string;
  email: string;
  fullName: string | null;
}

// Response shape for a cohort. Explicit DTO instead of Prisma's `Cohort`
// model type, which leaks Prisma's `DefaultSelection` payload wrapper into
// the OpenAPI spec. Same columns as the model, with honest nullability.
/** A cohort. */
export interface CohortResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string | null;
  startDate: Date | null;
  durationWeeks: number | null;
  seatsTotal: number | null;
  priceLabel: string | null;
  /** draft | live | closed */
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function toCohortResponse(cohort: Cohort): CohortResponse {
  return {
    id: cohort.id,
    slug: cohort.slug,
    title: cohort.title,
    description: cohort.description,
    content: cohort.content,
    coverImageUrl: cohort.coverImageUrl,
    startDate: cohort.startDate,
    durationWeeks: cohort.durationWeeks,
    seatsTotal: cohort.seatsTotal,
    priceLabel: cohort.priceLabel,
    status: cohort.status,
    createdAt: cohort.createdAt,
    updatedAt: cohort.updatedAt,
  };
}

@Route('cohorts')
@Tags('Cohorts')
export class CohortController extends Controller {
  // ---- Public ----

  @Get()
  public async listPublic(): Promise<CohortResponse[]> {
    setPublicListCache(this);
    const cohorts = await getOrSet('cohorts:public-list', PUBLIC_CACHE_TTL_MS, () => cohortRepository.listPublicLive());
    return cohorts.map(toCohortResponse);
  }

  @Post('revalidate')
  @Security('session')
  public async revalidate(@Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCohorts(request.user as User);
    purge('cohorts');
  }

  // ---- Management (launch-cohort) ----

  // Unbounded until this pagination audit — the admin table fetches once
  // and paginates/searches client-side (no limit/offset passed today), so
  // the fix is the same "fetch-once, bounded" cap Course/Blog/Video's
  // manage lists already use, not a real per-page contract change.
  @Get('manage/list')
  @Security('session')
  public async listManage(
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
  ): Promise<CohortResponse[]> {
    setPrivateNoStoreCache(this);
    await requireCanManageCohorts(request.user as User);
    const parsedLimit = limit === undefined ? MAX_MANAGE_PAGE_SIZE : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MANAGE_PAGE_SIZE) : MAX_MANAGE_PAGE_SIZE;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const { cohorts } = await cohortRepository.listAllPage(pageSize, pageOffset);
    return cohorts.map(toCohortResponse);
  }

  @Post()
  @Security('session')
  public async create(@Body() body: CreateCohortRequest, @Request() request: ExpressRequest): Promise<CohortResponse> {
    const user = request.user as User;
    await requireCanManageCohorts(user);
    assertNoReplacementChar(body.title, 'Title');
    assertNoReplacementChar(body.description, 'Description');
    const cohort = await cohortRepository.create({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : null,
      createdById: user.id,
    });
    purge('cohorts');
    return toCohortResponse(cohort);
  }

  @Put('{id}')
  @Security('session')
  public async update(@Path() id: string, @Body() body: Partial<CreateCohortRequest>, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCohorts(request.user as User);
    assertNoReplacementChar(body.title, 'Title');
    assertNoReplacementChar(body.description, 'Description');
    await cohortRepository.update(id, { ...body, startDate: body.startDate ? new Date(body.startDate) : undefined });
    purge('cohorts');
  }

  @Put('{id}/status')
  @Security('session')
  public async updateStatus(@Path() id: string, @Body() body: SetCohortStatusRequest, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCohorts(request.user as User);
    await cohortRepository.setStatus(id, body.status);
    purge('cohorts');
  }

  @Delete('{id}')
  @Security('session')
  public async remove(@Path() id: string, @Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCohorts(request.user as User);
    await cohortRepository.delete(id);
    purge('cohorts');
  }

  // ---- Roster ----

  // Picker dropdown — needs the complete set of manageable cohorts every
  // time, same reasoning as CourseController.listForSidebar; cohort count
  // is bounded by admin-authored program count, not user volume.
  @Get('manage/roster-cohorts')
  @Security('session')
  public async listRosterCohorts(@Request() request: ExpressRequest): Promise<CohortResponse[]> {
    setPrivateNoStoreCache(this);
    const user = request.user as User;
    const scope = await rosterPickerScope(user);
    const cohorts = scope === 'all' ? await cohortRepository.listAll() : await cohortRepository.listForManager(user.id);
    return cohorts.map(toCohortResponse);
  }

  // Was genuinely unbounded — a cohort's enrolled member count grows with
  // real user activity (enrollment), not admin-authored content, so this
  // is the one CohortController list that actually needed a fix. Wires up
  // CohortMemberRepository.listRosterPage (previously built but never
  // called from a route) with the same "fetch-once, bounded" defaults as
  // listManage above — the roster table also paginates/searches
  // client-side over the full response today.
  @Get('{id}/roster')
  @Security('session')
  public async getRoster(
    @Path() id: string,
    @Request() request: ExpressRequest,
    @Query() limit?: string,
    @Query() offset?: string,
  ): Promise<RosterEntry[]> {
    setPrivateNoStoreCache(this);
    await requireCanManageCohortRoster(request.user as User, id);
    const parsedLimit = limit === undefined ? DEFAULT_ROSTER_PAGE_SIZE : Number.parseInt(limit, 10);
    const parsedOffset = offset === undefined ? 0 : Number.parseInt(offset, 10);
    const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_ROSTER_PAGE_SIZE) : DEFAULT_ROSTER_PAGE_SIZE;
    const pageOffset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const { members } = await cohortMemberRepository.listRosterPage(id, pageSize, pageOffset);
    return members;
  }

  @Put('{id}/roster/{userId}')
  @Security('session')
  public async setMemberStatus(
    @Path() id: string,
    @Path() userId: string,
    @Body() body: CohortSetActiveRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    const user = request.user as User;
    await requireCanManageCohortRoster(user, id);
    const { activated } = await cohortMemberRepository.setStatus(id, userId, body.active, user.id);
    maybeSendCohortWelcome(id, userId, activated);
  }

  /**
   * Add someone to a cohort roster BY EMAIL. If they don't have a Sypher
   * account yet, one is provisioned (passwordless, mustResetPassword) and
   * they're emailed a welcome + set-password link — same as the corporate
   * and admin add-a-user flows. Then they're set active on the roster and
   * (via maybeSendCohortWelcome) get the cohort welcome email too.
   */
  @Post('{id}/roster/by-email')
  @Security('session')
  public async addRosterMemberByEmail(
    @Path() id: string,
    @Body() body: CohortAddByEmailRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CohortMessageResponse>,
  ): Promise<CohortLookupUser | void> {
    const actor = request.user as User;
    await requireCanManageCohortRoster(actor, id);
    const email = (body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return badRequest(400, { message: 'Enter a valid email address.' });

    const { user } = await ensureUserByEmail(email, { fullName: body.fullName?.trim() || null });
    const { activated } = await cohortMemberRepository.setStatus(id, user.id, true, actor.id);
    maybeSendCohortWelcome(id, user.id, activated);
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  // ---- Course pool (admin-only write, matching the original RLS exactly —
  // narrower than requireCanManageCohorts; reads are roster-manager-gated,
  // same reasoning as the managers section below — no public consumer ever
  // needed this, and it discloses which courses a cohort is scoped to) ----

  @Get('{id}/course-pool')
  @Security('session')
  public async getCoursePool(@Path() id: string, @Request() request: ExpressRequest): Promise<string[]> {
    setPrivateNoStoreCache(this);
    await requireCanManageCohortRoster(request.user as User, id);
    return cohortCourseAccessRepository.listForCohort(id);
  }

  @Put('{id}/course-pool/{slug}')
  @Security('session')
  public async setCoursePool(
    @Path() id: string,
    @Path() slug: string,
    @Body() body: CohortSetAllowedRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    requireAdmin(request.user as User);
    if (body.allowed) {
      await cohortCourseAccessRepository.grant(id, slug);
    } else {
      await cohortCourseAccessRepository.revoke(id, slug);
    }
  }

  // ---- Per-member course access (roster-manager-gated reads — this
  // returns per-userId course grants, so an ungated read would leak which
  // specific members have which courses) ----

  @Get('{id}/member-course-access')
  @Security('session')
  public async getMemberCourseAccess(@Path() id: string, @Request() request: ExpressRequest): Promise<MemberCourseAccessEntry[]> {
    setPrivateNoStoreCache(this);
    await requireCanManageCohortRoster(request.user as User, id);
    return cohortMemberCourseAccessRepository.listForCohort(id);
  }

  @Put('{id}/member-course-access/{userId}/{slug}')
  @Security('session')
  public async setMemberCourseAccess(
    @Path() id: string,
    @Path() userId: string,
    @Path() slug: string,
    @Body() body: CohortSetAllowedRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    const user = request.user as User;
    await requireCanManageCohortRoster(user, id);
    if (body.allowed && user.role !== 'ADMIN') {
      // Mirrors the original with_check bounds: course must already be in
      // the cohort's pool, and the target must be an active member.
      const [inPool, isActive] = await Promise.all([
        cohortCourseAccessRepository.isInPool(id, slug),
        cohortMemberRepository.isActiveMember(id, userId),
      ]);
      if (!inPool || !isActive) {
        throw new ForbiddenError('Course must be in the cohort pool and the member must be active');
      }
    }
    if (body.allowed) {
      await cohortMemberCourseAccessRepository.grant(id, userId, slug);
    } else {
      await cohortMemberCourseAccessRepository.revoke(id, userId, slug);
    }
  }

  // ---- Managers (admin-only, matching the original RLS write policy —
  // reads are also admin-gated here since the only real consumer, the
  // launch-cohort admin modal, was only ever reliably usable by admins:
  // can_manage_cohort_roster requires already being a manager to read, and
  // only admins could ever add the first manager) ----

  @Get('{id}/managers')
  @Security('session')
  public async getManagers(@Path() id: string, @Request() request: ExpressRequest): Promise<ManagerEntry[]> {
    setPrivateNoStoreCache(this);
    requireAdmin(request.user as User);
    return cohortManagerRepository.listForCohort(id);
  }

  @Post('{id}/managers')
  @Security('session')
  public async addManager(@Path() id: string, @Body() body: CohortAddManagerRequest, @Request() request: ExpressRequest): Promise<void> {
    requireAdmin(request.user as User);
    await cohortManagerRepository.add(id, body.userId);
  }

  /**
   * Add a cohort manager BY EMAIL — provisions a passwordless account +
   * welcome/set-password email if the person isn't on Sypher yet, then
   * grants the manager role. Same onboarding as every other add-a-user
   * surface.
   */
  @Post('{id}/managers/by-email')
  @Security('session')
  public async addManagerByEmail(
    @Path() id: string,
    @Body() body: CohortAddByEmailRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CohortMessageResponse>,
  ): Promise<CohortLookupUser | void> {
    requireAdmin(request.user as User);
    const email = (body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return badRequest(400, { message: 'Enter a valid email address.' });
    const { user } = await ensureUserByEmail(email, { fullName: body.fullName?.trim() || null });
    await cohortManagerRepository.add(id, user.id);
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  @Delete('{id}/managers/{userId}')
  @Security('session')
  public async removeManager(@Path() id: string, @Path() userId: string, @Request() request: ExpressRequest): Promise<void> {
    requireAdmin(request.user as User);
    await cohortManagerRepository.remove(id, userId);
  }

  @Get('lookup-user')
  @Security('session')
  public async lookupUser(@Query() email: string, @Request() request: ExpressRequest): Promise<CohortLookupUser | null> {
    setPrivateNoStoreCache(this);
    requireAdmin(request.user as User);
    const user = await userRepository.findByEmail(email);
    if (!user || user.deletedAt) return null;
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  // Wildcard single-segment GET — must stay registered AFTER every other
  // fixed single-segment GET route above (lookup-user in particular), or
  // Express/tsoa's first-match routing would swallow those requests here
  // instead (e.g. GET /cohorts/lookup-user matching slug="lookup-user").
  @Get('{slug}')
  public async getPublicBySlug(@Path() slug: string, @Request() request: ExpressRequest): Promise<CohortResponse | void> {
    const cohort = await getOrSet(`cohorts:public-detail:${slug}`, PUBLIC_CACHE_TTL_MS, () => cohortRepository.findBySlugLive(slug));
    if (!cohort) return undefined;
    if (applyPublicDetailCache(this, request, cohort.updatedAt)) {
      this.setStatus(304);
      return;
    }
    return toCohortResponse(cohort);
  }
}
