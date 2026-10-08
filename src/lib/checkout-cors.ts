import type { NextRequest } from "next/server";

export const checkoutOrigins = new Set(["https://khoangngam.com", "https://www.khoangngam.com", "https://99lathu.khoangngam.com"]);
if (process.env.NODE_ENV !== "production") {
  checkoutOrigins.add("http://localhost:3000");
  checkoutOrigins.add("http://localhost:8080");
}
export function checkoutCors(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return {
    ...(checkoutOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "Retry-After",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}
