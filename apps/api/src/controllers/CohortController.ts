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

@Route('cohorts')
@Tags('Cohorts')
export class CohortController extends Controller {
  // ---- Public ----

  @Get()
  public async listPublic(): Promise<Cohort[]> {
    return getOrSet('cohorts:public-list', PUBLIC_CACHE_TTL_MS, () => cohortRepository.listPublicLive());
  }

  @Post('revalidate')
  @Security('session')
  public async revalidate(@Request() request: ExpressRequest): Promise<void> {
    await requireCanManageCohorts(request.user as User);
    purge('cohorts');
  }

  // ---- Management (launch-cohort) ----

  @Get('manage/list')
  @Security('session')
  public async listManage(@Request() request: ExpressRequest): Promise<Cohort[]> {
    await requireCanManageCohorts(request.user as User);
    return cohortRepository.listAll();
  }

  @Post()
  @Security('session')
  public async create(@Body() body: CreateCohortRequest, @Request() request: ExpressRequest): Promise<Cohort> {
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
    return cohort;
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

  @Get('manage/roster-cohorts')
  @Security('session')
  public async listRosterCohorts(@Request() request: ExpressRequest): Promise<Cohort[]> {
    const user = request.user as User;
    const scope = await rosterPickerScope(user);
    return scope === 'all' ? cohortRepository.listAll() : cohortRepository.listForManager(user.id);
  }

  @Get('{id}/roster')
  @Security('session')
  public async getRoster(@Path() id: string, @Request() request: ExpressRequest): Promise<RosterEntry[]> {
    await requireCanManageCohortRoster(request.user as User, id);
    return cohortMemberRepository.listRoster(id);
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
  // narrower than requireCanManageCohorts) ----

  @Get('{id}/course-pool')
  public async getCoursePool(@Path() id: string): Promise<string[]> {
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

  // ---- Per-member course access ----

  @Get('{id}/member-course-access')
  public async getMemberCourseAccess(@Path() id: string): Promise<MemberCourseAccessEntry[]> {
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
  public async getPublicBySlug(@Path() slug: string): Promise<Cohort | null> {
    return getOrSet(`cohorts:public-detail:${slug}`, PUBLIC_CACHE_TTL_MS, () => cohortRepository.findBySlugLive(slug));
  }
}
