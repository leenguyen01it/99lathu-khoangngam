ALTER TABLE "Card" ADD COLUMN "penName" TEXT, ADD COLUMN "penNameChanges" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TrialReader" ADD COLUMN "penName" TEXT, ADD COLUMN "penNameChanges" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "LetterHeart" (
  "id" TEXT NOT NULL,
  "cardId" TEXT,
  "readerId" TEXT,
  "letterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetterHeart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LetterHeart_cardId_letterId_key" ON "LetterHeart"("cardId", "letterId");
CREATE UNIQUE INDEX "LetterHeart_readerId_letterId_key" ON "LetterHeart"("readerId", "letterId");
CREATE INDEX "LetterHeart_letterId_idx" ON "LetterHeart"("letterId");
ALTER TABLE "LetterHeart" ADD CONSTRAINT "LetterHeart_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetterHeart" ADD CONSTRAINT "LetterHeart_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "TrialReader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LetterComment" (
  "id" TEXT NOT NULL,
  "cardId" TEXT,
  "readerId" TEXT,
  "letterId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetterComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LetterComment_letterId_createdAt_idx" ON "LetterComment"("letterId", "createdAt");
CREATE INDEX "LetterComment_cardId_createdAt_idx" ON "LetterComment"("cardId", "createdAt");
CREATE INDEX "LetterComment_readerId_createdAt_idx" ON "LetterComment"("readerId", "createdAt");
ALTER TABLE "LetterComment" ADD CONSTRAINT "LetterComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetterComment" ADD CONSTRAINT "LetterComment_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "TrialReader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
