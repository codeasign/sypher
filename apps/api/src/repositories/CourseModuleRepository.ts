import { prisma } from '../lib/prisma';
import type { CourseModule } from '@prisma/client';
import { slugify, findAvailableSlug } from '../lib/slug';

export interface CreateCourseModuleInput {
  title: string;
  bodyMdx?: string;
  showInGettingStarted?: boolean;
}

export interface ImportCourseModuleInput {
  slug: string;
  title: string;
  bodyMdx: string;
  orderIndex: number;
  sectionLabel: string | null;
  sectionOrder: number | null;
}

export interface UpdateCourseModuleInput {
  title?: string;
  bodyMdx?: string;
  showInGettingStarted?: boolean;
}

export interface GettingStartedModuleEntry {
  id: string;
  slug: string;
  title: string;
  gettingStartedOrder: number | null;
  course: { slug: string; name: string };
}

export interface ModuleWithCourseEntry {
  id: string;
  slug: string;
  title: string;
  courseId: string;
  course: { slug: string; name: string };
}

// Sparse step-1000 convention ported from apps/app's data/courses.js
// nextSparseIndex — lands new rows after whatever already exists in the
// given scope without a renumbering pass.
async function nextSparseOrderIndex(courseId: string): Promise<number> {
  const top = await prisma.courseModule.findFirst({
    where: { courseId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });
  return (top?.orderIndex ?? 0) + 1000;
}

async function nextSparseGettingStartedOrder(): Promise<number> {
  const top = await prisma.courseModule.findFirst({
    where: { showInGettingStarted: true },
    orderBy: { gettingStartedOrder: 'desc' },
    select: { gettingStartedOrder: true },
  });
  return (top?.gettingStartedOrder ?? 0) + 1000;
}

export class CourseModuleRepository {
  async listForCourse(courseId: string): Promise<CourseModule[]> {
    return prisma.courseModule.findMany({ where: { courseId }, orderBy: { orderIndex: 'asc' } });
  }

  async findById(id: string): Promise<CourseModule | null> {
    return prisma.courseModule.findUnique({ where: { id } });
  }

  async findBySlug(courseId: string, slug: string): Promise<CourseModule | null> {
    return prisma.courseModule.findUnique({ where: { courseId_slug: { courseId, slug } } });
  }

  async courseHasGettingStartedModule(courseId: string): Promise<boolean> {
    const row = await prisma.courseModule.findFirst({ where: { courseId, showInGettingStarted: true }, select: { id: true } });
    return row !== null;
  }

  // For the free-preview visibility check — computeFreePreviewCount(n) is
  // always >= 1 for any n >= 1, so any course with at least one module has
  // *something* free to show. A plain count is cheaper than fetching the
  // whole ordered list just to check emptiness.
  async countForCourse(courseId: string): Promise<number> {
    return prisma.courseModule.count({ where: { courseId } });
  }

  // For /bookmarks — same "not filtered by status" reasoning as
  // CourseRepository.findByIds.
  async findByIdsWithCourse(ids: string[]): Promise<ModuleWithCourseEntry[]> {
    if (ids.length === 0) return [];
    return prisma.courseModule.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, title: true, courseId: true, course: { select: { slug: true, name: true } } },
    });
  }

  async listGettingStarted(): Promise<GettingStartedModuleEntry[]> {
    const rows = await prisma.courseModule.findMany({
      where: { showInGettingStarted: true, moduleType: 'content', course: { status: 'published' } },
      orderBy: { gettingStartedOrder: 'asc' },
      select: { id: true, slug: true, title: true, gettingStartedOrder: true, course: { select: { slug: true, name: true } } },
    });
    return rows;
  }

  async create(courseId: string, input: CreateCourseModuleInput): Promise<CourseModule> {
    const slug = await findAvailableSlug(slugify(input.title), async (s) => {
      const existing = await prisma.courseModule.findUnique({ where: { courseId_slug: { courseId, slug: s } } });
      return existing !== null;
    });
    const orderIndex = await nextSparseOrderIndex(courseId);
    const show = input.showInGettingStarted ?? false;
    const gettingStartedOrder = show ? await nextSparseGettingStartedOrder() : null;
    return prisma.courseModule.create({
      data: {
        courseId,
        slug,
        title: input.title,
        bodyMdx: input.bodyMdx ?? '',
        orderIndex,
        moduleType: 'content',
        authoringMode: 'manual',
        showInGettingStarted: show,
        gettingStartedOrder,
      },
    });
  }

  async update(id: string, fields: UpdateCourseModuleInput): Promise<void> {
    const data: { title?: string; bodyMdx?: string; showInGettingStarted?: boolean; gettingStartedOrder?: number | null } = {
      title: fields.title,
      bodyMdx: fields.bodyMdx,
    };
    if (fields.showInGettingStarted !== undefined) {
      const current = await prisma.courseModule.findUnique({ where: { id }, select: { showInGettingStarted: true } });
      if (fields.showInGettingStarted !== current?.showInGettingStarted) {
        data.showInGettingStarted = fields.showInGettingStarted;
        data.gettingStartedOrder = fields.showInGettingStarted ? await nextSparseGettingStartedOrder() : null;
      }
    }
    await prisma.courseModule.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.courseModule.delete({ where: { id } });
  }

  // Docusaurus importer only — explicit slug/orderIndex/section fields
  // instead of the manual-authoring create()'s slugify+sparse-index
  // convention, since import order must mirror the source sidebar exactly.
  // Idempotent (upsert by courseId+slug) so a re-run after fixing source
  // content doesn't create duplicates.
  async upsertImported(courseId: string, input: ImportCourseModuleInput): Promise<CourseModule> {
    return prisma.courseModule.upsert({
      where: { courseId_slug: { courseId, slug: input.slug } },
      create: {
        courseId,
        slug: input.slug,
        title: input.title,
        bodyMdx: input.bodyMdx,
        orderIndex: input.orderIndex,
        sectionLabel: input.sectionLabel,
        sectionOrder: input.sectionOrder,
        moduleType: 'content',
        authoringMode: 'generated',
      },
      update: {
        title: input.title,
        bodyMdx: input.bodyMdx,
        orderIndex: input.orderIndex,
        sectionLabel: input.sectionLabel,
        sectionOrder: input.sectionOrder,
      },
    });
  }

  // Simple up/down reorder (no drag-drop dep): swaps order_index with the
  // adjacent module in the same course. No-op at either end of the list.
  async reorder(courseId: string, moduleId: string, direction: 'up' | 'down'): Promise<void> {
    const modules = await this.listForCourse(courseId);
    const index = modules.findIndex((m) => m.id === moduleId);
    if (index === -1) return;
    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= modules.length) return;

    const current = modules[index];
    const neighbor = modules[neighborIndex];
    await prisma.$transaction([
      prisma.courseModule.update({ where: { id: current.id }, data: { orderIndex: neighbor.orderIndex } }),
      prisma.courseModule.update({ where: { id: neighbor.id }, data: { orderIndex: current.orderIndex } }),
    ]);
  }
}
