-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastHeistAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "battle_logs" (
    "id" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "amountStolen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "battle_logs_attackerId_idx" ON "battle_logs"("attackerId");

-- CreateIndex
CREATE INDEX "battle_logs_defenderId_idx" ON "battle_logs"("defenderId");

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
