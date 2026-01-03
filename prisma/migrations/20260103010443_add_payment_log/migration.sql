-- CreateTable
CREATE TABLE "payment_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramPaymentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "starsAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_logs_telegramPaymentId_key" ON "payment_logs"("telegramPaymentId");

-- CreateIndex
CREATE INDEX "payment_logs_userId_idx" ON "payment_logs"("userId");

-- CreateIndex
CREATE INDEX "payment_logs_packageId_idx" ON "payment_logs"("packageId");

-- AddForeignKey
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
