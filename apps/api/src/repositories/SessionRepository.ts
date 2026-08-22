import { prisma } from '../lib/prisma';
import type { Session, User } from '@prisma/client';

export interface CreateSessionInput {
  userId: string;
  token: string;
  expiresAt: Date;
  userAgent: string | null;
}

export class SessionRepository {
  async create(input: CreateSessionInput): Promise<Session> {
    return prisma.session.create({ data: input });
  }

  async findByTokenWithUser(token: string): Promise<(Session & { user: User }) | null> {
    return prisma.session.findUnique({ where: { token }, include: { user: true } });
  }

  async touch(sessionId: string): Promise<void> {
    await prisma.session.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
  }

  async deleteByToken(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { token } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }
}
