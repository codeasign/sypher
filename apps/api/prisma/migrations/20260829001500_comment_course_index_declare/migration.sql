-- Schema/migration drift fix: 20260826222105 already CREATEd this index,
-- but schema.prisma never declared the matching @@index. This makes the
-- Prisma schema and the DB agree; idempotent so it is safe on any DB.
CREATE INDEX IF NOT EXISTS "Comment_courseId_parentId_idx" ON "Comment"("courseId", "parentId");
