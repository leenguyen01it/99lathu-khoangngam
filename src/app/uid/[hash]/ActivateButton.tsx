"use client";

import { useFormStatus } from "react-dom";

export function ActivateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn min-h-12 px-7"
      disabled={pending}
      aria-busy={pending}
    >
      <span role="status" aria-live="polite">
        {pending ? "Đang kích hoạt…" : "Xác nhận kích hoạt"}
      </span>
    </button>
  );
}
