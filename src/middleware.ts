import { NextResponse, type NextRequest } from "next/server";
import { dayKey } from "@/lib/day";

const TRIAL_COOKIE = "kn_trial";

// Ghi lại ngày đầu tiên một người mở trang đọc thử, để mỗi ngày mở thêm một lá.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(TRIAL_COOKIE)?.value) {
    res.cookies.set(TRIAL_COOKIE, dayKey(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = { matcher: ["/doc-thu"] };
