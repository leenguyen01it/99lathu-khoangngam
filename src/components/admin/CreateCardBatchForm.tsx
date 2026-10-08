"use client";

import { useActionState, useRef, useState } from "react";
import { createCardBatch } from "@/app/admin/actions";

export function CreateCardBatchForm({ max }: { max: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [count, setCount] = useState(10);
  const [state, action, pending] = useActionState(createCardBatch, {});

  return (
    <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        setCount(Number(new FormData(event.currentTarget).get("count")));
        dialog.current?.showModal();
      }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] text-sage">Số thẻ cần tạo (tối đa {max})</span>
          <input name="count" type="number" min={1} max={max} step={1} defaultValue={10} required disabled={pending} className="field w-44" />
        </label>
        <button className="btn" disabled={pending}>Tạo thẻ</button>
      </form>
      <dialog ref={dialog} aria-labelledby="create-card-title" onCancel={(event) => { if (pending) event.preventDefault(); }} className="w-[min(420px,calc(100vw-32px))] rounded-2xl border border-sage/25 bg-ink p-0 text-paper shadow-2xl backdrop:bg-black/70">
        <form action={action} className="p-6">
          <h2 id="create-card-title" className="text-[20px] font-semibold">Tạo {count} thẻ mới?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-sage">Đợt này gồm {count} thẻ với mã QR riêng. Sau khi tạo, bạn có thể tải file in chỉ cho đợt này.</p>
          <input type="hidden" name="count" value={count} />
          {state.error ? <p role="alert" className="mt-3 text-[14px] text-rose">{state.error}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" autoFocus disabled={pending} className="btn-ghost" onClick={() => dialog.current?.close()}>Hủy</button>
            <button disabled={pending} className="btn">{pending ? "Đang tạo…" : `Xác nhận tạo ${count} thẻ`}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
