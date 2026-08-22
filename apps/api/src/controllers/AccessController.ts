import { Body, Controller, Get, Path, Put, Request, Route, Security, Tags } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Company, CourseAccess, NavAccess, Role, User } from '@prisma/client';
import { CourseAccessRepository } from '../repositories/CourseAccessRepository';
import { NavAccessRepository } from '../repositories/NavAccessRepository';
import { CompanyCourseAccessRepository } from '../repositories/CompanyCourseAccessRepository';
import { CompanyNavAccessRepository } from '../repositories/CompanyNavAccessRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { requireAdmin, requireAdminOrOwnCompanyHr } from '../lib/authz';
import { canSeeNavItem, hasCourseAccess } from '../lib/accessControl';

const courseAccessRepository = new CourseAccessRepository();
const navAccessRepository = new NavAccessRepository();
const companyCourseAccessRepository = new CompanyCourseAccessRepository();
const companyNavAccessRepository = new CompanyNavAccessRepository();
const companyRepository = new CompanyRepository();

interface AccessSetRolesRequest {
  allowedRoles: Role[];
}

interface AccessSetCompanyGrantRequest {
  allowed: boolean;
}

@Route('access')
@Tags('Access')
export class AccessController extends Controller {
  @Get('companies')
  @Security('session')
  public async listCompanies(@Request() request: ExpressRequest): Promise<Company[]> {
    requireAdmin(request.user as User);
    return companyRepository.list();
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
    requireAdminOrOwnCompanyHr(request.user as User, companyId);
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
    requireAdminOrOwnCompanyHr(request.user as User, companyId);
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
    requireAdminOrOwnCompanyHr(request.user as User, companyId);
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
    requireAdminOrOwnCompanyHr(request.user as User, companyId);
    if (body.allowed) {
      await companyNavAccessRepository.grant(companyId, itemKey);
    } else {
      await companyNavAccessRepository.revoke(companyId, itemKey);
    }
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
    const companyAllowedSlugs = user.companyId
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
    const companyAllowedItemKeys = user.companyId
      ? new Set(await companyNavAccessRepository.listKeysForCompany(user.companyId))
      : undefined;
    return rows
      .filter((row) => canSeeNavItem(user.role, row.allowedRoles, { companyAllowedItemKeys, itemKey: row.itemKey }))
      .map((row) => row.itemKey);
  }
}
