-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "docPath" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthoredCourseBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthoredCourseBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthoredModuleBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthoredModuleBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_courseSlug_key" ON "Bookmark"("userId", "courseSlug");

-- CreateIndex
CREATE UNIQUE INDEX "DocBookmark_userId_docPath_key" ON "DocBookmark"("userId", "docPath");

-- CreateIndex
CREATE UNIQUE INDEX "AuthoredCourseBookmark_userId_courseId_key" ON "AuthoredCourseBookmark"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthoredModuleBookmark_userId_moduleId_key" ON "AuthoredModuleBookmark"("userId", "moduleId");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocBookmark" ADD CONSTRAINT "DocBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredCourseBookmark" ADD CONSTRAINT "AuthoredCourseBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredCourseBookmark" ADD CONSTRAINT "AuthoredCourseBookmark_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredModuleBookmark" ADD CONSTRAINT "AuthoredModuleBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredModuleBookmark" ADD CONSTRAINT "AuthoredModuleBookmark_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoredModuleBookmark" ADD CONSTRAINT "AuthoredModuleBookmark_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
