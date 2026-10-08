import { prisma } from "@/lib/prisma";

export const MAX_CARDS_PER_BATCH = 500;

export function batchUids(metadataJson: string | null): string[] | null {
  try {
    const metadata: unknown = JSON.parse(metadataJson || "null");
    if (!metadata || typeof metadata !== "object" || !("uids" in metadata)) return null;
    const uids = metadata.uids;
    if (!Array.isArray(uids) || !uids.length || uids.length > MAX_CARDS_PER_BATCH) return null;
    if (!uids.every((uid): uid is string => typeof uid === "string" && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/.test(uid))) return null;
    return new Set(uids).size === uids.length ? uids : null;
  } catch {
    return null;
  }
}

/** Creation logs persist the exact members of each batch without a schema change. */
export async function listCardBatches() {
  const logs = await prisma.adminAuditLog.findMany({
    where: { action: "create_batch", entityType: "card", entityId: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { entityId: true, createdAt: true, metadataJson: true },
  });
  return logs.flatMap((log) => {
    const uids = batchUids(log.metadataJson);
    return log.entityId && uids ? [{ id: log.entityId, createdAt: log.createdAt, count: uids.length, uids }] : [];
  });
}

export async function findCardBatch(id: string) {
  const log = await prisma.adminAuditLog.findFirst({
    where: { action: "create_batch", entityType: "card", entityId: id },
    select: { metadataJson: true, createdAt: true },
  });
  const uids = log ? batchUids(log.metadataJson) : null;
  return log && uids ? { uids, createdAt: log.createdAt } : null;
}
