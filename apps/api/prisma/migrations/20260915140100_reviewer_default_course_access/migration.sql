-- Grant the new REVIEWER role default access to course authoring/editing
-- (manage-course-authoring nav item) — split into its own migration
-- because a newly added enum value cannot be referenced in the same
-- transaction that adds it (Postgres ADD VALUE restriction).
INSERT INTO "NavAccess" ("itemKey", "allowedRoles", "updatedAt")
VALUES ('manage-course-authoring', ARRAY['REVIEWER']::"Role"[], now())
ON CONFLICT ("itemKey") DO UPDATE
SET "allowedRoles" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest("NavAccess"."allowedRoles" || ARRAY['REVIEWER']::"Role"[])
  )
),
"updatedAt" = now();
