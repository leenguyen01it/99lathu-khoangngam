import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { one } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import { createOrder } from "../actions";

export const metadata: Metadata = { title: "Tạo đơn hàng", robots: { index: false, follow: false } };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const customerId = one((await searchParams).customerId);
  const customers = await prisma.customer.findMany({ where: { archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 200 });
  const selected = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
  if (selected && !customers.some((c) => c.id === selected.id)) customers.unshift(selected);
  return <main className="mx-auto w-full max-w-3xl px-5 py-8"><Link href="/admin/orders" className="text-[14px] text-sage hover:text-gold">‹ Đơn hàng</Link><h1 className="mt-3 text-[28px] font-semibold">Tạo đơn hàng</h1>
    <form action={createOrder} className="mt-6 grid gap-4 rounded-2xl border border-sage/25 p-5">
      <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-[13px] text-sage">Khách hàng</span><select className="field" name="customerId" defaultValue={customerId}><option value="">Khách lẻ</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName || c.phone || c.email || c.id}</option>)}</select></label><label><span className="mb-1 block text-[13px] text-sage">Mã đơn</span><input className="field" name="orderNumber" placeholder="Tự đặt hoặc để trống" /></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-1 block text-[13px] text-sage">Trạng thái</span><select className="field" name="status" defaultValue="pending"><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></label><label><span className="mb-1 block text-[13px] text-sage">Thanh toán</span><select className="field" name="financialStatus" defaultValue="pending"><option value="pending">Chưa thanh toán</option><option value="paid">Đã thanh toán</option><option value="refunded">Đã hoàn tiền</option></select></label><label><span className="mb-1 block text-[13px] text-sage">Giao hàng</span><select className="field" name="fulfillmentStatus" defaultValue="unfulfilled"><option value="unfulfilled">Chưa giao</option><option value="processing">Đang xử lý</option><option value="fulfilled">Đã giao</option><option value="returned">Hoàn hàng</option></select></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><label><span className="mb-1 block text-[13px] text-sage">Ngày đặt</span><input className="field" type="date" name="placedAt" defaultValue={new Date().toISOString().slice(0,10)} /></label><label><span className="mb-1 block text-[13px] text-sage">Tổng tiền</span><input className="field" name="totalAmount" inputMode="numeric" /></label><label><span className="mb-1 block text-[13px] text-sage">Tiền tệ</span><input className="field" name="currency" defaultValue="VND" /></label></div>
      <div className="grid gap-4 sm:grid-cols-3"><input className="field" name="customerName" defaultValue={selected?.fullName ?? ""} placeholder="Tên người nhận" /><input className="field" name="phone" defaultValue={selected?.phone ?? ""} placeholder="Số điện thoại" /><input className="field" name="email" type="email" defaultValue={selected?.email ?? ""} placeholder="Email" /></div>
      <label><span className="mb-1 block text-[13px] text-sage">Ghi chú</span><textarea className="field min-h-24" name="note" /></label><div><button className="btn">Tạo đơn hàng</button></div>
    </form>
  </main>;
}

