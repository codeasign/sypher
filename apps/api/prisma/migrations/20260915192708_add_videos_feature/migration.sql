-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "videoId" TEXT;

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "transcript" TEXT,
    "resources" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend Comment_exactly_one_target for the new videoId target (hand-written,
-- Prisma doesn't track CHECK constraints — see the schema.prisma comment on
-- Comment.videoId).
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_exactly_one_target";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_exactly_one_target" CHECK (
  ((("courseModuleId" IS NOT NULL)::int + ("blogPostId" IS NOT NULL)::int + ("courseId" IS NOT NULL)::int + ("videoId" IS NOT NULL)::int)) = 1
);
