import Link from "next/link";
import { queryHref } from "@/lib/customer-data";

export function Pagination({ path, page, pageSize, total, params }: { path: string; page: number; pageSize: number; total: number; params: URLSearchParams }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const from = total ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(total, safePage * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-sage">
      <span>{from}–{to} trong {total}</span>
      <div className="flex items-center gap-2">
        {safePage > 1 ? <Link className="btn-ghost !px-3 !py-1.5" href={queryHref(path, params, { page: safePage - 1 })}>Trước</Link> : null}
        <span>Trang {safePage} / {pages}</span>
        {safePage < pages ? <Link className="btn-ghost !px-3 !py-1.5" href={queryHref(path, params, { page: safePage + 1 })}>Sau</Link> : null}
      </div>
    </div>
  );
}

