const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const code = ts.transpileModule(fs.readFileSync("src/lib/checkout.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
new Function("require", "exports", "module", code)(require, loaded.exports, loaded);
const { parseCheckout } = loaded.exports;
const valid = { requestId: "12345678-1234-4123-8123-123456789abc", customerName: "Người nhận", phone: "0901234567", address: "12 đường A", provinceCode: 1, wardCode: 4, sku: "card", quantity: 2 };
test("giá do máy chủ tính, bỏ qua giá khách gửi", () => {
  assert.equal(parseCheckout({ ...valid, totalAmount: 1, unitAmount: 1 }).totalAmount, 338000);
  assert.equal(parseCheckout({ ...valid, sku: "gift" }).totalAmount, 498000);
});
test("đơn hỗn hợp tính giá từng loại và chặn số lượng sai", () => {
  const items = [{ sku: "card", quantity: 1 }, { sku: "gift", quantity: 1 }];
  const order = parseCheckout({ ...valid, items, totalAmount: 1 });
  assert.equal(order.totalAmount, 418000);
  assert.deepEqual(order.items.map(i => i.totalAmount), [169000, 249000]);
  for (const bad of [[], null, [{ sku: "fake", quantity: 1 }], [{ sku: "card", quantity: 0 }], [{ sku: "card", quantity: 1.5 }], [{ sku: "card", quantity: "1" }], [{ sku: "card", quantity: 1 }, { sku: "card", quantity: 2 }], [{ sku: "card", quantity: 20 }, { sku: "gift", quantity: 1 }]]) assert.throws(() => parseCheckout({ ...valid, items: bad }));
});
test("từ chối dữ liệu thiếu, sản phẩm lạ và số lượng ngoài giới hạn", () => {
  for (const patch of [{ customerName: "" }, { phone: "123" }, { address: "abc" }, { provinceCode: "1" }, { wardCode: 0 }, { sku: "fake" }, { quantity: 0 }, { quantity: 21 }, { quantity: 1.5 }, { quantity: "2" }, { requestId: "bad" }, { website: "spam" }, { note: "x".repeat(1001) }]) assert.throws(() => parseCheckout({ ...valid, ...patch }));
  assert.throws(() => parseCheckout(null));
});
test("hỗ trợ số điện thoại +84 và loại bỏ khoảng trắng thừa", () => {
  assert.equal(parseCheckout({ ...valid, customerName: "  Lan  ", phone: "+84 901 234 567" }).customerName, "Lan");
  assert.equal(parseCheckout({ ...valid, phone: "84901234567" }).phone, "+84901234567");
  for (const phone of ["0101234567", "02412345678", "+12025550123", "090123456", "09012345678", "call 0901234567"]) assert.throws(() => parseCheckout({ ...valid, phone }), phone);
});

test("API lưu đơn và trả lại mã cũ khi gửi lại, chặn origin ngoài", async () => {
  const { NextRequest } = require("next/server");
  let saved, created = 0;
  const db = {
    syncSource: { upsert: async () => ({ id: "landing", enabled: true }) },
    order: { findUnique: async () => saved, count: async () => 0 },
    $transaction: async (callback) => callback({
      customer: { create: async () => ({ id: "customer" }) },
      order: { create: async ({ data }) => { saved = data; created++; } },
    }),
  };
  const routeCode = ts.transpileModule(fs.readFileSync("src/app/api/orders/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const dependencies = { "@/lib/prisma": { prisma: db }, "@/lib/checkout": loaded.exports, "@/lib/customer-data": { normalizePhone: () => "84901234567" },
    "@/lib/checkout-cors": { checkoutCors: () => ({}), checkoutOrigins: new Set(["https://khoangngam.com"]) },
    "@/lib/request": { getClientIp: () => "1.2.3.4" },
    "@/server/checkout-throttle": { consumeCheckoutLimit: async () => ({ allowed: true }) },
    "@/server/locations": { resolveAddress: async () => ({ province: "Hà Nội", ward: "Ba Đình", provinceCode: 1, wardCode: 4 }) },
  };
  new Function("require", "exports", "module", routeCode)((name) => dependencies[name] || require(name), module.exports, module);
  const mixed = { ...valid, items: [{ sku: "card", quantity: 1 }, { sku: "gift", quantity: 1 }] };
  const req = (origin) => new NextRequest("https://99lathu.khoangngam.com/api/orders", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(mixed) });
  assert.equal((await module.exports.POST(req("https://other.example"))).status, 403);
  assert.equal((await module.exports.POST(req("https://khoangngam.com"))).status, 201);
  assert.equal(saved.totalAmount, 418000);
  assert.deepEqual(saved.items.create.map(i => [i.sku, i.quantity, i.totalAmount]), [["card", 1, 169000], ["gift", 1, 249000]]);
  assert.equal(saved.status, "pending");
  assert.equal(JSON.parse(saved.shippingAddressJson).address1, valid.address);
  const retry = await module.exports.POST(req("https://khoangngam.com"));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).orderNumber, saved.orderNumber);
  assert.equal(created, 1);
});

function routeWith(overrides = {}) {
  const dependencies = {
    "@/lib/prisma": { prisma: { syncSource: { upsert: async () => ({ id: "landing", enabled: true }) }, order: { findUnique: async () => null, findFirst: async () => null }, $transaction: async () => { throw new Error("Không được ghi đơn trong case bị chặn"); } } },
    "@/lib/checkout": loaded.exports,
    "@/lib/customer-data": { normalizePhone: value => value.replace(/\D/g, "") },
    "@/lib/checkout-cors": { checkoutCors: () => ({}), checkoutOrigins: new Set(["https://khoangngam.com"]) },
    "@/lib/request": { getClientIp: () => "1.2.3.4" },
    "@/server/checkout-throttle": { consumeCheckoutLimit: async () => ({ allowed: true }) },
    "@/server/locations": { resolveAddress: async () => null },
    ...overrides,
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync("src/app/api/orders/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", "module", code)(name => dependencies[name] || require(name), module.exports, module);
  return module.exports;
}
const request = (data = valid) => new (require("next/server").NextRequest)("https://99lathu.khoangngam.com/api/orders", { method: "POST", headers: { origin: "https://khoangngam.com", "Content-Type": "application/json" }, body: JSON.stringify(data) });

test("spam IP bị chặn trước khi đọc dữ liệu; phone limit trả Retry-After", async () => {
  for (const denied of ["ip", "phone"]) {
    const calls = [];
    const route = routeWith({ "@/server/checkout-throttle": { consumeCheckoutLimit: async scope => { calls.push(scope); return { allowed: scope !== denied, retryAfter: 45 }; } } });
    const response = await route.POST(request());
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "45");
    assert.deepEqual(calls, denied === "ip" ? ["ip"] : ["ip", "phone"]);
  }
});
test("địa chỉ sai tỉnh bị từ chối; upstream lỗi không ghi đơn", async () => {
  assert.equal((await routeWith().POST(request())).status, 400);
  const route = routeWith({ "@/server/locations": { resolveAddress: async () => { throw new Error("API unavailable"); } } });
  assert.equal((await route.POST(request())).status, 503);
});
test("payload lớn bị chặn cả khi không có Content-Length", async () => {
  assert.equal((await routeWith().POST(request({ ...valid, note: "x".repeat(7000) }))).status, 413);
});
test("database throttle lỗi thì ngừng nhận đơn", async () => {
  const route = routeWith({ "@/server/checkout-throttle": { consumeCheckoutLimit: async () => { throw new Error("DB down"); } } });
  assert.equal((await route.POST(request())).status, 503);
});
