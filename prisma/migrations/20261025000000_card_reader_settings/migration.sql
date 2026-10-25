-- Các lựa chọn đọc thư được lưu theo từng thẻ.
ALTER TABLE "Card"
ADD COLUMN "dailyLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "openedToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "voiceSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
ADD COLUMN "autoPlayAudio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "readingStyle" TEXT NOT NULL DEFAULT 'box',
ADD COLUMN "pageSound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "resumeReading" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastViewedN" INTEGER,
ADD COLUMN "reminderTime" TEXT,
ADD COLUMN "reminderLastSentDay" TEXT;

-- Thẻ đã mở trước khi có bộ đếm được tính là đã mở một lá trong ngày đó.
UPDATE "Card" SET "openedToday" = 1 WHERE "lastOpenedDay" IS NOT NULL;

ALTER TABLE "Card"
ADD CONSTRAINT "Card_dailyLimit_check" CHECK ("dailyLimit" BETWEEN 1 AND 5),
ADD CONSTRAINT "Card_voiceSpeed_check" CHECK ("voiceSpeed" IN (1.0, 1.2, 1.3, 1.4)),
ADD CONSTRAINT "Card_readingStyle_check" CHECK ("readingStyle" IN ('ink', 'box', 'off')),
ADD CONSTRAINT "Card_lastViewedN_check" CHECK ("lastViewedN" IS NULL OR "lastViewedN" BETWEEN 1 AND 99),
ADD CONSTRAINT "Card_reminderTime_check"
  CHECK ("reminderTime" IS NULL OR "reminderTime" ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');

-- Mỗi trình duyệt đã cấp quyền có một đăng ký Web Push gắn với thẻ.
CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_cardId_idx" ON "PushSubscription"("cardId");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_cardId_fkey"
FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
