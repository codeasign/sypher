export interface NavItemDef {
  key: string;
  label: string;
  href: string;
}

/**
 * Canonical registry mapping NavAccess item_key -> {label, href}. The
 * gating decision (which keys a given user can see) comes from real data
 * via GET /access/my-nav (canSeeNavItem in apps/api/src/lib/accessControl.ts,
 * evaluated against NavAccess/CompanyNavAccess rows) — this registry only
 * supplies the display/link half once a key is already known to be
 * visible. Adding a new gated page = add a row here + a NavAccess row for
 * its key (see apps/api/prisma/seed.ts for the dev seed), not new
 * per-role branching logic.
 */
export const NAV_ITEMS: NavItemDef[] = [
  { key: 'manage-access', label: 'Manage Access', href: '/admin/access' },
  { key: 'launch-cohort', label: 'Launch Cohort', href: '/launch-cohort' },
  { key: 'manage-cohort-users', label: 'Manage Cohort Users', href: '/manage-cohort-users' },
  { key: 'manage-blog-post', label: 'Manage Blog', href: '/manage-blog' },
  { key: 'manage-course-authoring', label: 'Manage Courses', href: '/manage-courses' },
];
