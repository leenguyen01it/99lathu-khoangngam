import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { GIFT_FROM_MAX, GIFT_MESSAGE_MAX } from "@/server/cards";
import { GiftForm } from "./GiftForm";

export const metadata: Metadata = { title: "Viết lời nhắn cho người nhận", robots: { index: false, follow: false } };

export default function GiftPage() {
  return (
    <Shell>
      <h1 className="text-[24px] font-bold leading-tight">Viết lời nhắn cho người nhận</h1>
      <p className="mb-6 mt-2 text-[15px] leading-relaxed text-sage">
        Lời nhắn này hiện ra đầu tiên khi người nhận chạm thẻ lần đầu. Hãy viết trước khi trao thẻ:
        sau khi thẻ đã được mở thì không viết thêm được nữa.
      </p>
      <GiftForm fromMax={GIFT_FROM_MAX} messageMax={GIFT_MESSAGE_MAX} />
    </Shell>
  );
}
