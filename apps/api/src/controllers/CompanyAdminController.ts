import { Body, Controller, Delete, Get, Path, Post, Put, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';
import { requireCompanyAdmin } from '../lib/authz';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { AuthoredCompanyCourseAccessRepository } from '../repositories/AuthoredCompanyCourseAccessRepository';
import { CompanyNavAccessRepository } from '../repositories/CompanyNavAccessRepository';
import { CourseRepository } from '../repositories/CourseRepository';
import { UserRepository } from '../repositories/UserRepository';
import { provisionCompanyEmployee, issueSetPasswordLink, createSetPasswordLink } from '../lib/companyProvisioning';

/**
 * The corporate portal's admin API (corporate.sypher.local). EVERY method
 * scopes to `requireCompanyAdmin(user)` → the caller's own `companyId`;
 * group / employee ids from the path are always re-checked against that
 * companyId in the repository layer, so a COMPANY_HR can never reach
 * another tenant's rows. No company id is ever accepted from the client.
 *
 * All company-directory data goes through CompanyDirectoryRepository — the
 * single seam for a future per-company database (see that file).
 */

const dir = new CompanyDirectoryRepository();
const companyRepository = new CompanyRepository();
const companyCourseCeiling = new AuthoredCompanyCourseAccessRepository();
const companyNavCeiling = new CompanyNavAccessRepository();
const courseRepository = new CourseRepository();
const userRepository = new UserRepository();

@Route('company-admin')
@Tags('CompanyAdmin')
@Security('session')
export class CompanyAdminController extends Controller {
  // ── Overview ──
  @Get('overview')
  public async overview(@Request() request: ExpressRequest): Promise<CompanyAdminOverview> {
    const companyId = requireCompanyAdmin(request.user as User);
    const [company, employeeCount, groupCount, ceilingCourses, ceilingNav] = await Promise.all([
      companyRepository.findById(companyId),
      dir.countEmployees(companyId, 'active'),
      dir.countGroups(companyId),
      companyCourseCeiling.listCourseIdsForCompanyUnfiltered(companyId),
      companyNavCeiling.listKeysForCompany(companyId),
    ]);
    return {
      companyName: company?.name ?? '',
      accessUntil: company ? company.accessUntil.toISOString() : null,
      seats: company?.seats ?? null,
      employeeCount,
      groupCount,
      ceilingCourseCount: ceilingCourses.length,
      ceilingNavCount: ceilingNav.length,
    };
  }

  // ── Groups ──
  @Get('groups')
  public async listGroups(@Request() request: ExpressRequest): Promise<CompanyAdminGroup[]> {
    const companyId = requireCompanyAdmin(request.user as User);
    const [groups, memberships] = await Promise.all([dir.listGroups(companyId), dir.listAllMemberships(companyId)]);
    const memberCount = new Map<string, number>();
    for (const m of memberships) memberCount.set(m.groupId, (memberCount.get(m.groupId) ?? 0) + 1);
    const withCounts = await Promise.all(
      groups.map(async (g) => {
        const [courses, nav] = await Promise.all([dir.listGroupCourseIds(companyId, g.id), dir.listGroupNavKeys(companyId, g.id)]);
        return { id: g.id, name: g.name, memberCount: memberCount.get(g.id) ?? 0, courseCount: courses.length, navCount: nav.length };
      }),
    );
    return withCounts;
  }

  @Post('groups')
  public async createGroup(
    @Body() body: CompanyAdminGroupNameRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CompanyAdminMessageResponse>,
    @Res() conflict: TsoaResponse<409, CompanyAdminMessageResponse>,
  ): Promise<CompanyAdminGroup | void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const name = (body.name ?? '').trim();
    if (!name) return badRequest(400, { message: 'Group name is required.' });
    try {
      const group = await dir.createGroup(companyId, name);
      return { id: group.id, name: group.name, memberCount: 0, courseCount: 0, navCount: 0 };
    } catch {
      return conflict(409, { message: 'A group with that name already exists.' });
    }
  }

  @Put('groups/{groupId}')
  public async renameGroup(
    @Path() groupId: string,
    @Body() body: CompanyAdminGroupNameRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CompanyAdminMessageResponse>,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
    @Res() conflict: TsoaResponse<409, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const name = (body.name ?? '').trim();
    if (!name) return badRequest(400, { message: 'Group name is required.' });
    try {
      const count = await dir.renameGroup(companyId, groupId, name);
      if (count === 0) return notFound(404, { message: 'Group not found.' });
    } catch {
      return conflict(409, { message: 'A group with that name already exists.' });
    }
  }

  @Delete('groups/{groupId}')
  public async deleteGroup(
    @Path() groupId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const count = await dir.deleteGroup(companyId, groupId);
    if (count === 0) return notFound(404, { message: 'Group not found.' });
  }

  // ── Employees ──
  @Get('employees')
  public async listEmployees(@Request() request: ExpressRequest): Promise<CompanyAdminEmployee[]> {
    const companyId = requireCompanyAdmin(request.user as User);
    const [roster, memberships] = await Promise.all([dir.listEmployees(companyId), dir.listAllMemberships(companyId)]);
    const groupsByUser = new Map<string, string[]>();
    for (const m of memberships) {
      const list = groupsByUser.get(m.userId) ?? [];
      list.push(m.groupId);
      groupsByUser.set(m.userId, list);
    }
    const users = await Promise.all(roster.map((r) => userRepository.findById(r.userId)));
    return roster.map((r, i) => {
      const u = users[i];
      return {
        userId: r.userId,
        email: u?.email ?? '',
        fullName: u?.fullName ?? null,
        hasPassword: !!u?.passwordHash,
        jobTitle: r.jobTitle,
        managerName: r.managerName,
        status: r.status,
        groupIds: groupsByUser.get(r.userId) ?? [],
      };
    });
  }

  @Post('employees/import')
  public async importEmployees(
    @Body() body: CompanyAdminImportRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, CompanyAdminMessageResponse>,
  ): Promise<CompanyAdminImportReport | void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const rows = parseEmployeeCsv(body.csv ?? '');
    if (rows === null) return badRequest(400, { message: 'Could not read the CSV. Expected a header row with Full Name, Email Id, Department, Role, Manager Name.' });
    if (rows.length === 0) return badRequest(400, { message: 'No data rows found in the CSV.' });

    const company = await companyRepository.findById(companyId);
    const companyName = company?.name ?? 'your company';
    const report: CompanyAdminImportReport = { rowsProcessed: 0, created: 0, linked: 0, updated: 0, skipped: [] };
    // Cache groups created during this import so we don't re-query per row.
    const groupCache = new Map<string, string>();

    for (const row of rows) {
      report.rowsProcessed += 1;
      const email = row.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        report.skipped.push({ email: row.email || '(blank)', reason: 'Invalid email address' });
        continue;
      }

      const outcome = await provisionCompanyEmployee(companyId, companyName, email, row.fullName.trim() || null);
      if (outcome.status === 'conflict') {
        report.skipped.push({ email, reason: 'Already belongs to a different company' });
        continue;
      }
      if (outcome.status === 'created') report.created += 1;
      else if (outcome.status === 'linked') report.linked += 1;
      else report.updated += 1;

      await dir.upsertEmployee(companyId, outcome.user.id, {
        jobTitle: row.jobTitle.trim() || null,
        managerName: row.managerName.trim() || null,
      });

      // Department → group membership (additive; import never removes a
      // person from a group they're already in).
      const dept = row.department.trim();
      if (dept) {
        let groupId = groupCache.get(dept.toLowerCase());
        if (!groupId) {
          const group = await dir.ensureGroup(companyId, dept);
          groupId = group.id;
          groupCache.set(dept.toLowerCase(), groupId);
        }
        await dir.addMember(companyId, groupId, outcome.user.id, (request.user as User).id);
      }
    }
    return report;
  }

  @Put('employees/{userId}/groups')
  public async setEmployeeGroups(
    @Path() userId: string,
    @Body() body: CompanyAdminSetGroupsRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const employee = await dir.getEmployee(companyId, userId);
    if (!employee) return notFound(404, { message: 'Employee not found.' });
    await dir.setUserGroups(companyId, userId, body.groupIds ?? [], (request.user as User).id);
  }

  @Post('employees/{userId}/resend-invite')
  public async resendInvite(
    @Path() userId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
    @Res() badRequest: TsoaResponse<400, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const employee = await dir.getEmployee(companyId, userId);
    if (!employee) return notFound(404, { message: 'Employee not found.' });
    const user = await userRepository.findById(userId);
    if (!user) return notFound(404, { message: 'Employee not found.' });
    if (user.passwordHash) return badRequest(400, { message: 'This person has already set a password.' });
    const company = await companyRepository.findById(companyId);
    await issueSetPasswordLink(user, company?.name ?? 'Sypher');
  }

  /**
   * Mint a fresh set-password link and RETURN it (no email) — for handing
   * to an employee directly, e.g. when no email provider is configured.
   */
  @Post('employees/{userId}/invite-link')
  public async inviteLink(
    @Path() userId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
    @Res() badRequest: TsoaResponse<400, CompanyAdminMessageResponse>,
  ): Promise<CompanyAdminInviteLink | void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const employee = await dir.getEmployee(companyId, userId);
    if (!employee) return notFound(404, { message: 'Employee not found.' });
    const user = await userRepository.findById(userId);
    if (!user) return notFound(404, { message: 'Employee not found.' });
    if (user.passwordHash) return badRequest(400, { message: 'This person has already set a password.' });
    return { url: await createSetPasswordLink(userId), email: user.email };
  }

  @Delete('employees/{userId}')
  public async removeEmployee(
    @Path() userId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const count = await dir.setEmployeeStatus(companyId, userId, 'removed');
    if (count === 0) return notFound(404, { message: 'Employee not found.' });
    // Strip group memberships so they stop resolving access, then sever
    // the User↔company link entirely (drops COMPANY_EMPLOYEE → FREE_USER).
    await dir.setUserGroups(companyId, userId, [], (request.user as User).id);
    await userRepository.unlinkFromCompany(userId, companyId);
  }

  // ── Group course access (ceiling = company-wide grant, unfiltered) ──
  @Get('groups/{groupId}/courses')
  public async groupCourses(
    @Path() groupId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
  ): Promise<CompanyAdminGroupCourseAccess | void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const group = await dir.getGroup(companyId, groupId);
    if (!group) return notFound(404, { message: 'Group not found.' });
    const ceilingIds = await companyCourseCeiling.listCourseIdsForCompanyUnfiltered(companyId);
    const [courses, granted] = await Promise.all([
      courseRepository.findByIds(ceilingIds),
      dir.listGroupCourseIds(companyId, groupId),
    ]);
    const grantedSet = new Set(granted);
    return {
      ceiling: courses.map((c) => ({ id: c.id, name: c.name, slug: c.slug, granted: grantedSet.has(c.id) })),
    };
  }

  @Put('groups/{groupId}/courses/{courseId}')
  public async setGroupCourse(
    @Path() groupId: string,
    @Path() courseId: string,
    @Body() body: CompanyAdminAllowedRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
    @Res() forbidden: TsoaResponse<403, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const group = await dir.getGroup(companyId, groupId);
    if (!group) return notFound(404, { message: 'Group not found.' });
    if (body.allowed) {
      const ceiling = new Set(await companyCourseCeiling.listCourseIdsForCompanyUnfiltered(companyId));
      if (!ceiling.has(courseId)) {
        return forbidden(403, { message: "That course isn't part of your company's plan." });
      }
    }
    await dir.setGroupCourse(companyId, groupId, courseId, body.allowed);
  }

  // ── Group sidebar (nav) access ──
  @Get('groups/{groupId}/nav')
  public async groupNav(
    @Path() groupId: string,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
  ): Promise<CompanyAdminGroupNavAccess | void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const group = await dir.getGroup(companyId, groupId);
    if (!group) return notFound(404, { message: 'Group not found.' });
    const [ceiling, granted] = await Promise.all([
      companyNavCeiling.listKeysForCompany(companyId),
      dir.listGroupNavKeys(companyId, groupId),
    ]);
    const grantedSet = new Set(granted);
    return { ceiling: ceiling.map((itemKey) => ({ itemKey, granted: grantedSet.has(itemKey) })) };
  }

  @Put('groups/{groupId}/nav/{itemKey}')
  public async setGroupNav(
    @Path() groupId: string,
    @Path() itemKey: string,
    @Body() body: CompanyAdminAllowedRequest,
    @Request() request: ExpressRequest,
    @Res() notFound: TsoaResponse<404, CompanyAdminMessageResponse>,
    @Res() forbidden: TsoaResponse<403, CompanyAdminMessageResponse>,
  ): Promise<void> {
    const companyId = requireCompanyAdmin(request.user as User);
    const group = await dir.getGroup(companyId, groupId);
    if (!group) return notFound(404, { message: 'Group not found.' });
    if (body.allowed) {
      const ceiling = new Set(await companyNavCeiling.listKeysForCompany(companyId));
      if (!ceiling.has(itemKey)) {
        return forbidden(403, { message: "That sidebar item isn't part of your company's plan." });
      }
    }
    await dir.setGroupNav(companyId, groupId, itemKey, body.allowed);
  }
}

// ─── CSV parsing ─────────────────────────────────────────────────────────

interface EmployeeCsvRow {
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  managerName: string;
}

/**
 * Minimal CSV reader — handles quoted fields, embedded commas/newlines,
 * and "" escapes; tolerant of CRLF. Header row is matched loosely so
 * "Email Id" / "Email" / "email_id" all work. Returns null if the header
 * can't be understood.
 */
function parseEmployeeCsv(text: string): EmployeeCsvRow[] | null {
  const cells = tokenizeCsv(text);
  if (cells.length === 0) return null;
  const header = cells[0].map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, ''));
  const col = (aliases: string[]): number => header.findIndex((h) => aliases.includes(h));
  const idx = {
    fullName: col(['fullname', 'name']),
    email: col(['emailid', 'email', 'emailaddress']),
    department: col(['department', 'dept', 'group']),
    role: col(['role', 'title', 'jobtitle', 'designation']),
    manager: col(['managername', 'manager', 'reportingmanager']),
  };
  if (idx.fullName === -1 || idx.email === -1) return null;

  const rows: EmployeeCsvRow[] = [];
  for (let i = 1; i < cells.length; i++) {
    const r = cells[i];
    if (r.every((c) => c.trim() === '')) continue;
    rows.push({
      fullName: r[idx.fullName] ?? '',
      email: r[idx.email] ?? '',
      department: idx.department === -1 ? '' : r[idx.department] ?? '',
      jobTitle: idx.role === -1 ? '' : r[idx.role] ?? '',
      managerName: idx.manager === -1 ? '' : r[idx.manager] ?? '',
    });
  }
  return rows;
}

function tokenizeCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      out.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}

// ─── DTOs (domain-prefixed) ─────────────────────────────────────────────

export interface CompanyAdminOverview {
  companyName: string;
  accessUntil: string | null;
  seats: number | null;
  employeeCount: number;
  groupCount: number;
  ceilingCourseCount: number;
  ceilingNavCount: number;
}

export interface CompanyAdminGroup {
  id: string;
  name: string;
  memberCount: number;
  courseCount: number;
  navCount: number;
}

export interface CompanyAdminGroupNameRequest {
  name: string;
}

export interface CompanyAdminEmployee {
  userId: string;
  email: string;
  fullName: string | null;
  hasPassword: boolean;
  jobTitle: string | null;
  managerName: string | null;
  status: string;
  groupIds: string[];
}

export interface CompanyAdminImportRequest {
  /** Raw CSV text: header + rows. Columns: Full Name, Email Id, Department, Role, Manager Name. */
  csv: string;
}

export interface CompanyAdminImportReport {
  rowsProcessed: number;
  created: number;
  linked: number;
  updated: number;
  skipped: { email: string; reason: string }[];
}

export interface CompanyAdminSetGroupsRequest {
  groupIds: string[];
}

export interface CompanyAdminAllowedRequest {
  allowed: boolean;
}

export interface CompanyAdminGroupCourseAccess {
  ceiling: { id: string; name: string; slug: string; granted: boolean }[];
}

export interface CompanyAdminGroupNavAccess {
  ceiling: { itemKey: string; granted: boolean }[];
}

export interface CompanyAdminInviteLink {
  url: string;
  email: string;
}

export interface CompanyAdminMessageResponse {
  message: string;
}
