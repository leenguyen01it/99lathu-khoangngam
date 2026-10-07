import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/customer-data";

export type OrderListInput = {
  q: string;
  status: string;
  financial: string;
  fulfillment: string;
  sourceId: string;
  from: string;
  to: string;
  sort: "newest" | "oldest" | "total";
  page: number;
  pageSize: number;
};

function validDate(value: string, end = false): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function listOrders(input: OrderListInput) {
  const q = input.q.trim();
  const phone = normalizePhone(q);
  const from = validDate(input.from);
  const to = validDate(input.to, true);
  const where: Prisma.OrderWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.financial ? { financialStatus: input.financial } : {}),
    ...(input.fulfillment ? { fulfillmentStatus: input.fulfillment } : {}),
    ...(input.sourceId === "manual" ? { sourceId: null } : input.sourceId ? { sourceId: input.sourceId } : {}),
    ...((from || to) ? { placedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? { OR: [
      { orderNumber: { contains: q } },
      { customerName: { contains: q } },
      { phone: { contains: q } },
      ...(phone ? [{ phoneNormalized: { contains: phone } } as Prisma.OrderWhereInput] : []),
      { email: { contains: q } },
      { customer: { is: { fullName: { contains: q } } } },
    ] } : {}),
  };
  const orderBy: Prisma.OrderOrderByWithRelationInput = input.sort === "oldest" ? { createdAt: "asc" } : input.sort === "total" ? { totalAmount: "desc" } : { createdAt: "desc" };
  const [total, rows, sources] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { customer: true, source: true, _count: { select: { items: true, cards: true } } },
    }),
    prisma.syncSource.findMany({ where: { enabled: true }, orderBy: { name: "asc" } }),
  ]);
  return { total, rows, sources };
}

export function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      source: true,
      items: { orderBy: { createdAt: "asc" }, include: { cards: true } },
      cards: { orderBy: { assignedAt: "desc" } },
      cardAssignments: { orderBy: { createdAt: "desc" }, include: { card: true, customer: true } },
    },
  });
}

