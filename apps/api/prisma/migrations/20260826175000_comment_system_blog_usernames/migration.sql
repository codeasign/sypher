-- CreateEnum
CREATE TYPE "CommentVoteType" AS ENUM ('UP', 'DOWN');

-- AlterTable — username added nullable FIRST, backfilled for existing
-- users, then set NOT NULL; the unique index is created after the backfill
-- (further down) so pre-existing rows can't violate it.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill usernames for every pre-existing user. Deterministic mirror of
-- the runtime generator in apps/api/src/repositories/UserRepository.ts
-- (buildUsernameBase): email local-part, lowercased, stripped to [a-z0-9_],
-- clamped to 20 chars, padded with a 'user' prefix when shorter than 3,
-- empty local-part becomes 'user'; collisions get numeric suffixes
-- (2, 3, ...) ordered by (createdAt, id), truncated to stay <= 20 chars.
WITH raw AS (
  SELECT id, "createdAt",
    regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '', 'g') AS clean
  FROM "User"
),
based AS (
  SELECT id, "createdAt",
    CASE
      WHEN LENGTH(clean) = 0 THEN 'user'
      WHEN LENGTH(clean) < 3 THEN left('user' || clean, 20)
      ELSE left(clean, 20)
    END AS base
  FROM raw
),
numbered AS (
  SELECT id, base,
    ROW_NUMBER() OVER (PARTITION BY base ORDER BY "createdAt", id) AS rn
  FROM based
)
UPDATE "User" u
SET username = CASE WHEN n.rn = 1 THEN n.base
                    ELSE left(n.base, 20 - LENGTH(n.rn::text)) || n.rn::text END
FROM numbered n
WHERE u.id = n.id;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "courseModuleId" TEXT,
    "blogPostId" TEXT,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isBestAnswer" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommentVoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentHelpful" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentHelpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentMention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_courseModuleId_parentId_idx" ON "Comment"("courseModuleId", "parentId");

-- CreateIndex
CREATE INDEX "Comment_blogPostId_parentId_idx" ON "Comment"("blogPostId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "CommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentHelpful_commentId_userId_key" ON "CommentHelpful"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentMention_commentId_mentionedUserId_key" ON "CommentMention"("commentId", "mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_courseModuleId_fkey" FOREIGN KEY ("courseModuleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EXACTLY-ONE-TARGET CHECK — hand-written SQL OUTSIDE Prisma's schema
-- management (Prisma does not model CHECK constraints). See the matching
-- comment on Comment.courseModuleId/blogPostId in prisma/schema.prisma.
-- A future migrate reset / squash / regenerated migration that re-creates
-- the "Comment" table MUST restore this constraint before applying.
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_exactly_one_target"
  CHECK (((("courseModuleId" IS NOT NULL)::int + ("blogPostId" IS NOT NULL)::int)) = 1);

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentHelpful" ADD CONSTRAINT "CommentHelpful_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentHelpful" ADD CONSTRAINT "CommentHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

