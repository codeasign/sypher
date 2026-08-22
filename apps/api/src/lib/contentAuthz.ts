import type { User } from '@prisma/client';
import { NavAccessRepository } from '../repositories/NavAccessRepository';
import { CohortManagerRepository } from '../repositories/CohortManagerRepository';
import { ForbiddenError } from './authz';

const navAccessRepository = new NavAccessRepository();
const cohortManagerRepository = new CohortManagerRepository();

async function hasNavAccess(role: User['role'], itemKey: string): Promise<boolean> {
  const allowedRoles = await navAccessRepository.getAllowedRoles(itemKey);
  return allowedRoles.includes(role);
}

/** Ports can_manage_cohorts(): admin, or role holds 'launch-cohort' nav access. */
export async function canManageCohorts(user: User): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  return hasNavAccess(user.role, 'launch-cohort');
}

export async function requireCanManageCohorts(user: User): Promise<void> {
  if (!(await canManageCohorts(user))) throw new ForbiddenError('Cohort management access required');
}

/**
 * Ports can_manage_cohort_roster(cohort_id): admin, or (role holds
 * 'manage-cohort-users' nav access AND caller is a cohort_managers row for
 * this specific cohort). Note this is narrower than canManageCohorts — a
 * 'launch-cohort' holder who isn't also a designated manager of THIS
 * cohort does not automatically pass this check, same as the original RLS.
 */
export async function canManageCohortRoster(user: User, cohortId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const [isManager, navOk] = await Promise.all([
    cohortManagerRepository.isManager(cohortId, user.id),
    hasNavAccess(user.role, 'manage-cohort-users'),
  ]);
  return isManager && navOk;
}

export async function requireCanManageCohortRoster(user: User, cohortId: string): Promise<void> {
  if (!(await canManageCohortRoster(user, cohortId))) throw new ForbiddenError('Cohort roster management access required');
}

/**
 * Can this user reach the roster-management picker at all, and if so with
 * which scope? Mirrors listManageableCohorts()'s doc comment exactly: admin
 * or a 'launch-cohort' holder sees every cohort (their canManageCohorts()
 * already implies full read/write via the old "authorized roles manage
 * cohorts" policy); a delegated manager who only holds
 * 'manage-cohort-users' sees just the cohorts she's listed as a manager of.
 */
export async function rosterPickerScope(user: User): Promise<'all' | 'scoped'> {
  if (await canManageCohorts(user)) return 'all';
  if (await hasNavAccess(user.role, 'manage-cohort-users')) return 'scoped';
  throw new ForbiddenError('Cohort roster management access required');
}

/** Ports can_manage_blog(): admin, or role holds 'manage-blog-post' nav access. */
export async function canManageBlog(user: User): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  return hasNavAccess(user.role, 'manage-blog-post');
}

export async function requireCanManageBlog(user: User): Promise<void> {
  if (!(await canManageBlog(user))) throw new ForbiddenError('Blog management access required');
}

/** Ports can_manage_courses(): admin, or role holds 'manage-course-authoring' nav access. */
export async function canManageCourses(user: User): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  return hasNavAccess(user.role, 'manage-course-authoring');
}

export async function requireCanManageCourses(user: User): Promise<void> {
  if (!(await canManageCourses(user))) throw new ForbiddenError('Course management access required');
}
