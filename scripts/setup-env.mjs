// Tạo file .env với các khoá ngẫu nhiên nếu chưa có. Không ghi đè file đang có.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, ".env");

if (fs.existsSync(target)) {
  console.log(".env đã có, giữ nguyên.");
  process.exit(0);
}

const secret = () => crypto.randomBytes(32).toString("base64url");
const password = crypto.randomBytes(12).toString("base64url");

const content = fs
  .readFileSync(path.join(root, ".env.example"), "utf8")
  .replace('CARD_HASH_SECRET=""', `CARD_HASH_SECRET="${secret()}"`)
  .replace('SCAN_TOKEN_SECRET=""', `SCAN_TOKEN_SECRET="${secret()}"`)
  .replace('ADMIN_SESSION_SECRET=""', `ADMIN_SESSION_SECRET="${secret()}"`)
  .replace('ADMIN_PASSWORD=""', `ADMIN_PASSWORD="${password}"`);

fs.writeFileSync(target, content);
console.log("Đã tạo .env. Mật khẩu admin nằm ở dòng ADMIN_PASSWORD trong file đó, hãy đổi thành mật khẩu của bạn.");
