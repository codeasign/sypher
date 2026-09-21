-- Browse Videos is the only non-management NavAccess item; every other
-- gated key (manage-*, launch-cohort, course-audit) is deliberately NOT
-- granted to MOBILE_USER.
UPDATE "NavAccess"
SET "allowedRoles" = ARRAY(
  SELECT DISTINCT unnest("allowedRoles" || ARRAY['MOBILE_USER']::"Role"[])
),
"updatedAt" = now()
WHERE "itemKey" = 'browse-videos';
