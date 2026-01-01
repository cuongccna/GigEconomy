-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastCheckIn" TIMESTAMP(3),
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;
