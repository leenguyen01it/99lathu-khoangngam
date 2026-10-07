"use client";

import { useState } from "react";
import { recordShare } from "@/app/actions";
import { renderLetterImage, type LetterImageInput } from "@/lib/letter-image";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Nút tròn chỉ có biểu tượng chia sẻ, đặt ở góc trên bên phải trang.
 * Bấm vào thì tạo ảnh của lá thư rồi mở bảng chia sẻ của máy (Zalo, Instagram, lưu vào thư viện ảnh...).
 * Máy không hỗ trợ chia sẻ file thì tải ảnh về.
 */
export function SaveImageButton({
  letterId,
  token,
  ...image
}: LetterImageInput & { letterId: string; token?: string }) {
  const [state, setState] = useState<"idle" | "working" | "saved" | "failed">("idle");

  const save = async () => {
    if (state === "working") return;
    setState("working");
    try {
      const blob = await renderLetterImage(image);
      const name = `la-thu-${image.page}.png`;
      const file = new File([blob], name, { type: "image/png" });
      let completed = false;
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          completed = true;
        } catch (error) {
          // Người dùng tự đóng bảng chia sẻ thì thôi; lỗi khác thì tải ảnh về.
          if ((error as Error).name !== "AbortError") {
            download(blob, name);
            completed = true;
          }
        }
      } else {
        download(blob, name);
        completed = true;
      }
      if (completed) {
        void recordShare(letterId, token);
        setState("saved");
        window.setTimeout(() => setState("idle"), 1800);
      } else {
        setState("idle");
      }
    } catch {
      setState("failed");
    }
  };

  const label =
    state === "working"
      ? "Đang tạo ảnh"
      : state === "saved"
        ? "Đã lưu ảnh"
        : state === "failed"
          ? "Chưa tạo được ảnh, bấm để thử lại"
          : "Lưu ảnh lá thư";

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "working"}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
        state === "failed"
          ? "border-rose/70 text-rose"
          : state === "saved"
            ? "border-gold bg-gold text-ink"
          : "border-sage/35 text-paper hover:border-gold hover:text-gold"
      } ${state === "working" ? "animate-pulse" : ""}`}
    >
      {state === "saved" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m6.5 12.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 15V4M8 7.5 12 3.5l4 4M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
