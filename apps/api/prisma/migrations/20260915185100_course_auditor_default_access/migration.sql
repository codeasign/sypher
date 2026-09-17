-- Grant the new COURSE_AUDITOR role default access to the course-audit
-- queue (course-audit nav item) — split into its own migration because a
-- newly added enum value cannot be referenced in the same transaction
-- that adds it (Postgres ADD VALUE restriction), same pattern as the
-- REVIEWER migration.
INSERT INTO "NavAccess" ("itemKey", "allowedRoles", "updatedAt")
VALUES ('course-audit', ARRAY['COURSE_AUDITOR']::"Role"[], now())
ON CONFLICT ("itemKey") DO UPDATE
SET "allowedRoles" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest("NavAccess"."allowedRoles" || ARRAY['COURSE_AUDITOR']::"Role"[])
  )
),
"updatedAt" = now();
