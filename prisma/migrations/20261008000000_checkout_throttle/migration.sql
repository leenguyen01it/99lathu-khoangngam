CREATE TABLE "CheckoutThrottle" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutThrottle_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "CheckoutThrottle_expiresAt_idx" ON "CheckoutThrottle"("expiresAt");
