import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { one } from "@/lib/customer-data";
import { createCustomer } from "../actions";

export const metadata: Metadata = { title: "Thêm khách hàng", robots: { index: false, follow: false } };

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const error = one((await searchParams).error);
  return <main className="mx-auto w-full max-w-2xl px-5 py-8">
    <Link href="/admin/customers" className="text-[14px] text-sage hover:text-gold">‹ Khách hàng</Link>
    <h1 className="mt-3 text-[28px] font-semibold">Thêm khách hàng</h1>
    {error ? <p className="mt-4 rounded-xl border border-rose/50 p-3 text-rose">{error}</p> : null}
    <CustomerForm action={createCustomer} submit="Tạo khách hàng" />
  </main>;
}

function CustomerForm({ action, submit }: { action: (data: FormData) => void | Promise<void>; submit: string }) {
  return <form action={action} className="mt-6 grid gap-4 rounded-2xl border border-sage/25 p-5">
    <label><span className="mb-1.5 block text-[13px] text-sage">Họ tên</span><input className="field" name="fullName" autoComplete="name" /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-[13px] text-sage">Số điện thoại</span><input className="field" name="phone" inputMode="tel" autoComplete="tel" /></label><label><span className="mb-1.5 block text-[13px] text-sage">Email</span><input className="field" name="email" type="email" autoComplete="email" /></label></div>
    <label><span className="mb-1.5 block text-[13px] text-sage">Ghi chú</span><textarea className="field min-h-28" name="note" /></label>
    <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="marketingOptIn" /> Khách đồng ý nhận thông tin tiếp thị</label>
    <div><button className="btn">{submit}</button></div>
  </form>;
}

