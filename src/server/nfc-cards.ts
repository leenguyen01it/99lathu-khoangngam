import { prisma } from "@/lib/prisma";
import { nfcUrl } from "@/lib/crypto";
import { auditAdmin, type AdminActor } from "@/lib/admin";
import { listCardBatches } from "./card-batches";

export class NfcCardError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function resolveNfcCard(rawUrl: string, expectedBatchId?: string) {
  let parsed: URL;
  try { parsed = new URL(rawUrl.trim()); } catch { throw new NfcCardError("QR không chứa URL thẻ hợp lệ."); }
  const hash = parsed.pathname.match(/\/uid\/([a-f0-9]{32})$/)?.[1];
  if (!hash || rawUrl.trim() !== nfcUrl(hash)) throw new NfcCardError("QR không thuộc địa chỉ thẻ của hệ thống hiện tại.");
  const card = await prisma.card.findUnique({ where: { uidHash: hash }, select: { id: true, uid: true, uidHash: true, activatedAt: true } });
  if (!card) throw new NfcCardError("Không tìm thấy thẻ ứng với QR này.", 404);
  const batches = await listCardBatches();
  const batch = batches.find((item) => item.uids.includes(card.uid));
  if (expectedBatchId && batch?.id !== expectedBatchId) throw new NfcCardError("Thẻ này không thuộc đợt đang chọn. Hãy kiểm tra thẻ hoặc chọn đúng đợt.", 409);
  const verified = await prisma.adminAuditLog.findFirst({ where: { action: "nfc_verified", entityType: "card", entityId: card.id }, select: { createdAt: true } });
  return {
    id: card.id, url: nfcUrl(card.uidHash),
    number: batch ? `KN${String(batch.uids.indexOf(card.uid) + 1).padStart(3, "0")}` : null,
    batchId: batch?.id ?? null, batchCreatedAt: batch?.createdAt.toISOString() ?? null,
    batchCount: batch?.count ?? null, activated: Boolean(card.activatedAt),
    verifiedAt: verified?.createdAt.toISOString() ?? null,
  };
}

export async function nfcProgress() {
  const logs = await prisma.adminAuditLog.findMany({
    where: { action: "nfc_verified", entityType: "card" },
    select: { entityId: true, metadataJson: true },
  });
  const groups = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.entityId) continue;
    try {
      const metadata: unknown = JSON.parse(log.metadataJson ?? "null");
      if (!metadata || typeof metadata !== "object" || !("batchId" in metadata)) continue;
      const batchId = typeof metadata.batchId === "string" ? metadata.batchId : "legacy";
      const ids = groups.get(batchId) ?? new Set<string>();
      ids.add(log.entityId);
      groups.set(batchId, ids);
    } catch { /* Ignore malformed historical logs. */ }
  }
  return Object.fromEntries([...groups].map(([id, ids]) => [id, ids.size]));
}

export async function recordNfcVerification(actor: AdminActor, input: { cardId: string; url: string; serialNumber: string; batchId?: string }) {
  const card = await resolveNfcCard(input.url, input.batchId);
  if (card.id !== input.cardId) throw new NfcCardError("Thẻ và URL xác nhận không khớp.", 409);
  const serialNumber = input.serialNumber.trim().toLowerCase();
  if (serialNumber.length > 100 || (serialNumber && !/^[a-f0-9:-]+$/.test(serialNumber))) throw new NfcCardError("Số nhận diện chip không hợp lệ.");
  if (serialNumber) {
    const logs = await prisma.adminAuditLog.findMany({ where: { action: "nfc_verified", entityType: "card", entityId: { not: card.id } }, select: { metadataJson: true } });
    const used = logs.some((log) => {
      try { return JSON.parse(log.metadataJson ?? "null")?.serialNumber === serialNumber; } catch { return false; }
    });
    if (used) throw new NfcCardError("Chip này đã được xác nhận cho một thẻ khác. Hãy kiểm tra lại thẻ.", 409);
  }
  await auditAdmin(actor, "nfc_verified", "card", card.id, { batchId: card.batchId, number: card.number, url: card.url, serialNumber });
  return { card: { ...card, verifiedAt: new Date().toISOString() }, progress: await nfcProgress() };
}
