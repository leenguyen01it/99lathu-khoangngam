import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { formatAdminDate } from "@/lib/admin-format";
import { formatMoney } from "@/lib/customer-data";
import { getCustomer } from "@/server/customers";
import { addAddress, removeAddress, setCustomerArchived, updateCustomer } from "../actions";

export const metadata: Metadata = { title: "Chi tiết khách hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const save = updateCustomer.bind(null, id);
  const archive = setCustomerArchived.bind(null, id, !customer.archivedAt);
  const add = addAddress.bind(null, id);

  return <main className="mx-auto w-full max-w-5xl px-5 py-8">
    <Link href="/admin/customers" className="text-[14px] text-sage hover:text-gold">‹ Tất cả khách hàng</Link>
    <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold">{customer.fullName || "Khách chưa đặt tên"}</h1><p className="text-[13px] text-sage">Tạo {formatAdminDate(customer.createdAt)}</p></div>
      <div className="flex gap-2"><Link className="btn" href={`/admin/orders/new?customerId=${customer.id}`}>Tạo đơn hàng</Link><form action={archive}><button className="btn-ghost">{customer.archivedAt ? "Khôi phục" : "Lưu trữ"}</button></form></div>
    </header>

    <section className="mt-6 grid gap-5 md:grid-cols-2">
      <form action={save} className="grid gap-4 rounded-2xl border border-sage/25 p-5">
        <h2 className="text-[17px] font-semibold">Thông tin khách hàng</h2>
        <label><span className="mb-1 block text-[13px] text-sage">Họ tên</span><input className="field" name="fullName" defaultValue={customer.fullName ?? ""} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[13px] text-sage">Số điện thoại</span><input className="field" name="phone" defaultValue={customer.phone ?? ""} /></label><label><span className="mb-1 block text-[13px] text-sage">Email</span><input className="field" name="email" type="email" defaultValue={customer.email ?? ""} /></label></div>
        <label><span className="mb-1 block text-[13px] text-sage">Ghi chú</span><textarea className="field min-h-24" name="note" defaultValue={customer.note ?? ""} /></label>
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="marketingOptIn" defaultChecked={customer.marketingOptIn} /> Đồng ý nhận thông tin tiếp thị</label>
        <div><button className="btn">Lưu thay đổi</button></div>
      </form>

      <div className="rounded-2xl border border-sage/25 p-5"><h2 className="text-[17px] font-semibold">Địa chỉ</h2>
        <div className="mt-3 grid gap-3">{customer.addresses.map((a) => <div key={a.id} className="rounded-xl border border-sage/15 p-3 text-[14px]"><div className="flex justify-between gap-3"><p className="font-medium">{a.label || a.recipientName || "Địa chỉ"}{a.isDefault ? <span className="ml-2 text-[11px] text-gold">Mặc định</span> : null}</p><form action={removeAddress.bind(null, id, a.id)}><button className="text-[12px] text-rose hover:underline">Xóa</button></form></div><p className="mt-1 text-sage">{[a.address1, a.address2, a.ward, a.district, a.province].filter(Boolean).join(", ")}</p><p className="text-sage">{a.phone || ""}</p></div>)}</div>
        <details className="mt-4"><summary className="cursor-pointer text-gold">Thêm địa chỉ</summary><form action={add} className="mt-3 grid gap-3"><div className="grid grid-cols-2 gap-3"><input className="field" name="label" placeholder="Nhãn, ví dụ Nhà" /><input className="field" name="recipientName" placeholder="Người nhận" /></div><input className="field" name="phone" placeholder="Số điện thoại nhận hàng" /><input className="field" name="address1" required placeholder="Địa chỉ" /><input className="field" name="address2" placeholder="Thông tin bổ sung" /><div className="grid grid-cols-3 gap-3"><input className="field" name="ward" placeholder="Phường/xã" /><input className="field" name="district" placeholder="Quận/huyện" /><input className="field" name="province" placeholder="Tỉnh/thành" /></div><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="isDefault" /> Đặt làm mặc định</label><div><button className="btn">Thêm địa chỉ</button></div></form></details>
      </div>
    </section>

    <section className="mt-6 overflow-x-auto rounded-2xl border border-sage/25"><div className="flex items-center justify-between px-4 pt-4"><h2 className="text-[17px] font-semibold">Đơn hàng</h2><span className="text-[13px] text-sage">{customer.orders.length} đơn gần nhất</span></div><table className="mt-2 w-full min-w-[650px] text-left text-[14px]"><thead className="text-[12px] uppercase tracking-wider text-sage"><tr><th className="px-4 py-2">Mã đơn</th><th className="px-4 py-2">Trạng thái</th><th className="px-4 py-2">Ngày</th><th className="px-4 py-2">Tổng</th></tr></thead><tbody>{customer.orders.map((o) => <tr key={o.id} className="border-t border-sage/15"><td className="px-4 py-2"><Link className="text-gold hover:underline" href={`/admin/orders/${o.id}`}>{o.orderNumber || o.id.slice(-8)}</Link></td><td className="px-4 py-2">{o.status}</td><td className="px-4 py-2 text-sage">{formatAdminDate(o.placedAt || o.createdAt)}</td><td className="px-4 py-2">{formatMoney(o.totalAmount, o.currency)}</td></tr>)}</tbody></table></section>

    <section className="mt-6 rounded-2xl border border-sage/25 p-4"><h2 className="text-[17px] font-semibold">Thẻ đang sở hữu</h2><div className="mt-3 flex flex-wrap gap-2">{customer.cards.map((card) => <Link key={card.id} href={`/admin/cards/${card.id}`} className="rounded-lg border border-sage/25 px-3 py-2 font-mono text-[13px] hover:border-gold">{card.uid}</Link>)}{!customer.cards.length ? <p className="text-[14px] text-sage">Chưa gắn thẻ nào.</p> : null}</div></section>
  </main>;
}
