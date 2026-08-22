import { prisma } from '../lib/prisma';
import type { AuthProvider, Role, User } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  fullName: string | null;
  provider: AuthProvider;
  role?: Role;
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        provider: input.provider,
        role: input.role,
      },
    });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
