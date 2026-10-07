"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

const items = [
  { href: "/admin", label: "Thẻ", exact: true },
  { href: "/admin/customers", label: "Khách hàng" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/users", label: "Tài khoản", ownerOnly: true },
  { href: "/admin/account/password", label: "Đổi mật khẩu" },
];

function NavLinks({ mobile = false, role }: { mobile?: boolean; role?: string | null }) {
  const pathname = usePathname();
  return items.filter((item) => !item.ownerOnly || role === "owner").map((item) => {
    const active = item.exact ? pathname === item.href || pathname.startsWith("/admin/cards/") : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={
          mobile
            ? `whitespace-nowrap rounded-full px-4 py-2 text-[14px] ${active ? "bg-gold font-semibold text-ink" : "border border-sage/25 text-paper"}`
            : `rounded-xl px-4 py-3 text-[15px] transition ${active ? "bg-gold font-semibold text-ink" : "text-sage hover:bg-sage/10 hover:text-paper"}`
        }
      >
        {item.label}
      </Link>
    );
  });
}

export function AdminFrame({ children, role }: { children: ReactNode; role?: string | null }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-sage/20 bg-ink px-4 py-7 lg:flex">
        <Link href="/admin" className="px-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-gold">Khoảng Ngẫm</p>
          <p className="mt-1 text-[19px] font-semibold text-paper">Quản trị</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-2"><NavLinks role={role} /></nav>
        <div className="mt-auto"><p className="mb-3 px-3 text-[11px] leading-relaxed text-sage/60">Khách hàng, đơn hàng và thẻ NFC trong cùng một hệ thống.</p><LogoutButton /></div>
      </aside>
      <div className="border-b border-sage/20 bg-ink px-4 py-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between"><Link href="/admin" className="text-[13px] font-semibold uppercase tracking-[0.2em] text-gold">Khoảng Ngẫm</Link><LogoutButton compact /></div>
        <nav className="flex gap-2 overflow-x-auto pb-1"><NavLinks mobile role={role} /></nav>
      </div>
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
