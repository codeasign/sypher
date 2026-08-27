// Dev-only convenience seed — there's no admin-promotion or invite UI yet
// (Invite is schema-only, scaffolded but not wired up), so this is the only
// way to get an ADMIN or COMPANY_HR/COMPANY_EMPLOYEE account to test
// role-gated and company-scoped endpoints against locally.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { buildUsernameBase } from '../src/repositories/UserRepository';

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, fullName: string, role: 'ADMIN' | 'COMPANY_HR' | 'COMPANY_EMPLOYEE', companyId?: string) {
  const passwordHash = await hashPassword(password);
  // username lives in create-data only: re-seeding must never clobber a
  // handle (user-editable now). Fresh databases get the same deterministic
  // base the runtime generator and the migration backfill produce
  // (buildUsernameBase's rules), keeping dev fixtures consistent.
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName,
      role,
      provider: 'EMAIL',
      companyId,
      username: buildUsernameBase(email),
    },
  });
}

async function main() {
  const company = await prisma.company.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: { name: 'Acme Corp' },
  });

  const admin = await upsertUser('admin@sypher.local', 'devpassword123', 'Dev Admin', 'ADMIN');
  const hr = await upsertUser('hr@acme.example', 'devpassword123', 'Acme HR', 'COMPANY_HR', company.id);
  const employee = await upsertUser('employee@acme.example', 'devpassword123', 'Acme Employee', 'COMPANY_EMPLOYEE', company.id);

  // Every real nav item needs a NavAccess row to exist at all — canSeeNavItem's
  // ADMIN bypass only fires for rows that are actually there to iterate over
  // (see AccessController.myNav), so an admin with no seeded rows would see
  // an empty sidebar despite the bypass. allowedRoles content only matters
  // for non-admin visibility; existence alone is what ADMIN needs.
  await prisma.navAccess.upsert({
    where: { itemKey: 'manage-access' },
    update: { allowedRoles: ['COMPANY_HR'] },
    create: { itemKey: 'manage-access', allowedRoles: ['COMPANY_HR'] },
  });
  await prisma.navAccess.upsert({
    where: { itemKey: 'launch-cohort' },
    update: {},
    create: { itemKey: 'launch-cohort', allowedRoles: [] },
  });
  // Exercises the delegated (non-admin) cohort-roster-manager path:
  // hr@acme.example is reused here as a cohort manager (role is otherwise
  // irrelevant to cohort_managers membership) so both the admin path and
  // the "nav access + cohort_managers row" path get real test coverage.
  await prisma.navAccess.upsert({
    where: { itemKey: 'manage-cohort-users' },
    update: { allowedRoles: ['COMPANY_HR'] },
    create: { itemKey: 'manage-cohort-users', allowedRoles: ['COMPANY_HR'] },
  });
  await prisma.navAccess.upsert({
    where: { itemKey: 'manage-blog-post' },
    update: {},
    create: { itemKey: 'manage-blog-post', allowedRoles: [] },
  });
  await prisma.navAccess.upsert({
    where: { itemKey: 'manage-course-authoring' },
    update: {},
    create: { itemKey: 'manage-course-authoring', allowedRoles: [] },
  });
  const cohort = await prisma.cohort.upsert({
    where: { slug: 'ai-engineering-fall-2026' },
    update: {},
    create: {
      slug: 'ai-engineering-fall-2026',
      title: 'AI Engineering — Fall 2026',
      description: 'A 10-week cohort covering the AI engineering fundamentals track.',
      status: 'live',
      startDate: new Date('2026-10-01'),
      durationWeeks: 10,
      seatsTotal: 30,
      priceLabel: '$1,200',
      createdById: admin.id,
    },
  });
  await prisma.cohortManager.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: hr.id } },
    update: {},
    create: { cohortId: cohort.id, userId: hr.id },
  });

  console.log('Seeded:', { company: company.name, admin: admin.email, hr: hr.email, employee: employee.email, cohort: cohort.slug });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
