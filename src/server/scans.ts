import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { signScanToken, verifyScanToken } from "@/lib/crypto";
import { dayKey } from "@/lib/day";
import { TOTAL_LETTERS } from "@/lib/letters";

export const SCAN_TTL_MS = 10 * 60 * 1000; // 10 phút

/**
 * Gọi khi người dùng chạm thẻ và mở /uid/[hash].
 * - Tìm thẻ theo hash
 * - Lần chạm đầu tiên của một ngày mới thì mở lá thư kế tiếp
 * - Tạo phiên xem 10 phút và ghi nhật ký
 * Trả về JWT để chuyển hướng sang /v/[token], hoặc null nếu hash không khớp thẻ nào.
 */
export async function createScanSession(params: {
  uidHash: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<string | null> {
  const card = await prisma.card.findUnique({
    where: { uidHash: params.uidHash },
    select: { id: true, activatedAt: true },
  });
  if (!card) return null;

  const today = dayKey();
  const sessionId = nanoid(24);

  await prisma.$transaction([
    // Điều kiện nằm trong câu update nên hai lần chạm cùng lúc không mở hai lá.
    prisma.card.updateMany({
      where: {
        id: card.id,
        currentN: { lt: TOTAL_LETTERS },
        OR: [{ lastOpenedDay: null }, { lastOpenedDay: { not: today } }],
      },
      data: { currentN: { increment: 1 }, lastOpenedDay: today },
    }),
    prisma.card.updateMany({
      where: { id: card.id, activatedAt: null },
      data: { activatedAt: new Date() },
    }),
    prisma.scanSession.create({
      data: { token: sessionId, cardId: card.id, expiresAt: new Date(Date.now() + SCAN_TTL_MS) },
    }),
    prisma.scanLog.create({
      data: {
        cardId: card.id,
        ip: params.ip ?? null,
        userAgent: params.userAgent?.slice(0, 500) ?? null,
      },
    }),
  ]);

  return signScanToken({ cardId: card.id, sessionId }, Math.floor(SCAN_TTL_MS / 1000));
}

/** Kiểm tra token trên URL /v/[token]. Trả null nếu sai hoặc đã hết hạn. */
export async function resolveScanToken(
  token: string,
): Promise<{ cardId: string; expiresAt: Date } | null> {
  const payload = await verifyScanToken(token);
  if (!payload) return null;

  const session = await prisma.scanSession.findUnique({ where: { token: payload.sessionId } });
  if (!session || session.cardId !== payload.cardId) return null;
  if (session.expiresAt < new Date()) return null;

  return { cardId: session.cardId, expiresAt: session.expiresAt };
}
