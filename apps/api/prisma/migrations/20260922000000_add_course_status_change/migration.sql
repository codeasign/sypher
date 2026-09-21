-- Audit trail for course draft/published transitions.
CREATE TABLE "CourseStatusChange" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CourseStatusChange_courseId_changedAt_idx" ON "CourseStatusChange"("courseId", "changedAt");

ALTER TABLE "CourseStatusChange" ADD CONSTRAINT "CourseStatusChange_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseStatusChange" ADD CONSTRAINT "CourseStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
