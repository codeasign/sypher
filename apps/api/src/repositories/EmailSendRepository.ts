import { prisma } from '../lib/prisma';

export class EmailSendRepository {
  async countSince(provider: string, since: Date): Promise<number> {
    return prisma.emailSend.count({ where: { provider, sentAt: { gte: since } } });
  }

  async record(provider: string, toEmail: string, subject: string): Promise<void> {
    await prisma.emailSend.create({ data: { provider, toEmail, subject } });
  }
}
