import { prisma } from '../lib/prisma';
import type { ContactSubmission } from '@prisma/client';

export interface CreateContactSubmissionInput {
  name: string;
  email: string;
  message: string;
}

export class ContactSubmissionRepository {
  async create(input: CreateContactSubmissionInput): Promise<ContactSubmission> {
    return prisma.contactSubmission.create({ data: input });
  }
}
