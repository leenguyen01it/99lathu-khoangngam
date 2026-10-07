"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  auditAdmin,
  clearFailedLogins,
  endAdminSession,
  getAdminActor,
  loginAllowed,
  recordFailedLogin,
  requireAdmin,
  startAdminSession,
} from "@/lib/admin";
import { passwordMatches } from "@/lib/crypto";
import { getClientIp } from "@/lib/request";
import { createCards } from "@/server/cards";
import { normalizeEmail } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = getClientIp(h);
  const email = String(formData.get("email") ?? "").trim();
  const emailNormalized = normalizeEmail(email);
  const password = String(formData.get("password") ?? "");
  const allowed = await loginAllowed(ip, emailNormalized);
  const userCount = await prisma.adminUser.count();
  if (userCount === 0 && allowed && emailNormalized.includes("@") && passwordMatches(password)) {
    const user = await prisma.adminUser.create({ data: { email, emailNormalized, fullName: "Chủ sở hữu", passwordHash: await hash(password, 12), role: "owner", mustChangePassword: false, lastLoginAt: new Date() } });
    await clearFailedLogins(ip, emailNormalized);
    await startAdminSession(user.id, ip, h.get("user-agent"));
    await prisma.adminAuditLog.create({ data: { adminUserId: user.id, action: "bootstrap_owner", entityType: "admin_user", entityId: user.id } });
    redirect("/admin");
  }
  const user = await prisma.adminUser.findUnique({ where: { emailNormalized } });
  const matches = user ? await compare(password, user.passwordHash) : await compare(password, "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5Z5S5WsE5fQ5QFx8C3/OQzXqE7jVtHa");
  if (!allowed || !matches) {
    if (allowed) await recordFailedLogin(ip, emailNormalized);
    return { error: "Không thể đăng nhập. Kiểm tra mật khẩu hoặc thử lại sau." };
  }
  if (!user?.active) return { error: "Không thể đăng nhập. Kiểm tra mật khẩu hoặc thử lại sau." };
  await clearFailedLogins(ip, emailNormalized);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startAdminSession(user.id, ip, h.get("user-agent"));
  const actor = { id: user.id, email: user.email, fullName: user.fullName, role: user.role as "owner" | "manager" | "support", mustChangePassword: user.mustChangePassword, sessionId: "new", ipHash: null };
  await auditAdmin(actor, "login", "admin_user", user.id);
  redirect(user.mustChangePassword ? "/admin/account/password" : "/admin");
}

export async function logout(): Promise<void> {
  const actor = await getAdminActor();
  if (actor) await auditAdmin(actor, "logout", "admin_user", actor.id);
  await endAdminSession();
  redirect("/admin/login");
}

export async function createCardBatch(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  if (actor.role === "support") redirect("/admin");
  const count = Number(formData.get("count"));
  if (Number.isFinite(count) && count >= 1) {
    const created = await createCards(count);
    await auditAdmin(actor, "create_batch", "card", null, { count: created });
  }
  revalidatePath("/admin");
}
