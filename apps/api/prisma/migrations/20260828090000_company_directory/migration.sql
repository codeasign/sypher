-- Company self-service directory (corporate.sypher.local portal).
-- FK-free by design (see schema.prisma) so a company's slice can move to a
-- per-company database later; companyId on every row for clean extraction.

-- CreateTable
CREATE TABLE "CompanyGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "managerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyGroupMember" (
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "CompanyGroupCourseAccess" (
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyGroupCourseAccess_pkey" PRIMARY KEY ("groupId","courseId")
);

-- CreateTable
CREATE TABLE "CompanyGroupNavAccess" (
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyGroupNavAccess_pkey" PRIMARY KEY ("groupId","itemKey")
);

-- CreateIndex
CREATE INDEX "CompanyGroup_companyId_idx" ON "CompanyGroup"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyGroup_companyId_name_key" ON "CompanyGroup"("companyId", "name");

-- CreateIndex
CREATE INDEX "CompanyEmployee_companyId_idx" ON "CompanyEmployee"("companyId");

-- CreateIndex
CREATE INDEX "CompanyEmployee_userId_idx" ON "CompanyEmployee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployee_companyId_userId_key" ON "CompanyEmployee"("companyId", "userId");

-- CreateIndex
CREATE INDEX "CompanyGroupMember_companyId_idx" ON "CompanyGroupMember"("companyId");

-- CreateIndex
CREATE INDEX "CompanyGroupMember_userId_idx" ON "CompanyGroupMember"("userId");

-- CreateIndex
CREATE INDEX "CompanyGroupCourseAccess_companyId_idx" ON "CompanyGroupCourseAccess"("companyId");

-- CreateIndex
CREATE INDEX "CompanyGroupNavAccess_companyId_idx" ON "CompanyGroupNavAccess"("companyId");
