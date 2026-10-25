-- Migration gộp có thể đã được áp dụng trước khi trường này được bổ sung.
-- IF NOT EXISTS giữ migration an toàn trên cả database mới và database đã live.
ALTER TABLE "Card"
ADD COLUMN IF NOT EXISTS "reminderPromptedAt" TIMESTAMP(3);
