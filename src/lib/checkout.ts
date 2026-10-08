import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const PRODUCTS = [
  { sku: "card", name: "Bản thẻ", unitAmount: 169000 },
  { sku: "gift", name: "Bản quà tặng", unitAmount: 249000 },
] as const;

export function parseCheckout(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Thông tin đặt hàng không hợp lệ.");
  const data = input as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = typeof data[key] === "string" ? data[key].trim() : "";
    if ((required && !value) || value.length > max) throw new Error("Vui lòng kiểm tra thông tin đặt hàng.");
    return value;
  };
  const requestId = text("requestId", 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("Vui lòng tải lại trang rồi thử lại.");
  const customerName = text("customerName", 100, true);
  const phone = text("phone", 24, true);
  const compact = phone.replace(/[\s.-]/g, "");
  const parsedPhone = /^(?:0|\+?84)\d+$/.test(compact) ? parsePhoneNumberFromString(compact.startsWith("84") ? `+${compact}` : compact, "VN") : undefined;
  if (!parsedPhone || parsedPhone.country !== "VN" || !parsedPhone.isValid() || parsedPhone.getType() !== "MOBILE") throw new Error("Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.");
  const address = text("address", 300, true);
  if (address.length < 5) throw new Error("Vui lòng nhập số nhà và tên đường/thôn.");
  const provinceCode = data.provinceCode;
  const wardCode = data.wardCode;
  if (typeof provinceCode !== "number" || !Number.isInteger(provinceCode) || provinceCode < 1 || provinceCode > 999 || typeof wardCode !== "number" || !Number.isInteger(wardCode) || wardCode < 1 || wardCode > 99999) throw new Error("Vui lòng chọn tỉnh/thành và phường/xã.");
  const note = text("note", 1000);
  if (text("website", 200)) throw new Error("Thông tin đặt hàng không hợp lệ.");
  const product = PRODUCTS.find((item) => item.sku === data.sku);
  const quantity = data.quantity;
  if (!product || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("Vui lòng chọn phiên bản và số lượng từ 1 đến 20.");
  return { requestId, customerName, phone: parsedPhone.number, address, provinceCode, wardCode, note, product, quantity, totalAmount: product.unitAmount * quantity };
}
