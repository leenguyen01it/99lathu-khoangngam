import type { Metadata } from "next";
import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/admin";
import { formatMoney, one, pageSize, positiveInt } from "@/lib/customer-data";
import { listOrders } from "@/server/orders";
import { Pagination } from "@/components/admin/Pagination";

export const metadata: Metadata = { title: "Đơn hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
type Search = Record<string, string | string[] | undefined>;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const raw = await searchParams;
  const size = pageSize(raw.pageSize);
  const requestedPage = positiveInt(raw.page);
  const sortRaw = one(raw.sort);
  const input = { q: one(raw.q), status: one(raw.status), financial: one(raw.financial), fulfillment: one(raw.fulfillment), sourceId: one(raw.source), from: one(raw.from), to: one(raw.to), sort: (sortRaw === "oldest" || sortRaw === "total" ? sortRaw : "newest") as "newest" | "oldest" | "total", page: requestedPage, pageSize: size };
  const first = await listOrders(input);
  const pages = Math.max(1, Math.ceil(first.total / size));
  const page = Math.min(requestedPage, pages);
  const result = page === requestedPage ? first : await listOrders({ ...input, page });
  const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value) params.set(key, value);

  return <main className="mx-auto w-full max-w-7xl px-5 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Quản trị</p><h1 className="text-[28px] font-semibold">Đơn hàng</h1></div><Link href="/admin/orders/new" className="btn">Tạo đơn hàng</Link></header>
    <form className="mt-6 rounded-2xl border border-sage/25 bg-deep/10 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_190px_auto]">
        <FilterField label="Tìm đơn hàng"><input className="field" name="q" defaultValue={input.q} placeholder="Mã đơn, tên khách, điện thoại hoặc email" /></FilterField>
        <FilterField label="Trạng thái"><select className="field" name="status" defaultValue={input.status}><option value="">Tất cả trạng thái</option><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></FilterField>
        <div className="flex items-end gap-2"><button className="btn">Áp dụng</button>{Object.values(input).some((v) => typeof v === "string" && v && v !== "newest") ? <Link href="/admin/orders" className="btn-ghost">Xóa lọc</Link> : null}</div>
      </div>
      <details className="mt-4 border-t border-sage/15 pt-4" open={Boolean(input.financial || input.fulfillment || input.sourceId || input.from || input.to)}>
        <summary className="cursor-pointer select-none text-[14px] font-medium text-gold">Bộ lọc nâng cao</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Thanh toán"><select className="field" name="financial" defaultValue={input.financial}><option value="">Tất cả</option><option value="pending">Chưa thanh toán</option><option value="paid">Đã thanh toán</option><option value="refunded">Đã hoàn tiền</option></select></FilterField>
          <FilterField label="Giao hàng"><select className="field" name="fulfillment" defaultValue={input.fulfillment}><option value="">Tất cả</option><option value="unfulfilled">Chưa giao</option><option value="processing">Đang xử lý</option><option value="fulfilled">Đã giao</option><option value="returned">Hoàn hàng</option></select></FilterField>
          <FilterField label="Nguồn đơn"><select className="field" name="source" defaultValue={input.sourceId}><option value="">Tất cả nguồn</option><option value="manual">Tạo trên admin</option>{result.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></FilterField>
          <FilterField label="Sắp xếp"><select className="field" name="sort" defaultValue={input.sort}><option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option><option value="total">Giá trị cao trước</option></select></FilterField>
          <FilterField label="Từ ngày"><input className="field" type="date" name="from" defaultValue={input.from} /></FilterField>
          <FilterField label="Đến ngày"><input className="field" type="date" name="to" defaultValue={input.to} /></FilterField>
          <FilterField label="Hiển thị"><select className="field" name="pageSize" defaultValue={String(size)}><option value="25">25 đơn mỗi trang</option><option value="50">50 đơn mỗi trang</option><option value="100">100 đơn mỗi trang</option></select></FilterField>
        </div>
      </details>
    </form>
    <section className="mt-5 overflow-x-auto rounded-2xl border border-sage/25"><table className="w-full min-w-[1050px] text-left text-[14px]"><thead className="text-[12px] uppercase tracking-wider text-sage"><tr><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thanh toán</th><th className="px-4 py-3">Giao hàng</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Thẻ</th><th className="px-4 py-3">Tổng</th><th /></tr></thead><tbody>
      {result.rows.map((o) => <tr key={o.id} className="border-t border-sage/15"><td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium text-gold hover:underline">{o.orderNumber || o.id.slice(-8)}</Link><p className="text-[12px] text-sage">{formatAdminDate(o.placedAt || o.createdAt)} · {o.source?.name || "Admin"}</p></td><td className="px-4 py-3">{o.customer ? <Link className="hover:text-gold" href={`/admin/customers/${o.customer.id}`}>{o.customer.fullName || o.customer.phone || "Khách"}</Link> : (o.customerName || o.phone || "Khách lẻ")}</td><td className="px-4 py-3">{o.status}</td><td className="px-4 py-3">{o.financialStatus || ""}</td><td className="px-4 py-3">{o.fulfillmentStatus || ""}</td><td className="px-4 py-3">{o._count.items}</td><td className="px-4 py-3">{o._count.cards}</td><td className="px-4 py-3 whitespace-nowrap">{formatMoney(o.totalAmount, o.currency)}</td><td className="px-4 py-3 text-right"><Link className="text-gold" href={`/admin/orders/${o.id}`}>Chi tiết</Link></td></tr>)}
      {!result.rows.length ? <tr><td colSpan={9} className="px-4 py-10 text-center text-sage">Không tìm thấy đơn hàng phù hợp.</td></tr> : null}
    </tbody></table><Pagination path="/admin/orders" page={page} pageSize={size} total={result.total} params={params} /></section>
  </main>;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">{label}</span>{children}</label>;
}
