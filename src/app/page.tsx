import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { Shell } from "@/components/Shell";
import { SocialFooter } from "@/components/SocialFooter";
import { site } from "@/lib/site";
import { TOTAL_LETTERS, TRIAL_LETTERS } from "@/lib/letters";

export default function HomePage() {
  return (
    <Shell>
      <section className="flex flex-col items-center pt-2 text-center">
        <div className="home-book" aria-label={`Bìa sách ${site.product}`}>
          <div className="book">
            <div className="book__back" />
            <div className="book__pages" />
            <BookCover staticCover />
          </div>
        </div>

        <p className="mt-8 text-[13px] font-semibold tracking-[0.2em] text-gold">
          Một hành trình nhỏ dành cho bạn
        </p>
        <h1 className="mt-3 max-w-[350px] font-serif text-[22px] font-semibold leading-[1.25] text-paper">
          Mỗi ngày, mở một lá thư và ở lại với mình một chút
        </h1>
        <p className="mt-4 max-w-[350px] text-[15px] leading-7 text-sage">
          Trong cuốn sách này là {TOTAL_LETTERS} lá thư ngắn về những ngày cố gắng, lớn lên, yêu
          thương và học cách dịu dàng với chính mình. Không cần đọc vội. Mỗi ngày chỉ một lá là đủ.
        </p>

        <Link href="/doc-thu" className="btn mt-7 min-w-52">
          Đọc thử {TRIAL_LETTERS} lá thư
        </Link>
      </section>

      <section className="mb-8 mt-10 grid grid-cols-3 gap-2 border-y border-sage/15 py-5 text-center">
        <div>
          <p className="font-serif text-[24px] text-gold">{TOTAL_LETTERS}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-sage">Lá thư</p>
        </div>
        <div className="border-x border-sage/15">
          <p className="font-serif text-[24px] text-gold">1</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-sage">Mỗi ngày</p>
        </div>
        <div>
          <p className="font-serif text-[24px] text-gold">NFC</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-sage">Chạm để mở</p>
        </div>
      </section>

      <section className="mb-10 rounded-3xl border border-sage/20 bg-deep/15 px-6 py-7 text-center">
        <p className="font-serif text-[18px] leading-relaxed text-paper">
          “Có những ngày, một câu nói đúng lúc cũng đủ để mình đi tiếp.”
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-sage">
          Chạm thẻ bằng điện thoại để mở lá thư của hôm nay. Lá tiếp theo sẽ chờ bạn vào ngày mai.
        </p>
      </section>
      <SocialFooter />
    </Shell>
  );
}
