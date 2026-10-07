import type { Metadata } from "next";
import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import { one, pageSize, positiveInt } from "@/lib/customer-data";
import { listCustomers } from "@/server/customers";
import { Pagination } from "@/components/admin/Pagination";

export const metadata: Metadata = { title: "Khách hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const raw = await searchParams;
  const q = one(raw.q);
  const archivedRaw = one(raw.archived);
  const archived = archivedRaw === "archived" || archivedRaw === "all" ? archivedRaw : "active";
  const sortRaw = one(raw.sort);
  const sort = sortRaw === "name" || sortRaw === "orders" ? sortRaw : "recent";
  const size = pageSize(raw.pageSize);
  const requestedPage = positiveInt(raw.page);
  const first = await listCustomers({ q, archived, sort, page: requestedPage, pageSize: size });
  const pages = Math.max(1, Math.ceil(first.total / size));
  const page = Math.min(requestedPage, pages);
  const result = page === requestedPage ? first : await listCustomers({ q, archived, sort, page, pageSize: size });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value) params.set(key, value);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Quản trị</p><h1 className="text-[28px] font-semibold">Khách hàng</h1></div>
        <Link href="/admin/customers/new" className="btn">Thêm khách hàng</Link>
      </header>

      <form className="mt-6 rounded-2xl border border-sage/25 bg-deep/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1"><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">Tìm khách hàng</span><input className="field" name="q" defaultValue={q} placeholder="Tên, số điện thoại hoặc email" /></label>
          <div className="flex items-end gap-2"><button className="btn">Tìm kiếm</button>{q || archived !== "active" || sort !== "recent" ? <Link href="/admin/customers" className="btn-ghost">Xóa lọc</Link> : null}</div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-sage/15 pt-4 sm:grid-cols-3">
          <FilterField label="Hồ sơ"><select className="field" name="archived" defaultValue={archived}><option value="active">Đang hoạt động</option><option value="archived">Đã lưu trữ</option><option value="all">Tất cả hồ sơ</option></select></FilterField>
          <FilterField label="Sắp xếp"><select className="field" name="sort" defaultValue={sort}><option value="recent">Mới cập nhật</option><option value="name">Tên A đến Z</option><option value="orders">Nhiều đơn nhất</option></select></FilterField>
          <FilterField label="Hiển thị"><select className="field" name="pageSize" defaultValue={String(size)}><option value="25">25 khách mỗi trang</option><option value="50">50 khách mỗi trang</option><option value="100">100 khách mỗi trang</option></select></FilterField>
        </div>
      </form>

      <section className="mt-5 overflow-x-auto rounded-2xl border border-sage/25">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="text-[12px] uppercase tracking-wider text-sage"><tr><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Thẻ</th><th className="px-4 py-3">Cập nhật</th><th /></tr></thead>
          <tbody>
            {result.rows.map((customer) => <tr key={customer.id} className="border-t border-sage/15">
              <td className="px-4 py-3"><Link className="font-medium hover:text-gold" href={`/admin/customers/${customer.id}`}>{customer.fullName || "Khách chưa đặt tên"}</Link>{customer.archivedAt ? <span className="ml-2 rounded border border-sage/30 px-1.5 py-0.5 text-[11px] text-sage">Đã lưu trữ</span> : null}</td>
              <td className="px-4 py-3"><p>{customer.phone || ""}</p><p className="text-[12px] text-sage">{customer.email || ""}</p></td>
              <td className="px-4 py-3">{customer._count.orders}</td><td className="px-4 py-3">{customer._count.cards}</td>
              <td className="px-4 py-3 text-sage">{formatAdminDate(customer.updatedAt)}</td>
              <td className="px-4 py-3 text-right"><Link className="text-gold hover:underline" href={`/admin/customers/${customer.id}`}>Chi tiết</Link></td>
            </tr>)}
            {!result.rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sage">Không tìm thấy khách hàng phù hợp.</td></tr> : null}
          </tbody>
        </table>
        <Pagination path="/admin/customers" page={page} pageSize={size} total={result.total} params={params} />
      </section>
    </main>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">{label}</span>{children}</label>;
}
