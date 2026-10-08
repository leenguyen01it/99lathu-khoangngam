import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function consumeCheckoutLimit(scope: "ip" | "phone", value: string, limit: number, seconds: number) {
  const secret = process.env.CARD_HASH_SECRET;
  if (!secret) throw new Error("Checkout secret is missing");
  const key = createHmac("sha256", secret).update(`checkout:${scope}:${value}`).digest("hex");
  // PostgreSQL khóa hàng khi UPSERT; request đồng thời không thể vượt bộ đếm.
  const rows = await prisma.$queryRaw<Array<{ count: number; retryAfter: number }>>`
    INSERT INTO "CheckoutThrottle" ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "CheckoutThrottle"."expiresAt" <= NOW() THEN 1 ELSE LEAST("CheckoutThrottle"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "CheckoutThrottle"."expiresAt" <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "CheckoutThrottle"."expiresAt" END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW()))))::integer AS "retryAfter"
  `;
  const row = rows[0];
  if (!row) throw new Error("Checkout throttle returned no result");
  return { allowed: row.count <= limit, retryAfter: row.retryAfter };
}
