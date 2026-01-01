-- AlterTable
ALTER TABLE "users" ADD COLUMN     "farmingRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "farmingStartedAt" TIMESTAMP(3);
