import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE = "kn_admin";
const TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BASE_BLOCK_MS = 15 * 60 * 1000;
const MAX_BLOCK_MS = 24 * 60 * 60 * 1000;

export type AdminRole = "owner" | "manager" | "support";
export type AdminActor = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  mustChangePassword: boolean;
  sessionId: string;
  ipHash: string | null;
};

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is not set");
  return value;
}

function hash(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const hashAdminIp = (ip: string) => hash(`admin-ip:${ip}`);

export async function getAdminActor(): Promise<AdminActor | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const now = new Date();
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { adminUser: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.adminUser.active) return null;
  if (now.getTime() - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
    await prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
  }
  const role = session.adminUser.role as AdminRole;
  return { id: session.adminUser.id, email: session.adminUser.email, fullName: session.adminUser.fullName, role, mustChangePassword: session.adminUser.mustChangePassword, sessionId: session.id, ipHash: session.ipHash };
}

export async function isAdmin(): Promise<boolean> {
  return Boolean(await getAdminActor());
}

export async function requireAdmin(): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor) redirect("/admin/login");
  return actor;
}

export async function requireWriteAdmin(): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (actor.role === "support") redirect("/admin?error=forbidden");
  return actor;
}

export async function requireOwner(): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (actor.role !== "owner") redirect("/admin");
  return actor;
}

export async function startAdminSession(adminUserId: string, ip: string, userAgent: string | null): Promise<void> {
  const raw = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  await prisma.adminSession.create({ data: { adminUserId, tokenHash: tokenHash(raw), ipHash: hashAdminIp(ip), userAgent: userAgent?.slice(0, 500) || null, expiresAt } });
  (await cookies()).set(COOKIE, raw, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_SECONDS });
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.adminSession.updateMany({ where: { tokenHash: tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
  jar.delete(COOKIE);
}

export async function auditAdmin(actor: AdminActor, action: string, entityType: string, entityId?: string | null, metadata?: unknown): Promise<void> {
  await prisma.adminAuditLog.create({ data: { adminUserId: actor.id, action, entityType, entityId: entityId || null, metadataJson: metadata === undefined ? null : JSON.stringify(metadata), ipHash: actor.ipHash } });
}

function throttleKey(scope: "ip" | "account", value: string): string {
  return hash(`admin-login:${scope}:${value}`);
}

function throttleKeys(ip: string, emailNormalized: string): string[] {
  return [throttleKey("ip", ip), throttleKey("account", emailNormalized || "unknown")];
}

export async function loginAllowed(ip: string, emailNormalized: string): Promise<boolean> {
  const rows = await prisma.adminLoginThrottle.findMany({ where: { key: { in: throttleKeys(ip, emailNormalized) } } });
  const now = new Date();
  return rows.every((row) => !row.blockedUntil || row.blockedUntil <= now);
}

async function recordFailure(key: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const current = await tx.adminLoginThrottle.findUnique({ where: { key } });
    if (current?.blockedUntil && current.blockedUntil > now) return;
    const withinWindow = Boolean(current && now.getTime() - current.windowStartedAt.getTime() < WINDOW_MS);
    const failures = withinWindow && current ? current.failures + 1 : 1;
    if (failures >= MAX_FAILURES) {
      const level = (current?.blockLevel ?? 0) + 1;
      const duration = Math.min(BASE_BLOCK_MS * 2 ** Math.min(level - 1, 7), MAX_BLOCK_MS);
      await tx.adminLoginThrottle.upsert({ where: { key }, create: { key, failures: 0, blockLevel: level, windowStartedAt: now, blockedUntil: new Date(now.getTime() + duration) }, update: { failures: 0, blockLevel: level, windowStartedAt: now, blockedUntil: new Date(now.getTime() + duration) } });
      return;
    }
    await tx.adminLoginThrottle.upsert({ where: { key }, create: { key, failures, windowStartedAt: now }, update: { failures, windowStartedAt: withinWindow && current ? current.windowStartedAt : now, blockedUntil: null } });
  });
}

export async function recordFailedLogin(ip: string, emailNormalized: string): Promise<void> {
  await Promise.all(throttleKeys(ip, emailNormalized).map(recordFailure));
}

export async function clearFailedLogins(ip: string, emailNormalized: string): Promise<void> {
  await prisma.adminLoginThrottle.deleteMany({ where: { key: { in: throttleKeys(ip, emailNormalized) } } });
}
