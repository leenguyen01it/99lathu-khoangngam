import { NextRequest, NextResponse } from "next/server";
import { checkoutCors } from "@/lib/checkout-cors";
import { getProvince, getProvinces } from "@/server/locations";

export async function GET(req: NextRequest) {
  const headers = checkoutCors(req);
  const value = req.nextUrl.searchParams.get("province");
  if (value !== null && !/^[1-9]\d{0,2}$/.test(value)) return NextResponse.json({ error: "Tỉnh thành không hợp lệ." }, { status: 400, headers });
  try {
    const data = value ? { wards: (await getProvince(Number(value))).wards } : { provinces: await getProvinces() };
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json({ error: "Chưa tải được địa chỉ. Bạn vui lòng thử lại." }, { status: 503, headers });
  }
}
