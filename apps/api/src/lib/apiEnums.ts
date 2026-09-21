import type { $Enums } from '@prisma/client';

// Prisma exports each enum as `type X = $Enums.X`. tsoa resolves that alias
// chain into two OpenAPI schemas (`X` -> `_36_Enums.X`), so controllers must
// not reference Prisma's enum types directly. These literal unions are the
// canonical API-facing names; the Assert lines below fail the build if they
// drift from schema.prisma.

export type Role =
  | 'ADMIN'
  | 'FREE_USER'
  | 'PAID_USER'
  | 'MOBILE_USER'
  | 'INTERNAL_HR'
  | 'COMPANY_HR'
  | 'COMPANY_EMPLOYEE'
  | 'BRANDER'
  | 'COHORT_USER'
  | 'REVIEWER'
  | 'COURSE_AUDITOR';

export type CommentVoteType = 'UP' | 'DOWN';

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
type Assert<T extends true> = T;
export type _RoleInSync = Assert<Equals<Role, $Enums.Role>>;
export type _CommentVoteTypeInSync = Assert<Equals<CommentVoteType, $Enums.CommentVoteType>>;
