"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditAdmin, requireWriteAdmin } from "@/lib/admin";
import { moneyInput, normalizePhone, nullable } from "@/lib/customer-data";
import { normalizeUid } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

function dateOrNull(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function orderData(formData: FormData) {
  const phone = nullable(formData.get("phone"));
  return {
    orderNumber: nullable(formData.get("orderNumber")),
    customerId: nullable(formData.get("customerId")),
    status: String(formData.get("status") ?? "pending"),
    financialStatus: nullable(formData.get("financialStatus")),
    fulfillmentStatus: nullable(formData.get("fulfillmentStatus")),
    currency: String(formData.get("currency") ?? "VND").trim().toUpperCase() || "VND",
    subtotalAmount: moneyInput(formData.get("subtotalAmount")),
    discountAmount: moneyInput(formData.get("discountAmount")),
    shippingAmount: moneyInput(formData.get("shippingAmount")),
    taxAmount: moneyInput(formData.get("taxAmount")),
    totalAmount: moneyInput(formData.get("totalAmount")),
    customerName: nullable(formData.get("customerName")),
    phone,
    phoneNormalized: phone ? normalizePhone(phone) || null : null,
    email: nullable(formData.get("email")),
    note: nullable(formData.get("note")),
    placedAt: dateOrNull(formData.get("placedAt")),
  };
}

export async function createOrder(formData: FormData) {
  const actor = await requireWriteAdmin();
  const data = orderData(formData);
  const order = await prisma.order.create({ data });
  await auditAdmin(actor, "create", "order", order.id);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${order.id}`);
}

export async function updateOrder(id: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  await prisma.order.update({ where: { id }, data: orderData(formData) });
  await auditAdmin(actor, "update", "order", id);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function addOrderItem(orderId: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const quantity = Math.max(1, Math.floor(Number(formData.get("quantity") ?? 1) || 1));
  const item = await prisma.orderItem.create({ data: {
    orderId,
    name,
    sku: nullable(formData.get("sku")),
    variantName: nullable(formData.get("variantName")),
    quantity,
    unitAmount: moneyInput(formData.get("unitAmount")),
    totalAmount: moneyInput(formData.get("totalAmount")),
  } });
  await auditAdmin(actor, "create", "order_item", item.id, { orderId });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const actor = await requireWriteAdmin();
  await prisma.orderItem.deleteMany({ where: { id: itemId, orderId, cards: { none: {} } } });
  await auditAdmin(actor, "delete", "order_item", itemId, { orderId });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function assignCard(orderId: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  const uid = normalizeUid(String(formData.get("uid") ?? ""));
  const orderItemId = nullable(formData.get("orderItemId"));
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
  const card = await prisma.card.findUnique({ where: { uid }, select: { id: true, customerId: true, orderId: true } });
  if (!order || !card) return;
  const action = card.orderId || card.customerId ? "reassigned" : "assigned";
  await prisma.$transaction([
    prisma.card.update({ where: { id: card.id }, data: { customerId: order.customerId, orderId, orderItemId, assignedAt: new Date() } }),
    prisma.cardAssignment.create({ data: { cardId: card.id, customerId: order.customerId, orderId, orderItemId, action } }),
  ]);
  await auditAdmin(actor, action, "card", card.id, { orderId, customerId: order.customerId, orderItemId });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}

export async function unassignCard(orderId: string, cardId: string) {
  const actor = await requireWriteAdmin();
  const card = await prisma.card.findFirst({ where: { id: cardId, orderId }, select: { customerId: true, orderItemId: true } });
  if (!card) return;
  await prisma.$transaction([
    prisma.card.update({ where: { id: cardId }, data: { customerId: null, orderId: null, orderItemId: null, assignedAt: null } }),
    prisma.cardAssignment.create({ data: { cardId, customerId: card.customerId, orderId, orderItemId: card.orderItemId, action: "unassigned" } }),
  ]);
  await auditAdmin(actor, "unassigned", "card", cardId, { orderId });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}
