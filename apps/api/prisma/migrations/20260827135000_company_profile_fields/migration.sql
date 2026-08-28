-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "adminEmail" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "countyDistrict" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryEmail" TEXT,
ADD COLUMN     "secondaryEmail" TEXT,
ADD COLUMN     "seats" INTEGER,
ADD COLUMN     "stateProvince" TEXT,
ADD COLUMN     "totalYearlyCost" INTEGER;

-- Backfill the human-readable business code for pre-existing rows from
-- their name (Acme Corp -> ACMECORP) before the NOT NULL + unique index
-- below. Hand-written step: prisma-generated SQL cannot backfill.
UPDATE "Company"
SET "companyId" = UPPER(REGEXP_REPLACE(SUBSTRING("name" FROM 1 FOR 12), '[^A-Za-z0-9]', '', 'g'))
WHERE "companyId" IS NULL;

-- SetRequired + unique index on the business code
ALTER TABLE "Company" ALTER COLUMN "companyId" SET NOT NULL;
CREATE UNIQUE INDEX "Company_companyId_key" ON "Company"("companyId");
