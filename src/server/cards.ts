import { prisma } from "@/lib/prisma";
import { cardIdFromGiftToken, computeUidHash, generateCardUid, normalizeUid } from "@/lib/crypto";

export const MAX_CARDS_PER_BATCH = 500;
export const GIFT_FROM_MAX = 40;
export const GIFT_MESSAGE_MAX = 1200;

export async function createCards(count: number): Promise<number> {
  const total = Math.min(Math.max(1, Math.floor(count)), MAX_CARDS_PER_BATCH);
  let created = 0;
  while (created < total) {
    const uid = generateCardUid();
    try {
      await prisma.card.create({ data: { uid, uidHash: computeUidHash(uid) } });
      created += 1;
    } catch {
      // UID trùng (gần như không xảy ra): sinh lại
    }
  }
  return created;
}

export type GiftResult = { ok: true } | { ok: false; error: string };

/**
 * Người tặng nhập mã in trên thẻ rồi viết lá thư riêng.
 * Chỉ nhận khi thẻ chưa được chạm lần nào, để người nhận không bị đổi nội dung sau đó.
 */
export async function saveGiftLetter(input: {
  uid: string;
  from: string;
  message: string;
}): Promise<GiftResult> {
  const uid = normalizeUid(input.uid);
  const from = input.from.trim();
  const message = input.message.trim();

  if (uid.length !== 12) return { ok: false, error: "Mã thẻ gồm 12 ký tự in trên thẻ." };
  if (!message) return { ok: false, error: "Bạn chưa viết lời nhắn." };
  if (from.length > GIFT_FROM_MAX) return { ok: false, error: `Tên tối đa ${GIFT_FROM_MAX} ký tự.` };
  if (message.length > GIFT_MESSAGE_MAX) {
    return { ok: false, error: `Lời nhắn tối đa ${GIFT_MESSAGE_MAX} ký tự.` };
  }

  const updated = await prisma.card.updateMany({
    where: { uidHash: computeUidHash(uid), activatedAt: null },
    data: { giftFrom: from || null, giftMessage: message },
  });
  if (updated.count === 0) {
    return { ok: false, error: "Không tìm thấy thẻ, hoặc thẻ đã được mở nên không viết thêm được." };
  }
  return { ok: true };
}

export async function saveGiftLetterByToken(input: {
  token: string;
  from: string;
  message: string;
}): Promise<GiftResult> {
  const cardId = cardIdFromGiftToken(input.token);
  const from = input.from.trim();
  const message = input.message.trim();

  if (!cardId) return { ok: false, error: "Link viết lời tặng không hợp lệ." };
  if (!message) return { ok: false, error: "Bạn chưa viết lời nhắn." };
  if (from.length > GIFT_FROM_MAX) return { ok: false, error: `Tên tối đa ${GIFT_FROM_MAX} ký tự.` };
  if (message.length > GIFT_MESSAGE_MAX) {
    return { ok: false, error: `Lời nhắn tối đa ${GIFT_MESSAGE_MAX} ký tự.` };
  }

  const updated = await prisma.card.updateMany({
    where: { id: cardId, activatedAt: null },
    data: { giftFrom: from || null, giftMessage: message },
  });
  if (updated.count === 0) {
    return { ok: false, error: "Thẻ không tồn tại hoặc đã được mở nên không thể viết thêm." };
  }
  return { ok: true };
}
