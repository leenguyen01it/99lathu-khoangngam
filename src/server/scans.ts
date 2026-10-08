import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/day";
import { TOTAL_LETTERS } from "@/lib/letters";

export const SCAN_TTL_MS = 10 * 60 * 1000; // 10 phút

export async function isCardActivated(uidHash: string): Promise<boolean | null> {
  const card = await prisma.card.findUnique({
    where: { uidHash },
    select: { activatedAt: true },
  });
  return card ? card.activatedAt !== null : null;
}

/**
 * Gọi khi người dùng chạm thẻ đã kích hoạt, hoặc xác nhận kích hoạt lần đầu.
 * - Tìm thẻ theo hash
 * - Lần chạm đầu tiên của một ngày mới thì mở lá thư kế tiếp
 * - Tạo phiên xem 10 phút và ghi nhật ký
 * Trả về mã phiên ngẫu nhiên để chuyển hướng sang /v/[token], hoặc null nếu hash không khớp thẻ nào.
 */
export async function createScanSession(params: {
  uidHash: string;
  ip?: string | null;
  userAgent?: string | null;
  confirmActivation?: boolean;
}): Promise<string | null> {
  const card = await prisma.card.findUnique({
    where: { uidHash: params.uidHash },
    select: { id: true, activatedAt: true },
  });
  if (!card) return null;
  if (!card.activatedAt && !params.confirmActivation) return null;

  const today = dayKey();
  const sessionId = nanoid(21);

  await prisma.$transaction([
    // Chỉ thao tác POST xác nhận mới được đánh dấu kích hoạt.
    ...(params.confirmActivation ? [prisma.card.updateMany({
      where: { id: card.id, activatedAt: null },
      data: { activatedAt: new Date() },
    })] : []),
    // Điều kiện nằm trong câu update nên hai lần chạm cùng lúc không mở hai lá.
    prisma.card.updateMany({
      where: {
        id: card.id,
        activatedAt: { not: null },
        currentN: { lt: TOTAL_LETTERS },
        OR: [{ lastOpenedDay: null }, { lastOpenedDay: { not: today } }],
      },
      data: { currentN: { increment: 1 }, lastOpenedDay: today },
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

  return sessionId;
}

/** Kiểm tra token trên URL /v/[token]. Trả null nếu sai hoặc đã hết hạn. */
export async function resolveScanToken(
  token: string,
): Promise<{ cardId: string; expiresAt: Date } | null> {
  if (!/^[A-Za-z0-9_-]{21}$/.test(token)) return null;

  const session = await prisma.scanSession.findUnique({ where: { token } });
  if (!session || session.expiresAt <= new Date()) return null;

  return { cardId: session.cardId, expiresAt: session.expiresAt };
}
