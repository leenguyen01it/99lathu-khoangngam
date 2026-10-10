// Chụp giao diện đọc thư thật của app (trang /doc-thu) ở khổ điện thoại 390 × 750, để ghép vào ảnh sản phẩm.
// Cần app đang chạy: npx next dev -p 3111, rồi: node tiktok-shop/nguon/chup-man-hinh.mjs
// Ra ba file cạnh script: man-hinh-bia.png (bìa sách lúc vừa chạm thẻ), man-hinh-thu.png (lá thư đã mở)
// và man-hinh-tang.png (lời nhắn của người tặng).
// Ẩn huy hiệu dev của Next và khối mời mua của trang đọc thử, vì người dùng thẻ thật không thấy hai thứ đó.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const url = process.env.APP_URL || "http://localhost:3111/doc-thu";
const port = 9333;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const profile = mkdtempSync(join(tmpdir(), "kn-chup-"));
const browser = spawn(chrome, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error("Không kết nối được Chrome.");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});
const send = (method, params = {}) => new Promise((resolve) => {
  pending.set(++id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});

const hide = "nextjs-portal, .book ~ * { display: none !important; }";
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 750, deviceScaleFactor: 3, mobile: true });
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.id = "kn-hide"; s.textContent = ${JSON.stringify(hide)}; document.head.append(s); });`,
});

const shot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(here, name), Buffer.from(data, "base64"));
  console.log(name);
};
const waitFor = async (expression) => {
  for (let i = 0; i < 200; i++) {
    if ((await send("Runtime.evaluate", { expression })).result?.value) return;
    await sleep(50);
  }
  throw new Error("Trang chưa hiện: " + expression);
};

// Lượt 1: dừng mọi animation ở khung đầu để chụp bìa sách trước khi lật.
await send("Page.navigate", { url });
await waitFor(`!!document.querySelector(".book__cover") && document.fonts.status === "loaded"`);
await send("Runtime.evaluate", { expression: `document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; })` });
await sleep(300);
await shot("man-hinh-bia.png");

// Lượt 2: để bìa lật xong và chữ hiện đủ rồi chụp lá thư.
await send("Page.navigate", { url });
await waitFor(`!!document.querySelector(".book article") && document.fonts.status === "loaded"`);
await sleep(7000);
await shot("man-hinh-thu.png");

// Lượt 3: màn hình lời nhắn tặng. Trang thật cần một thẻ có lời nhắn trong cơ sở dữ liệu, nên ở đây dựng lại
// đúng markup của GiftBook.tsx (Page và thanh "Lời mở đầu") trên trang đang mở, dùng chính CSS của app.
// LỜI NHẮN LÀ VÍ DỤ. Sửa GiftBook.tsx thì sửa cả đoạn markup này.
const gift = {
  message: ["Chúc mừng sinh nhật em.", "Chị mong 99 ngày tới, sáng nào em cũng có một phút dịu dàng với chính mình. Cứ đi chậm thôi, chị luôn ở đây."],
  from: "Chị của em",
};
const arrow = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;
const giftHtml = `<div class="book"><div class="book__back"></div><div class="book__pages"></div>
<article class="flex flex-col bg-paper px-6 py-7 text-ink"><div class="pager"><div class="pager__flow">
<header class="break-inside-avoid pb-5"><h1 class="text-[22px] font-bold leading-tight">Có một lá thư gửi riêng cho bạn</h1><div aria-hidden="true" class="mt-1 h-0.5 w-12 rounded-full bg-deep/60"></div></header>
${gift.message.map((p, i) => `<p class="whitespace-pre-line break-words font-serif text-[18px] leading-[1.75] ${i > 0 ? "mt-[1.75em]" : ""}">${p}</p>`).join("")}
<p class="break-inside-avoid break-words pt-6 text-right font-serif text-[16px] italic text-deep">${gift.from}</p>
</div></div></article></div>
<div class="mt-4"><nav class="flex items-center justify-between gap-3"><button type="button" class="btn-ghost" disabled>${arrow("m15 18-6-6 6-6")}</button><span class="text-[14px] text-sage">Lời mở đầu · 1/1</span><button type="button" class="btn-ghost">${arrow("m9 6 6 6-6 6")}</button></nav></div>`;
await send("Runtime.evaluate", { expression: `(() => {
  document.getElementById("kn-hide").textContent = "nextjs-portal { display: none !important; }";
  const main = document.querySelector("main");
  const head = main.firstElementChild;
  head.querySelector(".ml-auto")?.remove();
  while (head.nextSibling) head.nextSibling.remove();
  head.insertAdjacentHTML("afterend", ${JSON.stringify(giftHtml)});
})()` });
await sleep(800);
await shot("man-hinh-tang.png");

ws.close();
browser.kill();
await sleep(500);
rmSync(profile, { recursive: true, force: true });
