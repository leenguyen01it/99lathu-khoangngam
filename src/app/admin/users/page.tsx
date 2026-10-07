import type { Metadata } from "next";
import { requireOwner } from "@/lib/admin";
import { formatAdminDateTime } from "@/lib/admin-format";
import { one } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import { createAdminUser, resetAdminPassword, revokeAdminSessions, toggleAdminUser, updateAdminRole } from "./actions";

export const metadata: Metadata = { title: "Tài khoản quản trị", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const roleNames: Record<string, string> = { owner: "Chủ sở hữu", manager: "Quản lý", support: "Hỗ trợ" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireOwner();
  const error = one((await searchParams).error);
  const [users, logs] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }], include: { _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } } } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { adminUser: { select: { fullName: true, email: true } } } }),
  ]);
  return <main className="mx-auto w-full max-w-6xl px-5 py-8"><header><p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Bảo mật</p><h1 className="text-[28px] font-semibold">Tài khoản quản trị</h1><p className="mt-1 text-[14px] text-sage">Mỗi người dùng một tài khoản riêng. Bạn đang đăng nhập với {actor.email}.</p></header>
    {error ? <p className="mt-4 rounded-xl border border-rose/40 p-3 text-rose">{error}</p> : null}
    <section className="mt-6 rounded-2xl border border-sage/25 p-5"><h2 className="text-[18px] font-semibold">Tạo tài khoản</h2><form action={createAdminUser} className="mt-4 grid gap-3 md:grid-cols-5"><input className="field" name="fullName" required placeholder="Họ tên" /><input className="field" name="email" type="email" required placeholder="Email" /><input className="field" name="password" type="password" minLength={12} required placeholder="Mật khẩu tạm, tối thiểu 12 ký tự" /><select className="field" name="role" defaultValue="support"><option value="support">Hỗ trợ</option><option value="manager">Quản lý</option><option value="owner">Chủ sở hữu</option></select><button className="btn">Tạo tài khoản</button></form></section>
      <section className="mt-6 grid gap-3">{users.map((u) => <div key={u.id} className="rounded-2xl border border-sage/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{u.fullName} {u.id === actor.id ? <span className="text-[12px] text-gold">Bạn</span> : null}{!u.active ? <span className="ml-2 text-[12px] text-rose">Đã khóa</span> : null}</p><p className="text-[13px] text-sage">{u.email} · {roleNames[u.role] || u.role} · {u._count.sessions} phiên hoạt động</p><p className="text-[12px] text-sage/70">Đăng nhập cuối: {u.lastLoginAt ? formatAdminDateTime(u.lastLoginAt) : "Chưa có"}</p></div><div className="flex flex-wrap gap-2"><form action={revokeAdminSessions.bind(null, u.id)}><button className="btn-ghost">Thu hồi phiên</button></form>{u.id !== actor.id ? <form action={toggleAdminUser.bind(null, u.id)}><button className="btn-ghost">{u.active ? "Khóa" : "Mở khóa"}</button></form> : null}</div></div>{u.id !== actor.id ? <form action={updateAdminRole.bind(null, u.id)} className="mt-3 flex max-w-sm gap-2"><select className="field" name="role" defaultValue={u.role}><option value="support">Hỗ trợ</option><option value="manager">Quản lý</option><option value="owner">Chủ sở hữu</option></select><button className="btn-ghost">Đổi vai trò</button></form> : null}<details className="mt-3"><summary className="cursor-pointer text-[13px] text-gold">Đặt mật khẩu tạm mới</summary><form action={resetAdminPassword.bind(null, u.id)} className="mt-2 flex max-w-lg gap-2"><input className="field" type="password" name="password" minLength={12} required placeholder="Tối thiểu 12 ký tự" /><button className="btn">Đặt lại</button></form></details></div>)}</section>
    <section className="mt-8 overflow-x-auto rounded-2xl border border-sage/25"><h2 className="px-4 pt-4 text-[18px] font-semibold">Nhật ký quản trị gần nhất</h2><table className="mt-2 w-full min-w-[760px] text-left text-[13px]"><thead className="text-[11px] uppercase tracking-wider text-sage"><tr><th className="px-4 py-2">Thời gian</th><th className="px-4 py-2">Người thực hiện</th><th className="px-4 py-2">Hành động</th><th className="px-4 py-2">Đối tượng</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-sage/15"><td className="px-4 py-2">{formatAdminDateTime(log.createdAt)}</td><td className="px-4 py-2">{log.adminUser.fullName}</td><td className="px-4 py-2">{log.action}</td><td className="px-4 py-2 text-sage">{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</td></tr>)}</tbody></table></section>
  </main>;
}
