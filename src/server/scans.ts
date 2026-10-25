import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/day";
import { TOTAL_LETTERS, getLetterById } from "@/lib/letters";

export const SCAN_TTL_MS = 15 * 60 * 1000; // 15 phút

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
 * - Tạo phiên xem 15 phút và ghi nhật ký
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
    select: { id: true, activatedAt: true, currentN: true, dailyLimit: true },
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
        currentN: card.currentN,
        OR: [{ lastOpenedDay: null }, { lastOpenedDay: { not: today } }],
      },
      data: {
        currentN: { increment: Math.min(card.dailyLimit, TOTAL_LETTERS - card.currentN) },
        lastOpenedDay: today,
        openedToday: Math.min(card.dailyLimit, TOTAL_LETTERS - card.currentN),
      },
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

/**
 * Dùng cho thao tác trên một lá thư (thả tim, viết ghi chú): phiên phải còn hạn
 * và lá đó phải thuộc bộ chính, đã mở trên thẻ. Trả id thẻ, hoặc null.
 */
export async function resolveOpenedLetter(token: string, letterId: string): Promise<string | null> {
  const scan = await resolveScanToken(token);
  if (!scan) return null;
  const found = getLetterById(letterId);
  if (!found || found.trial) return null;
  const card = await prisma.card.findUnique({ where: { id: scan.cardId }, select: { currentN: true } });
  return card && found.letter.n <= card.currentN ? scan.cardId : null;
}

/** Người cầm thẻ chọn nhịp đọc cho riêng thẻ này. */
export async function setCardDailyLimit(token: string, limit: number): Promise<boolean> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) return false;
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: scan.cardId },
      select: { activatedAt: true, currentN: true, lastOpenedDay: true, openedToday: true },
    });
    if (!card?.activatedAt) return false;

    const today = dayKey();
    const extra = card.lastOpenedDay === today
      ? Math.max(0, Math.min(limit - card.openedToday, TOTAL_LETTERS - card.currentN))
      : 0;
    const updated = await tx.card.updateMany({
      where: {
        id: scan.cardId,
        currentN: card.currentN,
        lastOpenedDay: card.lastOpenedDay,
        openedToday: card.openedToday,
      },
      data: {
        dailyLimit: limit,
        ...(extra > 0 ? {
          currentN: { increment: extra },
          openedToday: { increment: extra },
        } : {}),
      },
    });
    return updated.count === 1;
  });
}

/** Tốc độ nghe được lưu theo thẻ, dùng trên mọi điện thoại chạm thẻ. */
export async function setCardVoiceSpeed(token: string, speed: number): Promise<boolean> {
  if (![1, 1.2, 1.3, 1.4].includes(speed)) return false;
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  const updated = await prisma.card.updateMany({
    where: { id: scan.cardId, activatedAt: { not: null } },
    data: { voiceSpeed: speed },
  });
  return updated.count === 1;
}

export type ReadingStyle = "ink" | "box" | "off";
export type CardExperienceSettings = {
  autoPlayAudio: boolean;
  readingStyle: ReadingStyle;
  pageSound: boolean;
  resumeReading: boolean;
};

/** Các lựa chọn trải nghiệm đọc được lưu theo thẻ để đi cùng người đọc trên mọi thiết bị. */
export async function setCardExperienceSettings(
  token: string,
  settings: CardExperienceSettings,
): Promise<boolean> {
  if (
    typeof settings.autoPlayAudio !== "boolean"
    || !["ink", "box", "off"].includes(settings.readingStyle)
    || typeof settings.pageSound !== "boolean"
    || typeof settings.resumeReading !== "boolean"
  ) return false;
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  const updated = await prisma.card.updateMany({
    where: { id: scan.cardId, activatedAt: { not: null } },
    data: settings,
  });
  return updated.count === 1;
}

/** Ghi lại lá gần nhất để lần quét sau có thể tiếp tục đúng chỗ. */
export async function rememberCardLetter(token: string, n: number): Promise<boolean> {
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_LETTERS) return false;
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  const updated = await prisma.card.updateMany({
    where: { id: scan.cardId, activatedAt: { not: null }, currentN: { gte: n } },
    data: { lastViewedN: n },
  });
  return updated.count === 1;
}

export type OpenNextResult = { ok: true } | { ok: false; reason: "expired" | "limit" | "stale" };

/** Mở đúng một lá nữa khi hôm nay vẫn còn lượt. Điều kiện cập nhật ngăn hai lần bấm cùng mở vượt hạn mức. */
export async function openNextLetter(token: string): Promise<OpenNextResult> {
  const scan = await resolveScanToken(token);
  if (!scan) return { ok: false, reason: "expired" };
  const today = dayKey();
  const card = await prisma.card.findUnique({
    where: { id: scan.cardId },
    select: { currentN: true, lastOpenedDay: true, openedToday: true, dailyLimit: true },
  });
  if (!card || card.lastOpenedDay !== today || card.currentN >= TOTAL_LETTERS || card.openedToday >= card.dailyLimit) {
    return { ok: false, reason: "limit" };
  }
  const updated = await prisma.card.updateMany({
    where: {
      id: scan.cardId,
      activatedAt: { not: null },
      currentN: card.currentN,
      lastOpenedDay: today,
      openedToday: card.openedToday,
      dailyLimit: card.dailyLimit,
    },
    data: { currentN: { increment: 1 }, openedToday: { increment: 1 } },
  });
  return updated.count === 1 ? { ok: true } : { ok: false, reason: "stale" };
}
