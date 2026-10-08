import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AdminActor } from "@/lib/admin";
import { MAX_CARDS_PER_BATCH } from "./card-batches";
import { cardIdFromGiftToken, computeUidHash, generateCardUid, normalizeUid } from "@/lib/crypto";

export { MAX_CARDS_PER_BATCH } from "./card-batches";
export const GIFT_FROM_MAX = 40;
export const GIFT_MESSAGE_MAX = 1200;

export async function resetCardActivation(id: string, actor: AdminActor): Promise<void> {
  if (actor.role !== "owner" && actor.role !== "manager") throw new Error("Không có quyền đặt lại thẻ.");
  await prisma.$transaction(async (tx) => {
    const previous = await tx.card.findUniqueOrThrow({ where: { id }, select: { activatedAt: true, currentN: true, lastOpenedDay: true, giftSeenAt: true } });
    await tx.card.update({ where: { id }, data: { activatedAt: null, currentN: 0, lastOpenedDay: null, giftSeenAt: null } });
    await tx.scanSession.deleteMany({ where: { cardId: id } });
    await tx.scanLog.deleteMany({ where: { cardId: id } });
    await tx.shareEvent.deleteMany({ where: { cardId: id } });
    await tx.listenEvent.deleteMany({ where: { cardId: id } });
    await tx.adminAuditLog.create({ data: {
      adminUserId: actor.id, action: "reset_activation", entityType: "card", entityId: id,
      metadataJson: JSON.stringify(previous), ipHash: actor.ipHash,
    } });
  });
}

export async function createCards(count: number, actor: AdminActor): Promise<string> {
  if (!Number.isInteger(count) || count < 1 || count > MAX_CARDS_PER_BATCH) {
    throw new Error(`Số thẻ phải là số nguyên từ 1 đến ${MAX_CARDS_PER_BATCH}.`);
  }
  const batchId = randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const uids = new Set<string>();
    while (uids.size < count) uids.add(generateCardUid());
    const members = [...uids];
    try {
      await prisma.$transaction([
        prisma.card.createMany({ data: members.map((uid) => ({ uid, uidHash: computeUidHash(uid) })) }),
        prisma.adminAuditLog.create({ data: {
          adminUserId: actor.id, action: "create_batch", entityType: "card", entityId: batchId,
          metadataJson: JSON.stringify({ count, uids: members }), ipHash: actor.ipHash,
        } }),
      ]);
      return batchId;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) throw error;
    }
  }
  throw new Error("Không thể tạo mã thẻ duy nhất. Vui lòng thử lại.");
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
