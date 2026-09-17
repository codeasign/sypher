import { prisma } from '../lib/prisma';
import type { ModuleEditRequest } from '@prisma/client';

export interface ModuleEditRequestWithContext extends ModuleEditRequest {
  module: { title: string; slug: string; courseId: string };
  course: { name: string; slug: string };
  requestedBy: { fullName: string | null; email: string };
}

export class ModuleEditRequestRepository {
  async create(input: { moduleId: string; courseId: string; proposedBodyMdx: string; requestedById: string }): Promise<ModuleEditRequest> {
    return prisma.moduleEditRequest.create({ data: input });
  }

  async findById(id: string): Promise<ModuleEditRequestWithContext | null> {
    const row = await prisma.moduleEditRequest.findUnique({
      where: { id },
      include: {
        module: { select: { title: true, slug: true, courseId: true } },
        requestedBy: { select: { fullName: true, email: true } },
      },
    });
    if (!row) return null;
    const course = await prisma.course.findUnique({ where: { id: row.courseId }, select: { name: true, slug: true } });
    return { ...row, course: course ?? { name: 'Unknown course', slug: '' } };
  }

  // Small admin-facing queue, fetched once and rendered whole (same
  // "fetch once" reasoning as /courses/manage/list's client-side
  // pagination, user's 2026-08-27 call) — but bounded now, same defensive
  // ceiling Course/Blog/Video/Cohort's manage lists already carry.
  // Pending requests carry each row's full proposedBodyMdx, so an
  // unbounded queue was a real payload-size risk despite the "small in
  // practice" assumption, not just a theoretical one.
  async listByStatus(status: string, limit: number, offset: number): Promise<ModuleEditRequestWithContext[]> {
    const rows = await prisma.moduleEditRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
      include: {
        module: { select: { title: true, slug: true, courseId: true } },
        requestedBy: { select: { fullName: true, email: true } },
      },
    });
    const courseIds = [...new Set(rows.map((r) => r.courseId))];
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, name: true, slug: true } });
    const courseById = new Map(courses.map((c) => [c.id, c]));
    return rows.map((row) => ({ ...row, course: courseById.get(row.courseId) ?? { name: 'Unknown course', slug: '' } }));
  }

  async setStatus(id: string, status: 'approved' | 'rejected', reviewedById: string): Promise<ModuleEditRequest> {
    return prisma.moduleEditRequest.update({
      where: { id },
      data: { status, reviewedById, reviewedAt: new Date() },
    });
  }
}
