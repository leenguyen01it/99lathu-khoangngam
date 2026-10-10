import { NextResponse, type NextRequest } from "next/server";
import { dayKey } from "@/lib/day";
import { READER_COOKIE, READER_HEADER, isReaderId } from "@/lib/trial-reader";

const TRIAL_COOKIE = "kn_trial";

// Ghi lại ngày đầu tiên một người mở trang đọc thử, để mỗi ngày mở thêm một lá,
// và cấp một mã ẩn danh để đếm số người đọc thử.
export function middleware(req: NextRequest) {
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
  // Không tin header do trình duyệt gửi lên: chỉ middleware được đặt mã người đọc.
  const headers = new Headers(req.headers);
  headers.delete(READER_HEADER);
  const readerId = isReaderId(req.cookies.get(READER_COOKIE)?.value) ? null : crypto.randomUUID();
  if (readerId) headers.set(READER_HEADER, readerId);

  const res = NextResponse.next({ request: { headers } });
  if (!req.cookies.get(TRIAL_COOKIE)?.value) res.cookies.set(TRIAL_COOKIE, dayKey(), cookie);
  if (readerId) res.cookies.set(READER_COOKIE, readerId, cookie);
  return res;
}

export const config = { matcher: ["/doc-thu"] };
