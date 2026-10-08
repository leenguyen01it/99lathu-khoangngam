import { NextResponse } from "next/server";
import { dayKey } from "@/lib/day";

export const dynamic = "force-dynamic";

// Mở đủ bảy lá trên máy phát triển để kiểm tra nội dung và âm thanh.
export function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/doc-thu", request.url));
  response.cookies.set("kn_trial", dayKey(new Date(Date.now() - 6 * 86_400_000)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
