import { site } from "@/lib/site";

export function TrialPurchase() {
  return <section className="mt-8 rounded-2xl border border-gold/25 bg-deep/15 px-5 py-6 text-center">
    <p className="font-serif text-[18px] text-paper">Mang 99 lá thư về với mình</p>
    <p className="mt-2 text-[13px] leading-6 text-sage">Một tấm thẻ, mỗi ngày một lá thư. Dành cho bạn hoặc một người bạn thương.</p>
    <a href={site.orderUrl} className="btn mt-4">Mua thẻ 99 ngày thương mình</a>
  </section>;
}
