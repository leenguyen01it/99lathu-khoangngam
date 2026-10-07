"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditAdmin, requireWriteAdmin } from "@/lib/admin";
import { normalizeEmail, normalizePhone, nullable } from "@/lib/customer-data";
import { prisma } from "@/lib/prisma";

function customerData(formData: FormData) {
  const fullName = nullable(formData.get("fullName"));
  const phone = nullable(formData.get("phone"));
  const email = nullable(formData.get("email"));
  return {
    fullName,
    phone,
    phoneNormalized: phone ? normalizePhone(phone) || null : null,
    email,
    emailNormalized: email ? normalizeEmail(email) || null : null,
    note: nullable(formData.get("note")),
    marketingOptIn: formData.get("marketingOptIn") === "on",
  };
}

export async function createCustomer(formData: FormData) {
  const actor = await requireWriteAdmin();
  const data = customerData(formData);
  if (!data.fullName && !data.phone && !data.email) redirect("/admin/customers/new?error=Nhập ít nhất tên, số điện thoại hoặc email");
  const customer = await prisma.customer.create({ data });
  await auditAdmin(actor, "create", "customer", customer.id);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  await prisma.customer.update({ where: { id }, data: customerData(formData) });
  await auditAdmin(actor, "update", "customer", id);
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

export async function setCustomerArchived(id: string, archived: boolean) {
  const actor = await requireWriteAdmin();
  await prisma.customer.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  await auditAdmin(actor, archived ? "archive" : "restore", "customer", id);
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

export async function addAddress(customerId: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  const address1 = String(formData.get("address1") ?? "").trim();
  if (!address1) return;
  const isDefault = formData.get("isDefault") === "on";
  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
    return tx.customerAddress.create({ data: {
      customerId,
      label: nullable(formData.get("label")),
      recipientName: nullable(formData.get("recipientName")),
      phone: nullable(formData.get("phone")),
      address1,
      address2: nullable(formData.get("address2")),
      ward: nullable(formData.get("ward")),
      district: nullable(formData.get("district")),
      province: nullable(formData.get("province")),
      postalCode: nullable(formData.get("postalCode")),
      countryCode: String(formData.get("countryCode") ?? "VN").trim().toUpperCase() || "VN",
      isDefault,
    } });
  });
  await auditAdmin(actor, "create", "customer_address", address.id, { customerId });
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function removeAddress(customerId: string, addressId: string) {
  const actor = await requireWriteAdmin();
  await prisma.customerAddress.deleteMany({ where: { id: addressId, customerId } });
  await auditAdmin(actor, "delete", "customer_address", addressId, { customerId });
  revalidatePath(`/admin/customers/${customerId}`);
}
