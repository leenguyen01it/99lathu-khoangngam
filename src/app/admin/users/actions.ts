"use server";

import { hash, compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditAdmin, requireAdmin, requireOwner } from "@/lib/admin";
import { normalizeEmail } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";

const roles = new Set(["owner", "manager", "support"]);

export async function createAdminUser(formData: FormData) {
  const actor = await requireOwner();
  const email = String(formData.get("email") ?? "").trim();
  const emailNormalized = normalizeEmail(email);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "support");
  if (!emailNormalized.includes("@") || !fullName || password.length < 12 || !roles.has(role)) redirect("/admin/users?error=Thông tin không hợp lệ hoặc mật khẩu dưới 12 ký tự");
  if (await prisma.adminUser.findUnique({ where: { emailNormalized } })) redirect("/admin/users?error=Email này đã có tài khoản");
  const user = await prisma.adminUser.create({ data: { email, emailNormalized, fullName, passwordHash: await hash(password, 12), role, mustChangePassword: true } });
  await auditAdmin(actor, "create", "admin_user", user.id, { role });
  revalidatePath("/admin/users");
}

export async function updateAdminRole(id: string, formData: FormData) {
  const actor = await requireOwner();
  const role = String(formData.get("role") ?? "support");
  if (!roles.has(role)) return;
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user || user.id === actor.id) return;
  if (user.role === "owner" && role !== "owner") {
    const owners = await prisma.adminUser.count({ where: { role: "owner", active: true } });
    if (owners <= 1) return;
  }
  await prisma.adminUser.update({ where: { id }, data: { role } });
  await auditAdmin(actor, "change_role", "admin_user", id, { from: user.role, to: role });
  revalidatePath("/admin/users");
}

export async function toggleAdminUser(id: string) {
  const actor = await requireOwner();
  if (id === actor.id) return;
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return;
  if (user.role === "owner" && user.active) {
    const owners = await prisma.adminUser.count({ where: { role: "owner", active: true } });
    if (owners <= 1) return;
  }
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id }, data: { active: !user.active } }),
    ...(!user.active ? [] : [prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } })]),
  ]);
  await auditAdmin(actor, user.active ? "deactivate" : "activate", "admin_user", id);
  revalidatePath("/admin/users");
}

export async function resetAdminPassword(id: string, formData: FormData) {
  const actor = await requireOwner();
  const password = String(formData.get("password") ?? "");
  if (password.length < 12) return;
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id }, data: { passwordHash: await hash(password, 12), mustChangePassword: true } }),
    prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await auditAdmin(actor, "reset_password", "admin_user", id);
  revalidatePath("/admin/users");
}

export async function revokeAdminSessions(id: string) {
  const actor = await requireOwner();
  await prisma.adminSession.updateMany({ where: { adminUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await auditAdmin(actor, "revoke_sessions", "admin_user", id);
  revalidatePath("/admin/users");
}

export async function changeOwnPassword(formData: FormData) {
  const actor = await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const user = await prisma.adminUser.findUnique({ where: { id: actor.id } });
  if (!user || !(await compare(current, user.passwordHash)) || next.length < 12 || next !== confirm) redirect("/admin/account/password?error=Mật khẩu hiện tại hoặc mật khẩu mới không hợp lệ");
  await prisma.adminUser.update({ where: { id: actor.id }, data: { passwordHash: await hash(next, 12), mustChangePassword: false } });
  await prisma.adminSession.updateMany({ where: { adminUserId: actor.id, id: { not: actor.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
  await auditAdmin(actor, "change_password", "admin_user", actor.id);
  redirect("/admin");
}
