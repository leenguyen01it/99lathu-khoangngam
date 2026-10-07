import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { isAdmin } from "@/lib/admin";
import { LoginForm } from "./LoginForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Đăng nhập admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  const firstAccount = (await prisma.adminUser.count()) === 0;

  return (
    <Shell center>
      <h1 className="mb-2 text-[24px] font-bold">Đăng nhập quản trị</h1>
      <p className="mb-6 text-[14px] text-sage">Dùng tài khoản riêng được cấp cho bạn.</p>
      {firstAccount ? <p className="mb-5 rounded-xl border border-gold/30 bg-gold/5 p-3 text-[13px] leading-relaxed text-sage">Chưa có tài khoản. Nhập email của chủ sở hữu và mật khẩu admin hiện tại để khởi tạo owner đầu tiên.</p> : null}
      <LoginForm />
    </Shell>
  );
}
