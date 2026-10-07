import { Logo } from "@/components/Logo";

// Hiện trong lúc máy chủ kiểm tra phiên và lấy thư, thay cho trang trắng.
export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-ink">
      <Logo size={72} className="animate-pulse" />
      <p className="mt-5 text-[13px] text-sage/70">Đang mở thư của bạn</p>
    </div>
  );
}
