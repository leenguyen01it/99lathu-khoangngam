import type { CardStatus } from "@/server/stats";

// Màu của nhãn trạng thái thẻ, dùng chung cho trang danh sách và trang chi tiết.
export const STATUS_STYLES: Record<CardStatus, string> = {
  unopened: "border-sage/30 text-sage",
  active: "border-gold bg-gold text-ink",
  fading: "border-gold/60 text-gold",
  dropped: "border-rose/70 text-rose",
  finished: "border-sage bg-sage text-ink",
};

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export function lastOpenLabel(daysSince: number | null): string {
  if (daysSince === null) return "";
  if (daysSince === 0) return "Hôm nay";
  if (daysSince === 1) return "Hôm qua";
  return `${daysSince} ngày trước`;
}
