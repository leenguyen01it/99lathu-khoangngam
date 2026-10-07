import { Shell } from "./Shell";

/** Hiện khi phiên xem hết hạn, hoặc khi đường dẫn không hợp lệ. */
export function Locked({ unknownCard = false }: { unknownCard?: boolean }) {
  return (
    <Shell center>
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/60 text-gold">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h1 className="mt-5 text-[22px] font-semibold">
        {unknownCard ? "Không tìm thấy thẻ này" : "Chạm thẻ để mở thư"}
      </h1>
      <p className="mt-2 max-w-[290px] text-[15px] leading-relaxed text-sage">
        {unknownCard
          ? "Đường dẫn không khớp với thẻ nào. Hãy chạm lại đúng tấm thẻ của bạn."
          : "Lá thư chỉ mở trong 10 phút sau mỗi lần chạm hoặc quét thẻ"}
      </p>
    </Shell>
  );
}
