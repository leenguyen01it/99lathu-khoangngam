import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/customer-data";

export type CustomerListInput = {
  q: string;
  archived: "active" | "archived" | "all";
  sort: "recent" | "name" | "orders";
  page: number;
  pageSize: number;
};

export async function listCustomers(input: CustomerListInput) {
  const q = input.q.trim();
  const phone = normalizePhone(q);
  const email = normalizeEmail(q);
  const where: Prisma.CustomerWhereInput = {
    ...(input.archived === "active" ? { archivedAt: null } : input.archived === "archived" ? { archivedAt: { not: null } } : {}),
    ...(q ? {
      OR: [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        ...(phone ? [{ phoneNormalized: { contains: phone } } as Prisma.CustomerWhereInput] : []),
        { emailNormalized: { contains: email } },
      ],
    } : {}),
  };
  const orderBy: Prisma.CustomerOrderByWithRelationInput =
    input.sort === "name" ? { fullName: "asc" } : input.sort === "orders" ? { orders: { _count: "desc" } } : { updatedAt: "desc" };
  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { _count: { select: { cards: true, orders: true } } },
    }),
  ]);
  return { total, rows };
}

export function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] },
      cards: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: [{ placedAt: "desc" }, { createdAt: "desc" }], take: 100 },
      externalLinks: { include: { source: true }, orderBy: { updatedAt: "desc" } },
    },
  });
}

