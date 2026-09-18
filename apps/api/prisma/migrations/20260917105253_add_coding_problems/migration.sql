-- CreateTable
CREATE TABLE "CodingProblem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL,
    "memoryLimitKb" INTEGER NOT NULL,
    "defaultLanguage" TEXT NOT NULL,
    "starterCode" JSONB NOT NULL,
    "harness" JSONB NOT NULL,
    "testCases" JSONB NOT NULL,
    "solutionsMd" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingProblemBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingProblemBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judge0SubmissionCache" (
    "cacheKey" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Judge0SubmissionCache_pkey" PRIMARY KEY ("cacheKey")
);

-- CreateTable
CREATE TABLE "Judge0MonthlySubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Judge0MonthlySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodingProblem_slug_key" ON "CodingProblem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CodingProblemBookmark_userId_problemId_key" ON "CodingProblemBookmark"("userId", "problemId");

-- AddForeignKey
ALTER TABLE "CodingProblemBookmark" ADD CONSTRAINT "CodingProblemBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingProblemBookmark" ADD CONSTRAINT "CodingProblemBookmark_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CodingProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judge0MonthlySubmission" ADD CONSTRAINT "Judge0MonthlySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
