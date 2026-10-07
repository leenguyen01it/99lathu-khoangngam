export const PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function positiveInt(value: string | string[] | undefined, fallback = 1): number {
  const parsed = Number(one(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function pageSize(value: string | string[] | undefined): number {
  const parsed = positiveInt(value, PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : PAGE_SIZE;
}

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `84${digits.slice(1)}`;
  return digits;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function nullable(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export function moneyInput(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(/[^0-9-]/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function formatMoney(value: number | null, currency = "VND"): string {
  if (value === null) return "";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function queryHref(path: string, current: URLSearchParams, updates: Record<string, string | number | null>) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return `${path}?${next.toString()}`;
}

