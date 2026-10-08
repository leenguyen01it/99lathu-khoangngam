const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(relative, dependencies = {}) {
  const file = path.join(__dirname, "..", relative);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}

const { writeAndVerifyNfc } = load("src/lib/nfc-writer.ts");
const url = "https://cards.example/uid/" + "a".repeat(32);
const otherUrl = "https://cards.example/uid/" + "b".repeat(32);
const urlRecord = (value) => ({ recordType: "url", data: new DataView(new TextEncoder().encode(value).buffer) });

function fakeReader({ before = [], after = [urlRecord(url)], beforeSerial = "aa:bb", afterSerial = beforeSerial, scanError, writeError, wait = false } = {}) {
  let instance;
  class Reader extends EventTarget {
    writes = [];
    constructor() { super(); instance = this; }
    async scan({ signal }) {
      this.signal = signal;
      if (scanError) throw scanError;
      if (!wait) queueMicrotask(() => this.emit(before, beforeSerial));
    }
    async write(message, options) {
      this.writes.push({ message, options });
      if (writeError) throw writeError;
    }
    emit(records, serialNumber) {
      this.dispatchEvent(Object.assign(new Event("reading"), { serialNumber, message: { records } }));
    }
  }
  return { Reader, instance: () => instance, onStage: (stage) => {
    if (stage === "verifying") queueMicrotask(() => instance.emit(after, afterSerial));
  } };
}

test("write a blank chip and confirm a fresh read before reporting success", async () => {
  const fake = fakeReader();
  const stages = [];
  const result = await writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, (stage) => { stages.push(stage); fake.onStage(stage); });
  assert.deepEqual(stages, ["checking", "writing", "verifying"]);
  assert.deepEqual(result, { url, serialNumber: "aa:bb" });
  assert.deepEqual(fake.instance().writes[0].message, { records: [{ recordType: "url", data: url }] });
  assert.equal(fake.instance().writes[0].options.overwrite, false);
  assert.equal(fake.instance().signal.aborted, true);
});

test("factory empty records can be replaced", async () => {
  const fake = fakeReader({ before: [{ recordType: "empty" }] });
  await writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, fake.onStage);
  assert.equal(fake.instance().writes[0].options.overwrite, true);
});

test("an already matching chip is verified without rewriting", async () => {
  const fake = fakeReader({ before: [urlRecord(url)] });
  assert.equal((await writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, fake.onStage)).url, url);
  assert.equal(fake.instance().writes.length, 0);
});

test("reject other URLs and non-URL content without writing", async () => {
  for (const before of [[urlRecord(otherUrl)], [{ recordType: "text" }], [urlRecord(url), { recordType: "text" }]]) {
    const fake = fakeReader({ before });
    await assert.rejects(() => writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, fake.onStage), /dữ liệu khác/);
    assert.equal(fake.instance().writes.length, 0);
  }
});

test("verification rejects a different physical chip or wrong URL", async () => {
  for (const options of [{ afterSerial: "cc:dd" }, { after: [urlRecord(otherUrl)] }]) {
    const fake = fakeReader(options);
    await assert.rejects(() => writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, fake.onStage), /chip khác|chưa khớp/);
    assert.equal(fake.instance().signal.aborted, true);
  }
});

test("cancellation stops a pending NFC scan", async () => {
  const fake = fakeReader({ wait: true });
  const controller = new AbortController();
  const result = writeAndVerifyNfc(fake.Reader, url, controller.signal, fake.onStage);
  controller.abort();
  await assert.rejects(() => result, { name: "AbortError" });
  assert.equal(fake.instance().signal.aborted, true);
  assert.equal(fake.instance().writes.length, 0);
});

test("permission and write failures are returned and NFC is released", async () => {
  for (const options of [{ scanError: new DOMException("Denied", "NotAllowedError") }, { writeError: new Error("Locked chip") }]) {
    const fake = fakeReader(options);
    await assert.rejects(() => writeAndVerifyNfc(fake.Reader, url, new AbortController().signal, fake.onStage));
    assert.equal(fake.instance().signal.aborted, true);
  }
});

function serverFixture() {
  const cards = [{ id: "card-1", uid: "CCCCCCCCCCC2", uidHash: "a".repeat(32), activatedAt: null }, { id: "card-2", uid: "CCCCCCCCCCC3", uidHash: "b".repeat(32), activatedAt: null }];
  const logs = [];
  const batches = [{ id: "batch-1", createdAt: new Date("2026-10-08T07:30:00Z"), count: 2, uids: cards.map((card) => card.uid) }];
  const prisma = {
    card: { findUnique: async ({ where }) => cards.find((card) => card.uidHash === where.uidHash) ?? null },
    adminAuditLog: {
      findFirst: async ({ where }) => logs.find((log) => log.entityId === where.entityId) ?? null,
      findMany: async ({ where }) => logs.filter((log) => !where.entityId?.not || log.entityId !== where.entityId.not),
    },
  };
  const service = load("src/server/nfc-cards.ts", {
    "@/lib/prisma": { prisma }, "@/lib/crypto": { nfcUrl: (hash) => "https://cards.example/uid/" + hash },
    "./card-batches": { listCardBatches: async () => batches },
    "@/lib/admin": { auditAdmin: async (_actor, action, entityType, entityId, metadata) => logs.push({ action, entityType, entityId, metadataJson: JSON.stringify(metadata), createdAt: new Date() }) },
  });
  return { service, cards, logs };
}

test("resolve QR in print order and reject another batch or foreign URL", async () => {
  const { service } = serverFixture();
  assert.equal((await service.resolveNfcCard(otherUrl, "batch-1")).number, "KN002");
  await assert.rejects(() => service.resolveNfcCard(url, "wrong-batch"), /không thuộc đợt/);
  for (const invalid of [url.replace("cards.example", "foreign.example"), url + "?foo=bar", url + "#fragment", "javascript:alert(1)"]) {
    await assert.rejects(() => service.resolveNfcCard(invalid));
  }
});

test("progress persists, repeat verification counts once, and activation stays untouched", async () => {
  const { service, cards, logs } = serverFixture();
  const input = { cardId: "card-1", url, serialNumber: "AA:BB", batchId: "batch-1" };
  await service.recordNfcVerification({ id: "admin" }, input);
  await service.recordNfcVerification({ id: "admin" }, input);
  assert.equal(logs.length, 2);
  assert.deepEqual(await service.nfcProgress(), { "batch-1": 1 });
  assert.equal(cards[0].activatedAt, null);
  assert.equal((await service.resolveNfcCard(url)).verifiedAt !== null, true);
  await assert.rejects(() => service.recordNfcVerification({ id: "admin" }, { ...input, cardId: "card-2", url: otherUrl }), /thẻ khác/);
});

test("reject mismatched card ID and malformed chip serial without recording progress", async () => {
  const { service, logs } = serverFixture();
  await assert.rejects(() => service.recordNfcVerification({}, { cardId: "card-2", url, serialNumber: "aa:bb" }), /không khớp/);
  await assert.rejects(() => service.recordNfcVerification({}, { cardId: "card-1", url, serialNumber: "invalid" }), /không hợp lệ/);
  assert.equal(logs.length, 0);
});

test("API requires write permission and same-origin JSON requests", async () => {
  const fixture = serverFixture();
  let actor = null;
  const api = load("src/app/admin/nfc/api/route.ts", { "@/lib/admin": { getAdminActor: async () => actor }, "@/server/nfc-cards": fixture.service });
  const request = (body, origin = "https://cards.example") => new Request("https://cards.example/admin/nfc/api", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
  assert.equal((await api.POST(request({ operation: "resolve", url }))).status, 403);
  actor = { id: "admin", role: "support" };
  assert.equal((await api.POST(request({ operation: "resolve", url }))).status, 403);
  actor.role = "manager";
  assert.equal((await api.POST(request({ operation: "resolve", url }, "https://foreign.example"))).status, 403);
  assert.equal((await api.POST(request({ operation: "resolve", url }))).status, 200);
  assert.equal((await api.POST(request({ operation: "resolve", url: 123 }))).status, 400);
});
