"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getClientIp } from "@/lib/request";
import { createScanSession } from "@/server/scans";

export async function activateCard(hash: string): Promise<void> {
  if (!/^[0-9a-f]{32}$/i.test(hash)) return;

  const h = await headers();
  const token = await createScanSession({
    uidHash: hash.toLowerCase(),
    ip: getClientIp(h),
    userAgent: h.get("user-agent"),
    confirmActivation: true,
  });
  if (token) redirect(`/v/${token}`);
}
