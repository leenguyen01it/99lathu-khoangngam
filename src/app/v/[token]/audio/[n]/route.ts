import { getLetter } from "@/lib/letters";
import { prisma } from "@/lib/prisma";
import { serveAudio } from "@/server/audio";
import { resolveScanToken } from "@/server/scans";

export const dynamic = "force-dynamic";

// Giọng đọc của một lá thư. Cùng điều kiện với việc xem lá thư đó:
// phiên chạm thẻ còn hạn, và lá thư đã được thẻ này mở.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; n: string }> },
) {
  const { token, n } = await params;
  const scan = await resolveScanToken(token);
  if (!scan) return new Response("Phiên đã hết hạn", { status: 403 });

  const number = Number(n);
  const card = await prisma.card.findUnique({ where: { id: scan.cardId }, select: { currentN: true } });
  if (!card || !Number.isInteger(number) || number < 1 || number > card.currentN) {
    return new Response("Lá thư này chưa được mở", { status: 403 });
  }

  const letter = getLetter(number);
  if (!letter) return new Response("Không có lá thư này", { status: 404 });
  return serveAudio(request, letter.id);
}
