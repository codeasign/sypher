-- Manage Videos (ADMIN only — no default extra grant, matches
-- manage-course-authoring's own seed) and Browse Videos (FREE_USER +
-- PAID_USER by default, user request 2026-09-16).
INSERT INTO "NavAccess" ("itemKey", "allowedRoles", "updatedAt")
VALUES ('manage-videos', ARRAY[]::"Role"[], now())
ON CONFLICT ("itemKey") DO NOTHING;

INSERT INTO "NavAccess" ("itemKey", "allowedRoles", "updatedAt")
VALUES ('browse-videos', ARRAY['FREE_USER', 'PAID_USER']::"Role"[], now())
ON CONFLICT ("itemKey") DO UPDATE
SET "allowedRoles" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest("NavAccess"."allowedRoles" || ARRAY['FREE_USER', 'PAID_USER']::"Role"[])
  )
),
"updatedAt" = now();
