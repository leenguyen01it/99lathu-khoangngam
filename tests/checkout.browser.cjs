// PLAYWRIGHT_PATH trỏ tới package Playwright nếu được cài ngoài repository.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

(async () => {
  const province = await fetch("https://provinces.open-api.vn/api/v2/p/1?depth=2").then(r => r.json());
  const server = http.createServer((req, res) => {
    const script = req.url === "/checkout.js";
    res.setHeader("Content-Type", script ? "text/javascript" : "text/html; charset=utf-8");
    res.end(fs.readFileSync(script ? "landing/checkout.js" : "landing/index.html"));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const submitted = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("https://99lathu.khoangngam.com/api/**", async route => {
        const request = route.request();
        let body;
        if (request.method() === "POST") { submitted.push(request.postDataJSON()); body = { orderNumber: "KN-BROWSER-TEST" }; }
        else if (request.url().includes("locations?")) body = { wards: province.wards };
        else if (request.url().includes("locations")) body = { provinces: [{ code: province.code, name: province.name }] };
        else body = { products: [{ sku: "card", name: "Bản thẻ", unitAmount: 169000 }, { sku: "gift", name: "Bản quà tặng", unitAmount: 249000 }] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(body), headers: { "Access-Control-Allow-Origin": "*" } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/#dat-hang`);
      await page.locator('.loader').waitFor({ state: "hidden" });
      await page.locator('[name="provinceCode"]').selectOption("1");
      await page.locator('[name="wardCode"]').selectOption(String(province.wards[0].code));
      assert.equal(await page.locator('#mixed-quantities').isVisible(), false);
      assert.equal(await page.locator('[name="quantity"]').isVisible(), true);
      assert.ok((await page.locator('#order-total').innerText()).includes("169.000"));
      await page.locator('.checkout-plan').filter({ has: page.locator('[value="gift"]') }).click();
      await page.locator('[name="quantity"]').fill("2");
      assert.ok((await page.locator('#order-total').innerText()).includes("498.000"));
      await page.locator('#buy-both').check();
      assert.equal(await page.locator('[name="quantity"]').isDisabled(), true);
      assert.equal(await page.locator('#mixed-quantities').isVisible(), true);
      await page.locator('[name="quantity_card"]').fill("1");
      await page.locator('[name="quantity_gift"]').fill("1");
      assert.ok((await page.locator('#order-total').innerText()).includes("418.000"));
      await page.locator('#buy-both').uncheck();
      assert.ok((await page.locator('#order-total').innerText()).includes("498.000"));
      await page.locator('#buy-both').check();
      await page.locator('[name="customerName"]').fill("Người thử giao diện");
      await page.locator('[name="phone"]').fill("123");
      await page.locator('[name="address"]').fill("12 Nguyễn Văn A");
      assert.equal(await page.locator('#error-phone').isVisible(), true);
      await page.locator('[name="phone"]').focus();
      assert.equal(await page.locator('#error-phone').isVisible(), false);
      await page.locator('[name="address"]').focus();
      assert.equal(await page.locator('#error-phone').isVisible(), true);
      await page.locator('#order-submit').click();
      assert.equal(submitted.length, width === 1440 ? 0 : 1);
      await page.locator('[name="phone"]').fill("0901234567");
      assert.ok((await page.locator('#order-total').innerText()).includes("418.000"));
      assert.equal(await page.locator('#error-phone').isVisible(), false);
      await page.locator('[name="quantity_card"]').fill("20");
      await page.locator('[name="address"]').focus();
      assert.equal(await page.locator('#items-error').isVisible(), true);
      await page.locator('#order-submit').click();
      assert.equal(submitted.length, width === 1440 ? 0 : 1);
      await page.locator('[name="quantity_card"]').fill("1");
      await page.locator('#order-form').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(os.tmpdir(), `khoangngam-checkout-${width}.png`), fullPage: false });
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(document.getElementById("order-form")).gridTemplateColumns }));
      assert.equal(layout.overflow, false, `Horizontal overflow at ${width}px`);
      await page.locator('#order-submit').click();
      await page.locator('#order-success').waitFor({ state: "visible" });
      assert.equal(await page.locator('#order-form').isVisible(), false);
      assert.equal(submitted.at(-1).provinceCode, 1);
      assert.equal(submitted.at(-1).wardCode, province.wards[0].code);
      assert.deepEqual(submitted.at(-1).items, [{ sku: "card", quantity: 1 }, { sku: "gift", quantity: 1 }]);
      assert.deepEqual(errors, []);
      console.log(`Browser ${width}px passed: address, price, phone validation, submit, success, no overflow`);
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
