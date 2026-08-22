-- CreateTable
CREATE TABLE "EmailSend" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "toEmail" TEXT,
    "subject" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSend_provider_sentAt_idx" ON "EmailSend"("provider", "sentAt");
