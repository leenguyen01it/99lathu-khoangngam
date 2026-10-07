import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { formatAdminDateTime } from "@/lib/admin-format";
import { formatMoney } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import { getOrder } from "@/server/orders";
import { addOrderItem, assignCard, removeOrderItem, unassignCard, updateOrder } from "../actions";

export const metadata: Metadata = { title: "Chi tiết đơn hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateValue = (date: Date | null) => date ? date.toISOString().slice(0, 10) : "";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const customers = await prisma.customer.findMany({ where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 200 });
  if (order.customer && !customers.some((c) => c.id === order.customerId)) customers.unshift(order.customer);
  const save = updateOrder.bind(null, id);
  const addItem = addOrderItem.bind(null, id);
  const assign = assignCard.bind(null, id);

  return <main className="mx-auto w-full max-w-6xl px-5 py-8">
    <Link href="/admin/orders" className="text-[14px] text-sage hover:text-gold">‹ Tất cả đơn hàng</Link>
    <header className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[28px] font-semibold">Đơn {order.orderNumber || order.id.slice(-8)}</h1><p className="text-[13px] text-sage">{order.source?.name || "Tạo trên admin"} · cập nhật {formatAdminDateTime(order.updatedAt)}</p></div>{order.customer ? <Link className="btn-ghost" href={`/admin/customers/${order.customer.id}`}>Xem khách hàng</Link> : null}</header>

    <form action={save} className="mt-6 grid gap-4 rounded-2xl border border-sage/25 p-5">
      <div className="grid gap-4 md:grid-cols-4"><label><span className="mb-1 block text-[13px] text-sage">Mã đơn</span><input className="field" name="orderNumber" defaultValue={order.orderNumber ?? ""} /></label><label className="md:col-span-2"><span className="mb-1 block text-[13px] text-sage">Khách hàng</span><select className="field" name="customerId" defaultValue={order.customerId ?? ""}><option value="">Khách lẻ</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName || c.phone || c.email || c.id}</option>)}</select></label><label><span className="mb-1 block text-[13px] text-sage">Ngày đặt</span><input className="field" type="date" name="placedAt" defaultValue={dateValue(order.placedAt)} /></label></div>
      <div className="grid gap-4 md:grid-cols-3"><label><span className="mb-1 block text-[13px] text-sage">Trạng thái</span><select className="field" name="status" defaultValue={order.status}><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></label><label><span className="mb-1 block text-[13px] text-sage">Thanh toán</span><select className="field" name="financialStatus" defaultValue={order.financialStatus ?? ""}><option value="">Chưa đặt</option><option value="pending">Chưa thanh toán</option><option value="paid">Đã thanh toán</option><option value="refunded">Đã hoàn tiền</option></select></label><label><span className="mb-1 block text-[13px] text-sage">Giao hàng</span><select className="field" name="fulfillmentStatus" defaultValue={order.fulfillmentStatus ?? ""}><option value="">Chưa đặt</option><option value="unfulfilled">Chưa giao</option><option value="processing">Đang xử lý</option><option value="fulfilled">Đã giao</option><option value="returned">Hoàn hàng</option></select></label></div>
      <div className="grid gap-4 md:grid-cols-5"><Money name="subtotalAmount" label="Tạm tính" value={order.subtotalAmount} /><Money name="discountAmount" label="Giảm giá" value={order.discountAmount} /><Money name="shippingAmount" label="Vận chuyển" value={order.shippingAmount} /><Money name="taxAmount" label="Thuế" value={order.taxAmount} /><Money name="totalAmount" label="Tổng" value={order.totalAmount} /></div><input type="hidden" name="currency" value={order.currency} />
      <div className="grid gap-4 md:grid-cols-3"><input className="field" name="customerName" defaultValue={order.customerName ?? ""} placeholder="Tên người nhận" /><input className="field" name="phone" defaultValue={order.phone ?? ""} placeholder="Số điện thoại" /><input className="field" name="email" type="email" defaultValue={order.email ?? ""} placeholder="Email" /></div>
      <label><span className="mb-1 block text-[13px] text-sage">Ghi chú</span><textarea className="field min-h-20" name="note" defaultValue={order.note ?? ""} /></label><div><button className="btn">Lưu đơn hàng</button></div>
    </form>

    <section className="mt-6 rounded-2xl border border-sage/25 p-5"><div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Sản phẩm</h2><span className="text-[13px] text-sage">{order.items.length} dòng</span></div>
      <div className="mt-3 grid gap-2">{order.items.map((item) => <div key={item.id} className="grid items-center gap-2 rounded-xl border border-sage/15 p-3 text-[14px] sm:grid-cols-[1fr_90px_140px_auto]"><div><p className="font-medium">{item.name}</p><p className="text-[12px] text-sage">{[item.sku, item.variantName].filter(Boolean).join(" · ")}</p></div><p>x {item.quantity}</p><p>{formatMoney(item.totalAmount ?? (item.unitAmount === null ? null : item.unitAmount * item.quantity), order.currency)}</p><form action={removeOrderItem.bind(null, id, item.id)}><button className="text-rose hover:underline" disabled={item.cards.length > 0}>{item.cards.length ? "Đã gắn thẻ" : "Xóa"}</button></form></div>)}</div>
      <details className="mt-4"><summary className="cursor-pointer text-gold">Thêm sản phẩm</summary><form action={addItem} className="mt-3 grid gap-3 sm:grid-cols-6"><input className="field sm:col-span-2" name="name" required placeholder="Tên sản phẩm" /><input className="field" name="sku" placeholder="SKU" /><input className="field" name="variantName" placeholder="Phân loại" /><input className="field" type="number" min="1" name="quantity" defaultValue="1" /><input className="field" name="totalAmount" inputMode="numeric" placeholder="Thành tiền" /><div><button className="btn">Thêm</button></div></form></details>
    </section>

    <section className="mt-6 rounded-2xl border border-sage/25 p-5"><h2 className="text-[18px] font-semibold">Thẻ NFC</h2><p className="mt-1 text-[13px] text-sage">Nhập UID từ tem tạm trên bao bì. UID không cần xuất hiện trên thành phẩm.</p>
      <form action={assign} className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-56 flex-1"><span className="mb-1 block text-[13px] text-sage">UID thẻ</span><input className="field font-mono" name="uid" required placeholder="12 ký tự" /></label><label className="min-w-52"><span className="mb-1 block text-[13px] text-sage">Dòng sản phẩm</span><select className="field" name="orderItemId"><option value="">Không chỉ định</option>{order.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label><button className="btn">Gắn thẻ</button></form>
      <div className="mt-4 grid gap-2">{order.cards.map((card) => <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sage/15 p-3"><div><Link href={`/admin/cards/${card.id}`} className="font-mono text-gold hover:underline">{card.uid}</Link><p className="text-[12px] text-sage">{card.assignedAt ? `Gắn ${formatAdminDateTime(card.assignedAt)}` : ""}</p></div><form action={unassignCard.bind(null, id, card.id)}><button className="text-[13px] text-rose hover:underline">Bỏ gắn</button></form></div>)}{!order.cards.length ? <p className="text-[14px] text-sage">Chưa gắn thẻ nào.</p> : null}</div>
    </section>
  </main>;
}

function Money({ name, label, value }: { name: string; label: string; value: number | null }) { return <label><span className="mb-1 block text-[13px] text-sage">{label}</span><input className="field" name={name} inputMode="numeric" defaultValue={value ?? ""} /></label>; }
