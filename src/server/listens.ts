import { getLetterById } from "@/lib/letters";
import { prisma } from "@/lib/prisma";
import { resolveScanToken } from "./scans";
import type { ShareCount } from "./shares";

// Ghi và đếm số lần lá thư được bấm nghe giọng đọc.

/** Ghi một lượt nghe. Bỏ qua nếu id lá thư không tồn tại. */
export async function recordListenEvent(letterId: string, token?: string): Promise<void> {
  if (!getLetterById(letterId)) return;
  const scan = token ? await resolveScanToken(token) : null;
  await prisma.listenEvent.create({ data: { letterId, cardId: scan?.cardId ?? null } });
}

/** Những lá thư được nghe nhiều nhất. */
export async function topListenedLetters(limit = 10): Promise<ShareCount[]> {
  const rows = await prisma.listenEvent.groupBy({
    by: ["letterId"],
    _count: { letterId: true },
    orderBy: { _count: { letterId: "desc" } },
    take: limit,
  });
  return rows.map((row) => {
    const found = getLetterById(row.letterId);
    return {
      letterId: row.letterId,
      count: row._count.letterId,
      title: found
        ? found.trial
          ? `Lá đọc thử số ${found.letter.n}`
          : `Lá thư số ${found.letter.n}`
        : row.letterId,
      excerpt: found?.letter.text.slice(0, 70) ?? "",
    };
  });
}

/** Tổng số lượt nghe, hoặc số lượt của riêng một thẻ nếu truyền cardId. */
export async function countListens(cardId?: string): Promise<number> {
  return prisma.listenEvent.count({ where: cardId ? { cardId } : undefined });
}
