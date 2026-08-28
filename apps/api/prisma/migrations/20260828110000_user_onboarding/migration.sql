-- First-login onboarding: handle + avatar + legal acceptance.
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "legalAcceptedAt" TIMESTAMP(3);

-- Existing accounts predate onboarding — treat them as already onboarded so
-- the modal only ever hits genuinely new sign-ins.
UPDATE "User" SET "onboardedAt" = "createdAt", "legalAcceptedAt" = "createdAt" WHERE "deletedAt" IS NULL;
