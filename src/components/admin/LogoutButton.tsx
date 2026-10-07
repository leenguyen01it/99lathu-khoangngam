"use client";

import { useRef } from "react";
import { logout } from "@/app/admin/actions";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={compact ? "text-[13px] text-sage hover:text-paper" : "w-full rounded-xl px-4 py-3 text-left text-[14px] text-sage transition hover:bg-rose/10 hover:text-rose"}
      >
        Đăng xuất
      </button>
      <dialog ref={dialog} className="w-[min(420px,calc(100vw-32px))] rounded-2xl border border-sage/25 bg-ink p-0 text-paper shadow-2xl backdrop:bg-black/70">
        <div className="p-6">
          <h2 className="text-[20px] font-semibold">Đăng xuất khỏi trang quản trị?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-sage">Phiên quản trị trên thiết bị này sẽ kết thúc. Bạn cần nhập lại mật khẩu để truy cập.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => dialog.current?.close()}>Ở lại</button>
            <form action={logout}><button className="btn bg-rose text-ink">Đăng xuất</button></form>
          </div>
        </div>
      </dialog>
    </>
  );
}

