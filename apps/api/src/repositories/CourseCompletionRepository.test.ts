import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma';
import { CourseCompletionRepository } from './CourseCompletionRepository';

// ModuleCompletionTracker's mount effect fires twice under React Strict Mode
// in dev, so the *final* module's POST /complete arrives as two concurrent
// requests. Both see completed == total and both reach the CourseCompletion
// upsert; Prisma's upsert is read-then-write, so the loser hits the unique
// (userId, courseId) constraint (P2002). That surfaced as a 500 on the last
// module of a course — this proves the repository absorbs it.
describe('CourseCompletionRepository concurrent completion', () => {
  const repo = new CourseCompletionRepository();
  const tag = `cc-race-${randomUUID()}`;
  let userId: string;
  let courseId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `${tag}@test.invalid`, username: tag.slice(0, 20).replace(/-/g, '_') } });
    userId = user.id;
    const course = await prisma.course.create({ data: { slug: tag, name: tag } });
    courseId = course.id;
    const mod = await prisma.courseModule.create({ data: { courseId, slug: 'only', title: 'Only', bodyMdx: '', orderIndex: 1000 } });
    await prisma.moduleProgress.create({ data: { userId, moduleId: mod.id, courseId } });
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('does not throw when many callers complete the same course at once', async () => {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => repo.markCompleteIfAllModulesDone(userId, courseId)));
    const failures = results.filter((r) => r.status === 'rejected');
    expect(failures).toHaveLength(0);
    expect(await repo.hasCompletedCourse(userId, courseId)).toBe(true);
    expect(await prisma.courseCompletion.count({ where: { userId, courseId } })).toBe(1);
  });
});
