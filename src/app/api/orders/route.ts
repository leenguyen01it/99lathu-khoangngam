import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/customer-data";
import { parseCheckout, PRODUCTS } from "@/lib/checkout";
import { checkoutCors as cors, checkoutOrigins as origins } from "@/lib/checkout-cors";
import { getClientIp } from "@/lib/request";
import { consumeCheckoutLimit } from "@/server/checkout-throttle";
import { resolveAddress } from "@/server/locations";

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: origins.has(req.headers.get("origin") || "") ? 204 : 403, headers: cors(req) });
}
export function GET(req: NextRequest) {
  return NextResponse.json({ products: PRODUCTS, shippingAmount: 0 }, { headers: cors(req) });
}
export async function POST(req: NextRequest) {
  const headers = cors(req);
  const reply = (body: object, status: number) => NextResponse.json(body, { status, headers });
  if (!origins.has(req.headers.get("origin") || "")) return reply({ error: "Nguồn đặt hàng không hợp lệ." }, 403);
  try {
    const limit = await consumeCheckoutLimit("ip", getClientIp(req.headers), 10, 60);
    if (!limit.allowed) return NextResponse.json({ error: "Bạn gửi yêu cầu quá nhanh. Vui lòng chờ một chút rồi thử lại." }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
  } catch { return reply({ error: "Tạm thời chưa thể nhận đơn. Bạn thử lại sau nhé." }, 503); }
  if (!req.headers.get("content-type")?.includes("application/json")) return reply({ error: "Dữ liệu không hợp lệ." }, 415);
  let order;
  try {
    if (Number(req.headers.get("content-length")) > 6000) return reply({ error: "Thông tin đặt hàng quá dài." }, 413);
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "Dữ liệu không hợp lệ." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 6000) { await reader.cancel(); return reply({ error: "Thông tin đặt hàng quá dài." }, 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const body = Buffer.concat(chunks).toString("utf8");
    order = parseCheckout(JSON.parse(body));
  } catch (error) {
    return reply({ error: error instanceof SyntaxError ? "Dữ liệu không hợp lệ." : error instanceof Error ? error.message : "Dữ liệu không hợp lệ." }, 400);
  }
  try {
    const source = await prisma.syncSource.upsert({ where: { key: "landing" }, create: { key: "landing", name: "Website Khoảng Ngẫm", kind: "website" }, update: {} });
    if (!source.enabled) return reply({ error: "Tạm ngừng nhận đơn. Bạn vui lòng nhắn Khoảng Ngẫm nhé." }, 503);
    const existing = await prisma.order.findUnique({ where: { sourceId_externalId: { sourceId: source.id, externalId: order.requestId } } });
    if (existing) return reply({ orderNumber: existing.orderNumber }, 200);
    const phoneNormalized = normalizePhone(order.phone);
    const limit = await consumeCheckoutLimit("phone", phoneNormalized, 3, 3600);
    if (!limit.allowed) return NextResponse.json({ error: "Bạn đã gửi nhiều đơn. Vui lòng chờ shop liên hệ xác nhận." }, { status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfter) } });
    const location = await resolveAddress(order.provinceCode, order.wardCode);
    if (!location) return reply({ error: "Phường/xã không thuộc tỉnh/thành đã chọn. Vui lòng kiểm tra lại." }, 400);
    const orderNumber = `KN-${order.requestId.toUpperCase()}`;
    const email = order.email || null;
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { fullName: order.customerName, phone: order.phone, phoneNormalized,
        email, emailNormalized: email && normalizeEmail(email),
        addresses: { create: { recipientName: order.customerName, phone: order.phone, address1: order.address, province: location.province, ward: location.ward, isDefault: true } } } });
      await tx.order.create({ data: {
        sourceId: source.id, externalId: order.requestId, orderNumber, customerId: customer.id,
        customerName: order.customerName, phone: order.phone, phoneNormalized, email,
        shippingAddressJson: JSON.stringify({ recipientName: order.customerName, phone: order.phone, address1: order.address, ...location, countryCode: "VN" }),
        note: order.note || null, status: "pending", financialStatus: "pending", fulfillmentStatus: "unfulfilled",
        subtotalAmount: order.totalAmount, totalAmount: order.totalAmount, shippingAmount: 0, placedAt: new Date(),
        items: { create: order.items.map(({ product, quantity, totalAmount }) => ({ name: "99 ngày thương mình", sku: product.sku, variantName: product.name,
          quantity, unitAmount: product.unitAmount, totalAmount })) },
      } });
    });
    return reply({ orderNumber }, 201);
  } catch {
    // Một lần thử lại song song có thể đã tạo đơn với cùng requestId.
    const existing = await prisma.order.findFirst({ where: { source: { key: "landing" }, externalId: order.requestId }, select: { orderNumber: true } }).catch(() => null);
    if (existing) return reply({ orderNumber: existing.orderNumber }, 200);
    return reply({ error: "Chưa thể nhận đơn lúc này. Bạn vui lòng thử lại sau." }, 503);
  }
}
