import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { cardIdFromGiftToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { GIFT_FROM_MAX, GIFT_MESSAGE_MAX } from "@/server/cards";
import { GiftForm } from "../GiftForm";

export const metadata: Metadata = { title: "Viết lời nhắn cho người nhận", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GiftLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cardId = cardIdFromGiftToken(token);
  if (!cardId) notFound();
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { activatedAt: true } });
  if (!card) notFound();

  return (
    <Shell>
      <h1 className="text-[24px] font-bold leading-tight">Viết lời nhắn cho người nhận</h1>
      <p className="mb-6 mt-2 text-[15px] leading-relaxed text-sage">
        Lời nhắn sẽ hiện đầu tiên khi người nhận chạm thẻ lần đầu.
      </p>
      {card.activatedAt ? (
        <p className="rounded-2xl border border-sage/25 px-5 py-6 text-center text-sage">
          Thẻ đã được mở nên không thể thay đổi lời nhắn nữa.
        </p>
      ) : (
        <GiftForm fromMax={GIFT_FROM_MAX} messageMax={GIFT_MESSAGE_MAX} token={token} />
      )}
    </Shell>
  );
}
