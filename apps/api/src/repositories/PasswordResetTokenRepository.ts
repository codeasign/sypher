import { prisma } from '../lib/prisma';
import type { PasswordResetToken } from '@prisma/client';

export class PasswordResetTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findValidByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
