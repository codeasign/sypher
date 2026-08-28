/**
 * Dev fixture for the corporate portal (corporate.sypher.local).
 *
 *   npx tsx scripts/seed-corporate-test.ts      (from apps/api)
 *
 * Idempotent — safe to re-run; it rebuilds groups / memberships / grants
 * from scratch each time and upserts the company + accounts. Documented in
 * repo-root Corporate-Test-Accounts.md.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const COMPANY_NAME = 'Sypher Test Corp';
const COMPANY_CODE = 'TESTCO';
const PASSWORD = 'password';

// Two published courses to hand out. Adjust if these slugs ever change.
const CEILING_COURSE_SLUGS = ['python-for-test-automation', 'playwright-test-automation'];
// One nav item to demo sidebar access (all current nav items are authoring
// tools — this is just to prove the mechanism end to end).
const CEILING_NAV_KEYS = ['manage-cohort-users'];

async function upsertUser(
  email: string,
  username: string,
  fullName: string,
  role: 'COMPANY_HR' | 'COMPANY_EMPLOYEE',
  companyId: string,
) {
  const passwordHash = await hashPassword(PASSWORD);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, fullName, role, companyId },
    create: { email, passwordHash, fullName, role, companyId, provider: 'EMAIL', username },
  });
}

async function main() {
  const accessUntil = new Date(Date.now() + 730 * 864e5); // ~2 years out

  const company = await prisma.company.upsert({
    where: { companyId: COMPANY_CODE },
    update: { name: COMPANY_NAME, accessUntil, adminEmail: 'admin@testco.local' },
    create: {
      companyId: COMPANY_CODE,
      name: COMPANY_NAME,
      accessUntil,
      adminEmail: 'admin@testco.local',
      primaryEmail: 'contact@testco.local',
      city: 'Pune',
      country: 'IN',
      seats: 25,
    },
  });
  const cid = company.id;

  const hr = await upsertUser('admin@testco.local', 'testco_admin', 'Test Corp Admin', 'COMPANY_HR', cid);
  const dev1 = await upsertUser('dev1@testco.local', 'testco_dev1', 'Dev One', 'COMPANY_EMPLOYEE', cid);
  const dev2 = await upsertUser('dev2@testco.local', 'testco_dev2', 'Dev Two', 'COMPANY_EMPLOYEE', cid);
  const sales1 = await upsertUser('sales1@testco.local', 'testco_sales1', 'Sales One', 'COMPANY_EMPLOYEE', cid);

  // Roster profiles
  for (const [u, jobTitle, managerName] of [
    [dev1, 'Automation Engineer', 'Test Corp Admin'],
    [dev2, 'Senior Automation Engineer', 'Test Corp Admin'],
    [sales1, 'Account Executive', 'Test Corp Admin'],
  ] as const) {
    await prisma.companyEmployee.upsert({
      where: { companyId_userId: { companyId: cid, userId: u.id } },
      update: { jobTitle, managerName, status: 'active' },
      create: { companyId: cid, userId: u.id, jobTitle, managerName },
    });
  }

  // Rebuild groups + membership from scratch
  await prisma.companyGroupCourseAccess.deleteMany({ where: { companyId: cid } });
  await prisma.companyGroupNavAccess.deleteMany({ where: { companyId: cid } });
  await prisma.companyGroupMember.deleteMany({ where: { companyId: cid } });
  await prisma.companyGroup.deleteMany({ where: { companyId: cid } });

  const engineering = await prisma.companyGroup.create({ data: { companyId: cid, name: 'Engineering' } });
  const sales = await prisma.companyGroup.create({ data: { companyId: cid, name: 'Sales' } });

  await prisma.companyGroupMember.createMany({
    data: [
      { companyId: cid, groupId: engineering.id, userId: dev1.id, addedById: hr.id },
      { companyId: cid, groupId: engineering.id, userId: dev2.id, addedById: hr.id },
      { companyId: cid, groupId: sales.id, userId: sales1.id, addedById: hr.id },
    ],
  });

  // Company-wide ceiling (what Sypher staff grant)
  const courses = await prisma.course.findMany({ where: { slug: { in: CEILING_COURSE_SLUGS } }, select: { id: true, slug: true } });
  await prisma.authoredCompanyCourseAccess.deleteMany({ where: { companyId: cid } });
  for (const c of courses) {
    await prisma.authoredCompanyCourseAccess.create({ data: { companyId: cid, courseId: c.id } });
  }
  await prisma.companyNavAccess.deleteMany({ where: { companyId: cid } });
  for (const key of CEILING_NAV_KEYS) {
    await prisma.companyNavAccess.create({ data: { companyId: cid, itemKey: key } });
  }

  // Group grants (subset of the ceiling) — Engineering gets everything,
  // Sales gets only the first course.
  for (const c of courses) {
    await prisma.companyGroupCourseAccess.create({ data: { companyId: cid, groupId: engineering.id, courseId: c.id } });
  }
  if (courses[0]) {
    await prisma.companyGroupCourseAccess.create({ data: { companyId: cid, groupId: sales.id, courseId: courses[0].id } });
  }
  for (const key of CEILING_NAV_KEYS) {
    await prisma.companyGroupNavAccess.create({ data: { companyId: cid, groupId: engineering.id, itemKey: key } });
  }

  console.log('Corporate test fixture ready:');
  console.log(`  Company     : ${COMPANY_NAME}  (code ${COMPANY_CODE}, active until ${accessUntil.toISOString().slice(0, 10)})`);
  console.log(`  Company admin: admin@testco.local / ${PASSWORD}   (COMPANY_HR)`);
  console.log(`  Employees   : dev1@ / dev2@ (Engineering), sales1@ (Sales)  — all @testco.local / ${PASSWORD}`);
  console.log(`  Ceiling     : ${courses.map((c) => c.slug).join(', ') || '(none — course slugs not found)'} + nav ${CEILING_NAV_KEYS.join(', ')}`);
  console.log(`  Group grants: Engineering → all; Sales → ${courses[0]?.slug ?? '(none)'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
