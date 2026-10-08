import type { Metadata } from "next";
import { Locked } from "@/components/Locked";
import { prisma } from "@/lib/prisma";
import { TOTAL_LETTERS, lettersUpTo } from "@/lib/letters";
import type { WordTiming } from "@/lib/sentences";
import { getWordTimings } from "@/server/audio";
import { resolveScanToken } from "@/server/scans";
import { ViewerClient } from "./ViewerClient";

export const metadata: Metadata = {
  title: "Lá thư hôm nay",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scan = await resolveScanToken(token);
  if (!scan) return <Locked />;

  const card = await prisma.card.findUnique({ where: { id: scan.cardId } });
  if (!card || card.currentN < 1) return <Locked />;

  const gift = card.giftMessage ? { from: card.giftFrom, message: card.giftMessage } : null;
  const showGiftFirst = Boolean(gift) && !card.giftSeenAt;

  const letters = lettersUpTo(card.currentN);
  const audio: Record<number, WordTiming[]> = {};
  for (const letter of letters) {
    const timings = getWordTimings(letter);
    if (timings) audio[letter.n] = timings;
  }

  return (
    <ViewerClient
      token={token}
      expiresAt={scan.expiresAt.toISOString()}
      letters={letters}
      audio={audio}
      total={TOTAL_LETTERS}
      gift={gift}
      showGiftFirst={showGiftFirst}
    />
  );
}
