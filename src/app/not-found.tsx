import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell center>
      <div className="relative flex h-28 w-36 items-center justify-center" aria-hidden>
        <div className="absolute bottom-1 h-20 w-32 rounded-lg border border-gold/45 bg-paper shadow-xl shadow-black/20" />
        <div className="absolute bottom-5 h-20 w-24 -rotate-3 rounded-md bg-[#fffaf0] shadow-md">
          <div className="mx-auto mt-6 h-0.5 w-10 rounded-full bg-deep/50" />
          <div className="mx-auto mt-3 h-px w-14 rounded-full bg-deep/20" />
          <div className="mx-auto mt-2 h-px w-12 rounded-full bg-deep/20" />
        </div>
      </div>

      <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Lỗi 404</p>
      <h1 className="mt-2 text-[25px] font-semibold leading-tight">Lá thư này không có ở đây</h1>
      <p className="mt-3 max-w-[310px] text-[15px] leading-relaxed text-sage">
        Có thể đường dẫn đã thay đổi hoặc bạn vừa đi lạc sang một trang chưa tồn tại.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn">
          Về trang chủ
        </Link>
        <Link href="/doc-thu" className="btn-ghost">
          Đọc một lá thư
        </Link>
      </div>
    </Shell>
  );
}
