import { prisma } from "@/lib/prisma";
import { getLetterById } from "@/lib/letters";
import { resolveScanToken } from "./scans";

// Ghi và đếm số lần lá thư được lưu thành ảnh.

/** Ghi một lượt lưu ảnh. Bỏ qua nếu id lá thư không tồn tại. */
export async function recordShareEvent(letterId: string, token?: string): Promise<void> {
  if (!getLetterById(letterId)) return;
  const scan = token ? await resolveScanToken(token) : null;
  await prisma.shareEvent.create({ data: { letterId, cardId: scan?.cardId ?? null } });
}

export interface ShareCount {
  letterId: string;
  count: number;
  title: string;
  excerpt: string;
}

/** Những lá thư được lưu ảnh nhiều nhất. */
export async function topSharedLetters(limit = 10): Promise<ShareCount[]> {
  const rows = await prisma.shareEvent.groupBy({
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

/** Tổng số lần lưu ảnh, hoặc số lần của riêng một thẻ nếu truyền cardId. */
export async function countShares(cardId?: string): Promise<number> {
  return prisma.shareEvent.count({ where: cardId ? { cardId } : undefined });
}
