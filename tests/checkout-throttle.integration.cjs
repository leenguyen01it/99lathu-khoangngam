// Chạy bằng node --env-file=.env --test tests/checkout-throttle.integration.cjs.
// Chỉ dùng database local; tạo và xóa bảng thử riêng, không ghi đơn hoặc khách hàng.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

test("PostgreSQL: 30 request đồng thời chỉ 10 request qua, reset sau hết hạn", async () => {
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL).hostname), "Integration test chỉ chạy trên database local");
  const prisma = new PrismaClient();
  const table = "CheckoutThrottle_test_" + randomBytes(8).toString("hex");
  const previous = process.env.CARD_HASH_SECRET;
  process.env.CARD_HASH_SECRET = "checkout-test-secret";
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE "${table}" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL)`);
    const adapter = { $queryRaw: (parts, ...values) => {
      const mapped = parts.map(part => part.replaceAll('"CheckoutThrottle"', `"${table}"`));
      mapped.raw = [...mapped];
      return prisma.$queryRaw(mapped, ...values);
    } };
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync("src/server/checkout-throttle.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("require", "exports", "module", code)(name => name === "@/lib/prisma" ? { prisma: adapter } : require(name), module.exports, module);
    const consume = module.exports.consumeCheckoutLimit;
    const results = await Promise.all(Array.from({ length: 30 }, () => consume("ip", "192.0.2.1", 10, 60)));
    assert.equal(results.filter(result => result.allowed).length, 10);
    assert.ok(results.every(result => result.retryAfter > 0));
    assert.equal((await consume("ip", "192.0.2.2", 10, 60)).allowed, true);
    const phones = await Promise.all(Array.from({ length: 10 }, () => consume("phone", "84901234567", 3, 3600)));
    assert.equal(phones.filter(result => result.allowed).length, 3);
    await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "expiresAt" = NOW() - INTERVAL '1 second'`);
    assert.equal((await consume("ip", "192.0.2.1", 10, 60)).allowed, true);
    const rows = await prisma.$queryRawUnsafe(`SELECT "key" FROM "${table}"`);
    assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.key)));
  } finally {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}"`);
    await prisma.$disconnect();
    if (previous === undefined) delete process.env.CARD_HASH_SECRET; else process.env.CARD_HASH_SECRET = previous;
  }
});
