import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { one } from "@/lib/customer-data";
import { changeOwnPassword } from "../../users/actions";

export const metadata: Metadata = { title: "Đổi mật khẩu", robots: { index: false, follow: false } };

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireAdmin();
  const error = one((await searchParams).error);
  return <main className="mx-auto w-full max-w-xl px-5 py-8"><p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Tài khoản</p><h1 className="text-[28px] font-semibold">Đổi mật khẩu</h1><p className="mt-2 text-[14px] text-sage">{actor.fullName} · Mật khẩu mới cần ít nhất 12 ký tự.</p>{error ? <p className="mt-4 rounded-xl border border-rose/40 p-3 text-rose">{error}</p> : null}<form action={changeOwnPassword} className="mt-6 grid gap-4 rounded-2xl border border-sage/25 p-5"><input className="field" type="password" name="currentPassword" required placeholder="Mật khẩu hiện tại" /><input className="field" type="password" name="newPassword" minLength={12} required placeholder="Mật khẩu mới" /><input className="field" type="password" name="confirmPassword" minLength={12} required placeholder="Nhập lại mật khẩu mới" /><div><button className="btn">Đổi mật khẩu</button></div></form></main>;
}

