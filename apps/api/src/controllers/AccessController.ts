import { Body, Controller, Get, Path, Post, Put, Query, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { Prisma } from '@prisma/client';
import type { Company, CourseAccess, NavAccess, Role, User } from '@prisma/client';
import { CourseAccessRepository } from '../repositories/CourseAccessRepository';
import { NavAccessRepository } from '../repositories/NavAccessRepository';
import { CompanyCourseAccessRepository } from '../repositories/CompanyCourseAccessRepository';
import { CompanyNavAccessRepository } from '../repositories/CompanyNavAccessRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { provisionCompanyAdmin, createSetPasswordLink, issueSetPasswordLink } from '../lib/companyProvisioning';
import { UserRepository } from '../repositories/UserRepository';
import { requireAdmin } from '../lib/authz';
import { canSeeNavItem, hasCourseAccess } from '../lib/accessControl';
import { isCompanyAccessActive } from '../lib/companyAccess';
import { HttpError } from '../lib/errors';
import { hashPassword } from '../lib/password';

const courseAccessRepository = new CourseAccessRepository();
const navAccessRepository = new NavAccessRepository();
const companyCourseAccessRepository = new CompanyCourseAccessRepository();
const companyNavAccessRepository = new CompanyNavAccessRepository();
const companyRepository = new CompanyRepository();
const companyDirectoryRepository = new CompanyDirectoryRepository();
const userRepository = new UserRepository();

interface AccessSetRolesRequest {
  allowedRoles: Role[];
}

interface AccessSetCompanyGrantRequest {
  allowed: boolean;
}

interface AccessUserRoleRow {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: Role;
}

interface AccessUserListResponse {
  items: AccessUserRoleRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface AccessCreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  role?: Role;
}

interface AccessSetUserRoleRequest {
  role: Role;
}

interface AccessCompanyListResponse {
  items: Company[];
  total: number;
  page: number;
  pageSize: number;
}

interface AccessSaveCompanyRequest {
  companyId: string;
  name: string;
  logoUrl: string;
  primaryEmail: string;
  secondaryEmail: string;
  adminEmail: string;
  address: string;
  city: string;
  stateProvince: string;
  countyDistrict: string;
  country: string;
  seats: number;
  totalYearlyCost: number;
  accessUntil: string; // ISO date (YYYY-MM-DD from the date input) — till when the company can access the site
}

// Same shape as the signup validation in AuthController/ContactController —
// defined per-file in this codebase, no shared constant.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Roles admins may assign through these endpoints (the User Role tab's
// offer list). Anything else — COMPANY_HR/EMPLOYEE, COHORT_USER — comes
// from company/cohort flows or direct seeding, not manual reassignment.
const ASSIGNABLE_ROLES: readonly Role[] = ['FREE_USER', 'PAID_USER', 'INTERNAL_HR', 'BRANDER', 'ADMIN'];

// Company business-code format: 3-12 uppercase letters/digits, starting
// with a letter (e.g. ACME, GNFC01). Human-facing, unique, immutable in
// meaning — relations/grants still reference the cuid PK.
const COMPANY_ID_PATTERN = /^[A-Z][A-Z0-9]{2,11}$/;

function cleanOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toRoleRow(user: User): AccessUserRoleRow {
  return { id: user.id, email: user.email, username: user.username, fullName: user.fullName, role: user.role };
}

type CompanySaveData = {
  name: string;
  companyId: string;
  logoUrl: string;
  primaryEmail: string;
  secondaryEmail: string;
  adminEmail: string;
  address: string;
  city: string;
  stateProvince: string;
  countyDistrict: string;
  country: string;
  seats: number;
  totalYearlyCost: number;
  accessUntil: Date;
};

@Route('access')
@Tags('Access')
export class AccessController extends Controller {
  @Get('companies')
  @Security('session')
  public async listCompanies(@Request() request: ExpressRequest): Promise<Company[]> {
    requireAdmin(request.user as User);
    return companyRepository.list();
  }

  // ---- Company directory (admin only): paged list + create + edit ----

  @Get('companies/paged')
  @Security('session')
  public async listCompaniesPaged(
    @Request() request: ExpressRequest,
    @Query() q?: string,
    @Query() page?: number,
    @Query() pageSize?: number,
  ): Promise<AccessCompanyListResponse> {
    requireAdmin(request.user as User);
    const term = (q ?? '').trim().slice(0, 100);
    const safePage = Math.max(1, Math.floor(page ?? 1));
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize ?? 10)));
    const { items, total } = await companyRepository.searchPage(term, (safePage - 1) * safePageSize, safePageSize);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  // Shared shape/validation for create + edit — every field is mandatory.
  // Company ID and name are unique at the DB; a losing race surfaces as a
  // clean 409 from the repo.
  private parseCompanyBody(body: AccessSaveCompanyRequest, badRequest: TsoaResponse<400, { message: string }>): CompanySaveData | void {
    const name = body.name?.trim() ?? '';
    if (!name) return badRequest(400, { message: 'Company name is required' });

    const businessId = body.companyId?.trim().toUpperCase() ?? '';
    if (!COMPANY_ID_PATTERN.test(businessId)) {
      return badRequest(400, { message: 'Company ID must be 3-12 uppercase letters/digits and start with a letter' });
    }

    const emailLabels = { primaryEmail: 'Primary email', secondaryEmail: 'Secondary email', adminEmail: 'Admin email' } as const;
    for (const field of ['primaryEmail', 'secondaryEmail', 'adminEmail'] as const) {
      const value = cleanOptional(body[field]);
      if (!value) return badRequest(400, { message: `${emailLabels[field]} is required` });
      if (!EMAIL_RE.test(value)) return badRequest(400, { message: `${emailLabels[field]} is invalid` });
    }

    const textLabels = {
      logoUrl: 'Company logo URL',
      address: 'Address',
      city: 'City',
      stateProvince: 'State / Province',
      countyDistrict: 'County / District',
      country: 'Country',
    } as const;
    for (const field of Object.keys(textLabels) as (keyof typeof textLabels)[]) {
      if (!cleanOptional(body[field])) return badRequest(400, { message: `${textLabels[field]} is required` });
    }

    for (const [field, label] of [
      ['seats', 'Number of seats'],
      ['totalYearlyCost', 'Total yearly cost'],
    ] as const) {
      const value = body[field];
      if (value == null || !Number.isInteger(value) || value < 0) {
        return badRequest(400, { message: `${label} must be a non-negative whole number` });
      }
    }

    const accessUntilRaw = body.accessUntil?.trim() ?? '';
    if (!accessUntilRaw) return badRequest(400, { message: 'Access till date is required' });
    const accessUntil = new Date(accessUntilRaw);
    if (Number.isNaN(accessUntil.getTime())) return badRequest(400, { message: 'Access till date is invalid' });
    if (accessUntil.getTime() <= Date.now()) return badRequest(400, { message: 'Access till date must be in the future' });

    return {
      name,
      companyId: businessId,
      logoUrl: cleanOptional(body.logoUrl) as string,
      primaryEmail: cleanOptional(body.primaryEmail) as string,
      secondaryEmail: cleanOptional(body.secondaryEmail) as string,
      adminEmail: cleanOptional(body.adminEmail) as string,
      address: cleanOptional(body.address) as string,
      city: cleanOptional(body.city) as string,
      stateProvince: cleanOptional(body.stateProvince) as string,
      countyDistrict: cleanOptional(body.countyDistrict) as string,
      country: cleanOptional(body.country) as string,
      seats: body.seats,
      totalYearlyCost: body.totalYearlyCost,
      accessUntil,
    };
  }

  @Post('companies')
  @Security('session')
  public async createCompany(
    @Body() body: AccessSaveCompanyRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<Company | void> {
    requireAdmin(request.user as User);
    const data = this.parseCompanyBody(body, badRequest);
    if (!data) return;
    try {
      const company = await companyRepository.create(data);
      // adminEmail designates the company's own portal admin — provision a
      // COMPANY_HR account + set-password email. Fire-and-forget: a
      // provisioning hiccup (e.g. that email already belongs to another
      // company) is logged, never fails the company save.
      void provisionCompanyAdmin(company.id, data.adminEmail, company.name);
      return company;
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        return conflict(409, { message: error.message });
      }
      throw error;
    }
  }

  @Put('companies/{companyId}')
  @Security('session')
  public async updateCompany(
    @Path() companyId: string,
    @Body() body: AccessSaveCompanyRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() notFound: TsoaResponse<404, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<Company | void> {
    requireAdmin(request.user as User);
    const existing = await companyRepository.findById(companyId);
    if (!existing) return notFound(404, { message: 'Company not found' });
    const data = this.parseCompanyBody(body, badRequest);
    if (!data) return;
    try {
      const updated = await companyRepository.update(companyId, data);
      // Only (re)provision when the admin email actually changed.
      if (data.adminEmail.toLowerCase() !== (existing.adminEmail ?? '').toLowerCase()) {
        void provisionCompanyAdmin(companyId, data.adminEmail, updated.name);
      }
      return updated;
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        return conflict(409, { message: error.message });
      }
      throw error;
    }
  }

  /**
   * Bootstrap helper for Sypher staff: (re)provision the company's admin
   * (its `adminEmail`) as a COMPANY_HR and return a fresh set-password
   * link. Lets an admin hand the link over directly when no email provider
   * is configured. Returns 409 if that email belongs to another company.
   */
  @Post('companies/{companyId}/admin-invite-link')
  @Security('session')
  public async companyAdminInviteLink(
    @Path() companyId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<{ url: string; email: string } | void> {
    requireAdmin(request.user as User);
    const company = await companyRepository.findById(companyId);
    if (!company) return notFound(404, { message: 'Company not found' });
    if (!company.adminEmail) return notFound(404, { message: 'This company has no admin email set.' });

    const outcome = await provisionCompanyAdmin(company.id, company.adminEmail, company.name);
    if (outcome.status === 'conflict') {
      return conflict(409, { message: `${outcome.email} already belongs to a different company.` });
    }
    return { url: await createSetPasswordLink(outcome.user.id), email: outcome.user.email };
  }

  // ---- Role-based course access (public read, admin write) ----

  @Get('courses')
  public async listCourseAccess(): Promise<CourseAccess[]> {
    return courseAccessRepository.listAll();
  }

  @Put('courses/{slug}')
  @Security('session')
  public async setCourseAccess(
    @Path() slug: string,
    @Body() body: AccessSetRolesRequest,
    @Request() request: ExpressRequest,
  ): Promise<CourseAccess> {
    requireAdmin(request.user as User);
    return courseAccessRepository.setAllowedRoles(slug, body.allowedRoles);
  }

  // ---- Role-based nav access (public read, admin write) ----

  @Get('nav')
  public async listNavAccess(): Promise<NavAccess[]> {
    return navAccessRepository.listAll();
  }

  @Put('nav/{itemKey}')
  @Security('session')
  public async setNavAccess(
    @Path() itemKey: string,
    @Body() body: AccessSetRolesRequest,
    @Request() request: ExpressRequest,
  ): Promise<NavAccess> {
    requireAdmin(request.user as User);
    return navAccessRepository.setAllowedRoles(itemKey, body.allowedRoles);
  }

  // ---- Company-scoped course access (admin, or that company's HR) ----

  @Get('companies/{companyId}/courses')
  @Security('session')
  public async listCompanyCourseAccess(@Path() companyId: string, @Request() request: ExpressRequest): Promise<string[]> {
    requireAdmin(request.user as User);
    return companyCourseAccessRepository.listSlugsForCompany(companyId);
  }

  @Put('companies/{companyId}/courses/{slug}')
  @Security('session')
  public async setCompanyCourseAccess(
    @Path() companyId: string,
    @Path() slug: string,
    @Body() body: AccessSetCompanyGrantRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    requireAdmin(request.user as User);
    if (body.allowed) {
      await companyCourseAccessRepository.grant(companyId, slug);
    } else {
      await companyCourseAccessRepository.revoke(companyId, slug);
    }
  }

  // ---- Company-scoped nav access (admin, or that company's HR) ----

  @Get('companies/{companyId}/nav')
  @Security('session')
  public async listCompanyNavAccess(@Path() companyId: string, @Request() request: ExpressRequest): Promise<string[]> {
    requireAdmin(request.user as User);
    return companyNavAccessRepository.listKeysForCompany(companyId);
  }

  @Put('companies/{companyId}/nav/{itemKey}')
  @Security('session')
  public async setCompanyNavAccess(
    @Path() companyId: string,
    @Path() itemKey: string,
    @Body() body: AccessSetCompanyGrantRequest,
    @Request() request: ExpressRequest,
  ): Promise<void> {
    requireAdmin(request.user as User);
    if (body.allowed) {
      await companyNavAccessRepository.grant(companyId, itemKey);
    } else {
      await companyNavAccessRepository.revoke(companyId, itemKey);
    }
  }

  // ---- User role assignment (admin only) ----

  @Get('users')
  @Security('session')
  public async listUsers(
    @Request() request: ExpressRequest,
    @Query() q?: string,
    @Query() page?: number,
    @Query() pageSize?: number,
  ): Promise<AccessUserListResponse> {
    requireAdmin(request.user as User);
    const term = (q ?? '').trim().slice(0, 100);
    const safePage = Math.max(1, Math.floor(page ?? 1));
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize ?? 10)));
    const { items, total } = await userRepository.searchUsersPage(term, (safePage - 1) * safePageSize, safePageSize);
    return { items: items.map(toRoleRow), total, page: safePage, pageSize: safePageSize };
  }

  // Admin-provisioned account. The admin sets a temporary password (kept
  // as a fallback), the account is flagged mustResetPassword, and the new
  // user is emailed a welcome + set-password link — same experience as the
  // corporate-onboarding path, so they never need to be told the temp
  // password. Email send is fire-and-forget.
  @Post('users')
  @Security('session')
  public async createUser(
    @Body() body: AccessCreateUserRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() conflict: TsoaResponse<409, { message: string }>,
  ): Promise<AccessUserRoleRow | void> {
    requireAdmin(request.user as User);
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return badRequest(400, { message: 'Invalid email address' });
    if (!body.fullName?.trim()) return badRequest(400, { message: 'Full name is required' });
    if (body.password.length < 8) return badRequest(400, { message: 'Password must be at least 8 characters' });
    if (!ASSIGNABLE_ROLES.includes(body.role ?? 'FREE_USER')) return badRequest(400, { message: 'Invalid role' });

    const existing = await userRepository.findByEmail(email);
    if (existing) return conflict(409, { message: 'An account with this email already exists' });

    const passwordHash = await hashPassword(body.password);
    try {
      const user = await userRepository.create({
        email,
        passwordHash,
        fullName: body.fullName?.trim() || null,
        provider: 'EMAIL',
        role: body.role ?? 'FREE_USER',
        // Admin picked this password — force the user to set their own on
        // first sign-in.
        mustResetPassword: true,
      });
      // Welcome + set-password link (the token flow clears mustResetPassword
      // when they follow it). Falls back to the admin's temp password +
      // the /set-password screen if the email never arrives.
      void issueSetPasswordLink(user);
      return toRoleRow(user);
    } catch (error) {
      // Unique index settled a same-email race between check and create.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return conflict(409, { message: 'That email or username is already taken' });
      }
      throw error;
    }
  }

  // Admins can reassign any account's role. Changing your own is refused —
  // demoting yourself would be irreversible without direct DB access.
  @Put('users/{userId}/role')
  @Security('session')
  public async setUserRole(
    @Path() userId: string,
    @Body() body: AccessSetUserRoleRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
  ): Promise<AccessUserRoleRow | void> {
    const admin = request.user as User;
    requireAdmin(admin);
    if (!ASSIGNABLE_ROLES.includes(body.role)) return badRequest(400, { message: 'Invalid role' });
    if (admin.id === userId) {
      return badRequest(400, { message: 'You cannot change your own role.' });
    }
    await userRepository.setRole(userId, body.role);
    const fresh = await userRepository.findById(userId);
    return fresh ? toRoleRow(fresh) : undefined;
  }

  // ---- Self-service: what can the current user actually see? ----
  // What actually drives the dashboard shell's gating, per the scaffolding
  // plan — evaluated against real DB rows via the ported access-control
  // logic, not hardcoded.

  @Get('my-courses')
  @Security('session')
  public async myCourses(@Request() request: ExpressRequest): Promise<string[]> {
    const user = request.user as User;
    const rows = await courseAccessRepository.listAll();
    // Company grants stop counting once the company's accessUntil has
    // passed (see lib/companyAccess.ts) — mirrors the in-repo gate on the
    // authored-course path (AuthoredCompanyCourseAccessRepository).
    const companyAllowedSlugs = user.companyId && (await isCompanyAccessActive(user.companyId))
      ? new Set(await companyCourseAccessRepository.listSlugsForCompany(user.companyId))
      : undefined;
    return rows
      .filter((row) => hasCourseAccess(user.role, row.allowedRoles, { companyAllowedSlugs, slug: row.courseSlug }))
      .map((row) => row.courseSlug);
  }

  @Get('my-nav')
  @Security('session')
  public async myNav(@Request() request: ExpressRequest): Promise<string[]> {
    const user = request.user as User;
    const rows = await navAccessRepository.listAll();
    // Sidebar access reaches an employee through their GROUPS (managed on
    // the corporate portal); the company-wide CompanyNavAccess is now just
    // the ceiling the portal admin picks from. listNavKeysForUserGroups
    // returns [] once accessUntil has lapsed.
    const companyAllowedItemKeys = user.companyId
      ? new Set(await companyDirectoryRepository.listNavKeysForUserGroups(user.companyId, user.id))
      : undefined;
    return rows
      .filter((row) => canSeeNavItem(user.role, row.allowedRoles, { companyAllowedItemKeys, itemKey: row.itemKey }))
      .map((row) => row.itemKey);
  }
}
