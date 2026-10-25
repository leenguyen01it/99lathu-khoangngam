const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/server/scans.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const today = "2026-10-25";
const token = "a".repeat(21);
const card = { id: "card-1", activatedAt: new Date(), currentN: 1, lastOpenedDay: today, openedToday: 1, dailyLimit: 1, voiceSpeed: 1.2 };
const session = { cardId: card.id, expiresAt: new Date(Date.now() + 60_000) };
const prisma = {
  $transaction: async (work) => work(prisma),
  scanSession: { findUnique: async () => session },
  card: {
    findUnique: async () => ({ ...card }),
    updateMany: async ({ where, data }) => {
      for (const [key, value] of Object.entries(where)) {
        if (key === "activatedAt") { if (!card.activatedAt) return { count: 0 }; }
        else if (card[key] !== value) return { count: 0 };
      }
      for (const [key, value] of Object.entries(data)) card[key] = typeof value === "object" && value !== null && "increment" in value ? card[key] + value.increment : value;
      return { count: 1 };
    },
  },
};
const moduleRef = { exports: {} };
new Function("require", "module", "exports", code)((name) => ({
  nanoid: { nanoid: () => "token" },
  "@/lib/prisma": { prisma },
  "@/lib/day": { dayKey: () => today },
  "@/lib/letters": { TOTAL_LETTERS: 99 },
})[name], moduleRef, moduleRef.exports);
const { setCardDailyLimit, setCardVoiceSpeed, openNextLetter } = moduleRef.exports;

test("raising the daily pace immediately opens the remaining letters for today", async () => {
  assert.equal(await setCardDailyLimit(token, 6), false);
  assert.equal(await setCardDailyLimit(token, 5), true);
  assert.equal(card.openedToday, 5);
  assert.equal(card.currentN, 5);
  assert.deepEqual(await openNextLetter(token), { ok: false, reason: "limit" });
});

test("lowering the limit keeps previously opened letters and stops additional opens", async () => {
  assert.equal(await setCardDailyLimit(token, 1), true);
  assert.deepEqual(await openNextLetter(token), { ok: false, reason: "limit" });
  assert.equal(card.currentN, 5);
});

test("voice speed accepts only supported values for an active card", async () => {
  assert.equal(await setCardVoiceSpeed(token, 2), false);
  assert.equal(await setCardVoiceSpeed(token, 1.3), true);
  assert.equal(card.voiceSpeed, 1.3);
});
