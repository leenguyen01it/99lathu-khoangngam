import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Locked } from "@/components/Locked";
import { Shell } from "@/components/Shell";
import { getClientIp } from "@/lib/request";
import { createScanSession, isCardActivated } from "@/server/scans";
import { activateCard } from "./actions";
import { ActivateButton } from "./ActivateButton";

export const metadata: Metadata = {
  title: "Mở thư",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NfcLandingPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{32}$/i.test(hash)) return <Locked unknownCard />;

  const uidHash = hash.toLowerCase();
  const activated = await isCardActivated(uidHash);
  if (activated === null) return <Locked unknownCard />;
  if (!activated) {
    return (
      <Shell center>
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/60 text-gold" aria-hidden>
          <span className="text-[30px]">✉</span>
        </div>
        <h1 className="mt-5 text-[22px] font-semibold">Kích hoạt thẻ của bạn</h1>
        <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed text-sage">
          Chỉ bấm khi bạn đã nhận thẻ và sẵn sàng đọc lá thư đầu tiên. Việc mở trang này để kiểm tra chưa kích hoạt thẻ.
        </p>
        <form action={activateCard.bind(null, uidHash)} className="mt-7">
          <ActivateButton />
        </form>
      </Shell>
    );
  }

  const h = await headers();
  const token = await createScanSession({
    uidHash,
    ip: getClientIp(h),
    userAgent: h.get("user-agent"),
  });
  if (!token) return <Locked unknownCard />;

  // Trình duyệt thay /uid/[hash] bằng /v/[token] trên thanh địa chỉ.
  redirect(`/v/${token}`);
}
