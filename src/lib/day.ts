// "Một ngày" của sản phẩm tính theo giờ Việt Nam và bắt đầu lúc 0 giờ.
export const DAY_START_HOUR = 0;

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Khoá ngày dạng "YYYY-MM-DD". */
export function dayKey(now: Date = new Date()): string {
  return formatter.format(new Date(now.getTime() - DAY_START_HOUR * 60 * 60 * 1000));
}

/** Số ngày từ `from` tới `to` (hai khoá ngày), không âm. */
export function daysBetween(from: string, to: string): number {
  const diff = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 86_400_000)) : 0;
}
