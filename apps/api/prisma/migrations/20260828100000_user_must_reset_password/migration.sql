-- Provisioned accounts (admin-created, corporate onboarding) get this flag
-- so "first login = set your password" is a readable signal, not only an
-- implicit consequence of passwordHash being null.
ALTER TABLE "User" ADD COLUMN "mustResetPassword" BOOLEAN NOT NULL DEFAULT false;
