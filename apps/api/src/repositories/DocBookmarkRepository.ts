import { prisma } from '../lib/prisma';

export interface DocBookmarkEntry {
  docPath: string;
  courseSlug: string;
  title: string | null;
}

export interface CreateDocBookmarkInput {
  docPath: string;
  courseSlug: string;
  title?: string | null;
}

export class DocBookmarkRepository {
  async listForUser(userId: string): Promise<DocBookmarkEntry[]> {
    return prisma.docBookmark.findMany({
      where: { userId },
      select: { docPath: true, courseSlug: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, input: CreateDocBookmarkInput): Promise<void> {
    await prisma.docBookmark.upsert({
      where: { userId_docPath: { userId, docPath: input.docPath } },
      update: {},
      create: { userId, docPath: input.docPath, courseSlug: input.courseSlug, title: input.title ?? null },
    });
  }

  async remove(userId: string, docPath: string): Promise<void> {
    await prisma.docBookmark.deleteMany({ where: { userId, docPath } });
  }
}
