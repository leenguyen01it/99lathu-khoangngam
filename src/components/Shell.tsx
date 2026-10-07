import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Khung trang chung: nền xanh, quầng sáng, tên thương hiệu ở trên.
 * `action` là nút nhỏ đặt ở góc trên bên phải, cùng hàng với tên thương hiệu.
 */
export function Shell({
  children,
  center = false,
  action,
}: {
  children: React.ReactNode;
  center?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-deep/50 blur-3xl"
      />
      <main
        className={`relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-4 pt-4 ${
          center ? "items-center justify-center text-center" : ""
        }`}
      >
        <div className={`mb-4 flex items-center gap-2.5 ${action ? "w-full" : ""}`}>
          <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold" aria-label="Về trang chủ">
            <Logo size={30} />
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">
              {site.name}
            </span>
          </Link>
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
