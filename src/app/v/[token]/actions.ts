"use server";

import { prisma } from "@/lib/prisma";
import { resolveScanToken } from "@/server/scans";

export async function markGiftSeen(token: string): Promise<boolean> {
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  await prisma.card.updateMany({
    where: { id: scan.cardId, giftSeenAt: null, giftMessage: { not: null } },
    data: { giftSeenAt: new Date() },
  });
  return true;
}
