-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COURSE_AUDITOR';

-- CreateTable
CREATE TABLE "ModuleEditRequest" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "proposedBodyMdx" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleEditRequest_status_idx" ON "ModuleEditRequest"("status");

-- CreateIndex
CREATE INDEX "ModuleEditRequest_moduleId_idx" ON "ModuleEditRequest"("moduleId");

-- AddForeignKey
ALTER TABLE "ModuleEditRequest" ADD CONSTRAINT "ModuleEditRequest_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEditRequest" ADD CONSTRAINT "ModuleEditRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleEditRequest" ADD CONSTRAINT "ModuleEditRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
