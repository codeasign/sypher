-- AlterTable
ALTER TABLE "Company" ADD COLUMN "accessUntil" TIMESTAMP(3);

-- Backfill pre-existing rows with one year of access from today so the
-- NOT NULL below can apply. Hand-written step (migrate dev needs a TTY).
UPDATE "Company"
SET "accessUntil" = NOW() + INTERVAL '1 year'
WHERE "accessUntil" IS NULL;

-- SetRequired
ALTER TABLE "Company" ALTER COLUMN "accessUntil" SET NOT NULL;
