CREATE TABLE "TrialReader" (
  "id" TEXT NOT NULL,
  "startedOn" TEXT NOT NULL,
  "lastDay" TEXT NOT NULL,
  "visitDays" INTEGER NOT NULL DEFAULT 1,
  "maxOpened" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrialReader_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrialReader_startedOn_idx" ON "TrialReader"("startedOn");
