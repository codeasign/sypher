-- CreateTable
CREATE TABLE "MockExam" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examCode" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "liveQuestionCount" INTEGER NOT NULL,
    "easyCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "hardCount" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "sourceId" TEXT,
    "domain" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'mcq',
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" JSONB NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExamAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "questionIds" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER,

    CONSTRAINT "MockExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExamAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswer" JSONB,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "MockExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MockExam_slug_key" ON "MockExam"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MockExam_examCode_key" ON "MockExam"("examCode");

-- CreateIndex
CREATE INDEX "MockExamQuestion_examId_difficulty_idx" ON "MockExamQuestion"("examId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "MockExamQuestion_examId_sourceId_key" ON "MockExamQuestion"("examId", "sourceId");

-- CreateIndex
CREATE INDEX "MockExamAttempt_userId_examId_idx" ON "MockExamAttempt"("userId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "MockExamAnswer_attemptId_questionId_key" ON "MockExamAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamQuestion" ADD CONSTRAINT "MockExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "MockExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAttempt" ADD CONSTRAINT "MockExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAttempt" ADD CONSTRAINT "MockExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "MockExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAnswer" ADD CONSTRAINT "MockExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "MockExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamAnswer" ADD CONSTRAINT "MockExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "MockExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
