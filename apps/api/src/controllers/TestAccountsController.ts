import { Controller, Get, Post, Body, Request, Res, Route, Security, Tags, type TsoaResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import type { Role, User } from '@prisma/client';
import { UserRepository } from '../repositories/UserRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { createProvisionedUser } from '../lib/userProvisioning';
import { requireAdmin } from '../lib/authz';
import { env } from '../lib/env';
import {
  findCustomTestAccountByEmail,
  listCustomTestAccounts,
  tryInsertCustomTestAccount,
  updateCustomTestAccountRole,
} from '../lib/customTestAccounts';
import { setPrivateNoStoreCache } from '../lib/httpCache';
import { consumeTestAccountResetAllowance } from '../lib/rateLimit';

/**
 * Dev-only reset harness for the fixed Test-Accounts.md roster (see repo
 * root): lets an admin hard-delete + re-provision one of these accounts
 * from the sidebar, so onboarding (set-password link, first-login modal)
 * and the welcome/set-password emails can be re-tested without touching
 * the DB by hand. Deliberately scoped to this fixed allowlist plus a
 * DB-backed ad-hoc roster (see below) — never accepts an arbitrary email
 * with no record of it anywhere.
 */

const userRepository = new UserRepository();
const companyRepository = new CompanyRepository();

interface TestAccountDef {
  email: string;
  fullName: string;
  role: Role;
  /** Only COMPANY_HR / COMPANY_EMPLOYEE need a company — resolved by name at reset time. */
  companyName?: string;
  /** Can this account's role be changed in place from the Test Accounts page (not just reset back to its default)? */
  roleEditable?: boolean;
}

// Every Role enum value (schema.prisma) is selectable here — wider than
// AccessController's ASSIGNABLE_ROLES (which excludes COMPANY_HR/EMPLOYEE,
// COHORT_USER, REVIEWER, COURSE_AUDITOR because a plain role swap can't set
// up their company/cohort/review context). This is dev test tooling, not
// the real admin role editor, so the wider set is intentional — a
// COMPANY_HR test row without a company just means whatever depends on
// companyId won't work, which is fine to hit while testing.
const ROLE_EDITABLE_ROLES: readonly Role[] = [
  'ADMIN',
  'FREE_USER',
  'PAID_USER',
  'INTERNAL_HR',
  'COMPANY_HR',
  'COMPANY_EMPLOYEE',
  'BRANDER',
  'COHORT_USER',
  'REVIEWER',
  'COURSE_AUDITOR',
];

// FIXED roster only — the 10 role accounts + forcloudread@gmail.com. Static
// source code, never mutated at runtime, so it's identical on every apps/api
// instance by construction and needs no shared table. Ad-hoc accounts added
// via the "add email" box live in the DB ("CustomTestAccount", see
// lib/customTestAccounts.ts) instead of being pushed into this array —
// 2026-09-18 fix: this array used to be mutated at runtime (plus a local
// disk file), which meant an ad-hoc account added on one apps/api instance
// was invisible to every other instance and the roster cap became
// (cap * instance count) instead of a real aggregate.
const TEST_ACCOUNTS: readonly TestAccountDef[] = [
  { email: 'admin-test@sypher.local', fullName: 'Admin Test', role: 'ADMIN' },
  { email: 'free-test@sypher.local', fullName: 'Free Test', role: 'FREE_USER' },
  { email: 'paid-test@sypher.local', fullName: 'Paid Test', role: 'PAID_USER' },
  { email: 'internalhr-test@sypher.local', fullName: 'Internal HR Test', role: 'INTERNAL_HR' },
  { email: 'companyhr-test@sypher.local', fullName: 'Company HR Test', role: 'COMPANY_HR', companyName: 'Acme Corp' },
  { email: 'companyemployee-test@sypher.local', fullName: 'Company Employee Test', role: 'COMPANY_EMPLOYEE', companyName: 'Acme Corp' },
  { email: 'brander-test@sypher.local', fullName: 'Brander Test', role: 'BRANDER' },
  { email: 'cohortuser-test@sypher.local', fullName: 'Cohort User Test', role: 'COHORT_USER' },
  { email: 'reviewer-test@sypher.local', fullName: 'Reviewer Test', role: 'REVIEWER' },
  { email: 'courseauditor-test@sypher.local', fullName: 'Course Auditor Test', role: 'COURSE_AUDITOR' },
  // Real inbox — used to verify onboarding + transactional emails actually
  // land (the *-test@sypher.local accounts route to local GreenMail, not a
  // real mailbox). Role-editable so the same account can be flipped between
  // roles without a delete/recreate round-trip, which would also generate
  // a fresh welcome email every time.
  { email: 'forcloudread@gmail.com', fullName: 'Cloud Read Test', role: 'FREE_USER', roleEditable: true },
];

const FIXED_TEST_ACCOUNT_BY_EMAIL = new Map(TEST_ACCOUNTS.map((a) => [a.email, a]));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same MAX_PAGE_SIZE-style bounded-growth convention used elsewhere
// (BlogController's MAX_MANAGE_PAGE_SIZE, CompanyAdminController's
// MAX_IMPORT_ROWS) — caps how many ad-hoc custom accounts the "add email"
// box can register. Enforced as a true aggregate via
// tryInsertCustomTestAccount's advisory-lock COUNT(*) check (see
// lib/customTestAccounts.ts), not a per-instance counter.
export const MAX_CUSTOM_TEST_ACCOUNTS = 50;

export interface TestAccountRow {
  id: string | null;
  email: string;
  fullName: string;
  role: Role;
  companyName?: string;
  exists: boolean;
  onboarded: boolean;
  roleEditable: boolean;
}

interface ResetTestAccountRequest {
  email: string;
  /**
   * Only meaningful for an email not already on the roster (fixed or
   * custom) — reset() registers it as a new role-editable custom account
   * in the DB instead of 400ing. Defaults to FREE_USER when omitted.
   * Ignored for an existing roster entry, which always resets to its own
   * current role.
   */
  role?: Role;
}

interface SetTestAccountRoleRequest {
  email: string;
  role: Role;
}

@Route('admin/test-accounts')
@Tags('Admin')
export class TestAccountsController extends Controller {
  /** List the fixed + custom roster + whether each currently exists / has completed onboarding. */
  @Get()
  @Security('session')
  public async list(
    @Request() request: ExpressRequest,
    @Res() forbidden: TsoaResponse<403, { message: string }>,
  ): Promise<TestAccountRow[] | void> {
    requireAdmin(request.user as User);
    setPrivateNoStoreCache(this);
    if (env.nodeEnv === 'production') return forbidden(403, { message: 'Not available in production' });

    const custom = await listCustomTestAccounts();
    const defs: TestAccountDef[] = [
      ...TEST_ACCOUNTS,
      ...custom.map((c): TestAccountDef => ({ email: c.email, fullName: c.fullName, role: c.role, roleEditable: true })),
    ];

    const rows: TestAccountRow[] = [];
    for (const def of defs) {
      const existing = await userRepository.findByEmail(def.email);
      rows.push({
        id: existing?.id ?? null,
        email: def.email,
        fullName: def.fullName,
        // Live role once the account exists — a roleEditable account may
        // have been switched away from its def.role default.
        role: existing?.role ?? def.role,
        companyName: def.companyName,
        exists: existing !== null,
        onboarded: existing?.onboardedAt !== null && existing?.onboardedAt !== undefined,
        roleEditable: def.roleEditable ?? false,
      });
    }
    return rows;
  }

  /**
   * Hard-deletes the account (if present) and re-provisions it fresh —
   * passwordless, mustResetPassword, onboarding flags unset — which fires
   * the same welcome + set-password email a real admin-provisioned account
   * gets. Sign in through that email link (or /set-password) to re-walk
   * onboarding.
   *
   * An email not already on the roster (fixed or custom) is registered as
   * a new role-editable custom account instead of being rejected — this is
   * how the "add an email" box in the Role-Switchable Accounts panel
   * works, reusing this endpoint rather than a dedicated add/create one.
   * The registration is a DB row (CustomTestAccount), immediately visible
   * to every apps/api instance, not just the one that handled this request.
   */
  @Post('reset')
  @Security('session')
  public async reset(
    @Body() body: ResetTestAccountRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() forbidden: TsoaResponse<403, { message: string }>,
    @Res() tooManyRequests: TsoaResponse<429, { message: string }, { 'Retry-After': string }>,
  ): Promise<TestAccountRow | void> {
    const admin = request.user as User;
    requireAdmin(admin);
    setPrivateNoStoreCache(this);
    if (env.nodeEnv === 'production') return forbidden(403, { message: 'Not available in production' });

    // Fan-out brake: every reset fires a real welcome/set-password email —
    // same reasoning as consumeCompanyInviteAllowance, a backstop on top of
    // requireAdmin, not the primary defense.
    const retryAfter = await consumeTestAccountResetAllowance(admin.id);
    if (retryAfter > 0) {
      return tooManyRequests(429, { message: 'Too many resets. Please wait and try again.' }, { 'Retry-After': String(retryAfter) });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return badRequest(400, { message: 'Invalid email address' });

    let def: TestAccountDef | undefined = FIXED_TEST_ACCOUNT_BY_EMAIL.get(email);
    if (!def) {
      const existingCustom = await findCustomTestAccountByEmail(email);
      if (existingCustom) {
        def = { email: existingCustom.email, fullName: existingCustom.fullName, role: existingCustom.role, roleEditable: true };
      } else {
        const role = body.role ?? 'FREE_USER';
        if (!ROLE_EDITABLE_ROLES.includes(role)) return badRequest(400, { message: 'Invalid role' });
        const fullName = email.split('@')[0];

        const result = await tryInsertCustomTestAccount(email, fullName, role, MAX_CUSTOM_TEST_ACCOUNTS);
        if (result === 'cap_reached') {
          return badRequest(400, {
            message: `Custom test account limit reached (${MAX_CUSTOM_TEST_ACCOUNTS}) — remove one before adding another`,
          });
        }
        def = { email, fullName, role, roleEditable: true };
      }
    }

    let companyId: string | undefined;
    if (def.companyName) {
      const company = await companyRepository.findByName(def.companyName);
      if (!company) return badRequest(400, { message: `Seed company "${def.companyName}" not found — run npm run seed first` });
      companyId = company.id;
    }

    await userRepository.hardDeleteByEmail(def.email);
    const created = await createProvisionedUser({ email: def.email, fullName: def.fullName, role: def.role, companyId });

    return {
      id: created.id,
      email: def.email,
      fullName: def.fullName,
      role: def.role,
      companyName: def.companyName,
      exists: true,
      onboarded: false,
      roleEditable: def.roleEditable ?? false,
    };
  }

  /**
   * Switches a `roleEditable` test account's role in place, no
   * delete/recreate. Restricted to entries whose `roleEditable` is true —
   * the fixed roster's forcloudread@gmail.com plus every custom (DB-backed)
   * account, since every custom account is role-editable by construction.
   * Any Role enum value is selectable (ROLE_EDITABLE_ROLES above).
   */
  @Post('role')
  @Security('session')
  public async setRole(
    @Body() body: SetTestAccountRoleRequest,
    @Request() request: ExpressRequest,
    @Res() badRequest: TsoaResponse<400, { message: string }>,
    @Res() notFound: TsoaResponse<404, { message: string }>,
    @Res() forbidden: TsoaResponse<403, { message: string }>,
  ): Promise<TestAccountRow | void> {
    requireAdmin(request.user as User);
    setPrivateNoStoreCache(this);
    if (env.nodeEnv === 'production') return forbidden(403, { message: 'Not available in production' });

    const email = body.email?.trim().toLowerCase();
    let def: TestAccountDef | undefined = email ? FIXED_TEST_ACCOUNT_BY_EMAIL.get(email) : undefined;
    let isCustom = false;
    if (!def && email) {
      const existingCustom = await findCustomTestAccountByEmail(email);
      if (existingCustom) {
        def = { email: existingCustom.email, fullName: existingCustom.fullName, role: existingCustom.role, roleEditable: true };
        isCustom = true;
      }
    }
    if (!def) return badRequest(400, { message: 'Not a recognized test account' });
    if (!def.roleEditable) return badRequest(400, { message: 'This test account\'s role cannot be changed here' });
    if (!ROLE_EDITABLE_ROLES.includes(body.role)) return badRequest(400, { message: 'Invalid role' });

    const existing = await userRepository.findByEmail(def.email);
    if (!existing) return notFound(404, { message: 'Account does not exist yet — reset it first' });

    const updated = await userRepository.setRole(existing.id, body.role);
    if (isCustom) {
      await updateCustomTestAccountRole(def.email, updated.role);
    }

    return {
      id: updated.id,
      email: def.email,
      fullName: def.fullName,
      role: updated.role,
      companyName: def.companyName,
      exists: true,
      onboarded: updated.onboardedAt !== null,
      roleEditable: true,
    };
  }
}
