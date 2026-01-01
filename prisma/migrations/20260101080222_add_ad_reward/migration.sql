-- CreateTable
CREATE TABLE "ad_rewards" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_rewards_recordId_key" ON "ad_rewards"("recordId");

-- CreateIndex
CREATE INDEX "ad_rewards_telegramId_idx" ON "ad_rewards"("telegramId");
