// Xuất 9 ảnh sản phẩm TikTok Shop (1200 × 1200, JPG) từ anh.html bằng Chrome headless.
// Chạy từ thư mục gốc dự án: node tiktok-shop/nguon/render.mjs
// Đặt CHROME_PATH nếu Chrome không nằm ở vị trí mặc định.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "anh");
const chrome = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const page = pathToFileURL(join(here, "anh.html")).href;

const names = [
  "01-anh-chinh",
  "02-hai-mat-the",
  "03-cach-dung",
  "04-la-thu",
  "05-moi-ngay-mot-la",
  "06-tuong-thich",
  "07-qua-tang",
  "08-hai-phien-ban",
  "09-ban-nhan-duoc",
];

mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "kn-tiktok-"));

for (const [i, name] of names.entries()) {
  const png = join(tmp, `${name}.png`);
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,1200",
    "--virtual-time-budget=8000",
    `--user-data-dir=${join(tmp, "profile")}`,
    `--screenshot=${png}`,
    `${page}#${i + 1}`,
  ], { stdio: "ignore" });
  await sharp(png).resize(1200, 1200, { fit: "cover", position: "top" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(join(out, `${name}.jpg`));
  console.log(`${name}.jpg`);
}

rmSync(tmp, { recursive: true, force: true });
