-- CreateTable
CREATE TABLE "CustomTestAccount" (
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomTestAccount_pkey" PRIMARY KEY ("email")
);
