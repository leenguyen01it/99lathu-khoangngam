import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Locked } from "@/components/Locked";
import { getClientIp } from "@/lib/request";
import { createScanSession } from "@/server/scans";

export const metadata: Metadata = {
  title: "Mở thư",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NfcLandingPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{32}$/i.test(hash)) return <Locked unknownCard />;

  const h = await headers();
  const token = await createScanSession({
    uidHash: hash.toLowerCase(),
    ip: getClientIp(h),
    userAgent: h.get("user-agent"),
  });
  if (!token) return <Locked unknownCard />;

  // Trình duyệt thay /uid/[hash] bằng /v/[token] trên thanh địa chỉ.
  redirect(`/v/${token}`);
}
