import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// ---------------------------------------------------------------
// UID và hash của thẻ
// ---------------------------------------------------------------
// UID in trên thẻ: 12 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/I).
const UID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateCardUid(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += UID_ALPHABET.charAt((bytes[i] ?? 0) % UID_ALPHABET.length);
  }
  return out;
}

export function normalizeUid(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

// uidHash = 32 ký tự hex đầu của HMAC-SHA256(uid, CARD_HASH_SECRET).
// Không đoán ngược được, và ổn định nên ghi thẳng vào thẻ NFC.
export function computeUidHash(uid: string): string {
  return crypto
    .createHmac("sha256", requireEnv("CARD_HASH_SECRET"))
    .update(uid)
    .digest("hex")
    .slice(0, 32);
}

export function nfcUrl(uidHash: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/uid/${uidHash}`;
}

// Link viet loi tang rieng cho tung the. Card id giup tim ban ghi, chu ky ngan
// chan nguoi dung sua URL de viet vao mot the khac.
function giftSignature(cardId: string): string {
  return crypto
    .createHmac("sha256", requireEnv("CARD_HASH_SECRET"))
    .update(`gift:${cardId}`)
    .digest("hex")
    .slice(0, 32);
}

export function giftToken(cardId: string): string {
  return `${cardId}.${giftSignature(cardId)}`;
}

export function cardIdFromGiftToken(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const cardId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = giftSignature(cardId);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? cardId : null;
}

export function giftUrl(cardId: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/tang/${giftToken(cardId)}`;
}

// ---------------------------------------------------------------
// JWT ngắn hạn: phiên admin
// ---------------------------------------------------------------
const key = (envName: string) => new TextEncoder().encode(requireEnv(envName));

export async function signAdminToken(ttlSeconds: number): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key("ADMIN_SESSION_SECRET"));
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, key("ADMIN_SESSION_SECRET"), {
      algorithms: ["HS256"],
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

// So sánh mật khẩu không lộ thời gian
export function passwordMatches(input: string): boolean {
  const expected = requireEnv("ADMIN_PASSWORD");
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
