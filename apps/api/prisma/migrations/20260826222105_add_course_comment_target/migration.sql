-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "courseId" TEXT;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (matches the courseModuleId/blogPostId index convention)
CREATE INDEX "Comment_courseId_parentId_idx" ON "Comment"("courseId", "parentId");

-- EXACTLY-ONE-TARGET CHECK — replace the two-way constraint from the
-- original comment-system migration with a three-way one that also allows
-- courseId. Hand-written SQL, same reasoning as the original: Prisma does
-- not model CHECK constraints, so this must be restored by hand if the
-- "Comment" table is ever re-created by a migrate reset / squash.
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_exactly_one_target";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_exactly_one_target"
  CHECK (((("courseModuleId" IS NOT NULL)::int + ("blogPostId" IS NOT NULL)::int + ("courseId" IS NOT NULL)::int)) = 1);
