-- Mobile User: a read-only "paid" role for the mobile app. Sees all content
-- and courses (see hasCourseAccess in src/lib/accessControl.ts), holds no
-- management or editing nav access. Its own migration because Postgres
-- cannot use a newly added enum value inside the transaction that adds it;
-- the nav grant is in the next migration.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MOBILE_USER';
