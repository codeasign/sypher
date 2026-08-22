-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CourseModule" ADD COLUMN     "authoringMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "isCertification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moduleType" TEXT NOT NULL DEFAULT 'content';

-- CreateTable
CREATE TABLE "AuthoredCourseAccess" (
    "courseId" TEXT NOT NULL,
    "allowedRoles" "Role"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthoredCourseAccess_pkey" PRIMARY KEY ("courseId")
);

-- CreateTable
CREATE TABLE "AuthoredCompanyCourseAccess" (
    "companyId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthoredCompanyCourseAccess_pkey" PRIMARY KEY ("companyId","courseId")
);

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredCourseAccess" ADD CONSTRAINT "AuthoredCourseAccess_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredCompanyCourseAccess" ADD CONSTRAINT "AuthoredCompanyCourseAccess_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
