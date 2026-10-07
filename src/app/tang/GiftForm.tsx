"use client";

import { useActionState } from "react";
import { submitGift, type GiftFormState } from "./actions";

const initial: GiftFormState = { ok: false };

export function GiftForm({ fromMax, messageMax, token }: { fromMax: number; messageMax: number; token?: string }) {
  const [state, action, pending] = useActionState(submitGift, initial);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-gold/50 px-5 py-6 text-center">
        <p className="text-[18px] font-semibold text-gold">Đã lưu lời nhắn</p>
        <p className="mt-2 text-[15px] leading-relaxed text-sage">
          Người nhận sẽ thấy lá thư của bạn ở lần chạm thẻ đầu tiên. Bạn có thể trao thẻ được rồi.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {token ? <input type="hidden" name="token" value={token} /> : <label className="flex flex-col gap-1.5">
        <span className="text-[14px] text-sage">Mã in trên thẻ (12 ký tự)</span>
        <input
          name="uid"
          required
          autoComplete="off"
          autoCapitalize="characters"
          className="field uppercase tracking-widest"
          placeholder="VD: 7KQ2M9XWHT4B"
        />
      </label>}
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] text-sage">Tên bạn muốn ký (có thể bỏ trống)</span>
        <input name="from" maxLength={fromMax} className="field" placeholder="VD: Minh" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] text-sage">Lời nhắn của bạn</span>
        <textarea
          name="message"
          required
          rows={7}
          maxLength={messageMax}
          className="field resize-none font-serif text-[16px] leading-relaxed"
          placeholder="Viết vài dòng cho người bạn muốn tặng..."
        />
      </label>
      {state.error ? <p className="text-[14px] text-rose">{state.error}</p> : null}
      <button className="btn" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu lời nhắn"}
      </button>
    </form>
  );
}
