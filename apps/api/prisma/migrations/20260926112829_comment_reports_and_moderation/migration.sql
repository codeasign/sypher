-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isRemovedByModerator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReportResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentModerationLog" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "commentAuthorId" TEXT NOT NULL,
    "commentBody" TEXT NOT NULL,
    "removedById" TEXT,
    "removedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommentReport_commentId_userId_key" ON "CommentReport"("commentId", "userId");

-- CreateIndex
CREATE INDEX "CommentModerationLog_commentId_idx" ON "CommentModerationLog"("commentId");

-- CreateIndex
CREATE INDEX "Comment_reportCount_isReportResolved_idx" ON "Comment"("reportCount", "isReportResolved");

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentModerationLog" ADD CONSTRAINT "CommentModerationLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentModerationLog" ADD CONSTRAINT "CommentModerationLog_commentAuthorId_fkey" FOREIGN KEY ("commentAuthorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentModerationLog" ADD CONSTRAINT "CommentModerationLog_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reported Comments admin page nav entry — ADMIN-only, same pattern as
-- manage-videos/manage-course-authoring (empty allowedRoles; canSeeNavItem
-- special-cases role === 'ADMIN' as always-true, see accessControl.ts).
INSERT INTO "NavAccess" ("itemKey", "allowedRoles", "updatedAt")
VALUES ('reported-comments', ARRAY[]::"Role"[], now())
ON CONFLICT ("itemKey") DO NOTHING;
