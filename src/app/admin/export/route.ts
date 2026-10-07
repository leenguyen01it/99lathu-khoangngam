import { isAdmin } from "@/lib/admin";
import { STATUS_LABELS, listCardUsage } from "@/server/stats";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await isAdmin())) return new Response("Không có quyền", { status: 403 });

  const cards = await listCardUsage();
  const rows = [
    [
      "uid",
      "nfcUrl",
      "status",
      "currentN",
      "daysSinceFirstOpen",
      "openedDays",
      "missedDays",
      "openRatePercent",
      "longestStreak",
      "lastOpenedDay",
      "scans",
      "activatedAt",
      "createdAt",
    ],
    ...cards.map(({ uid, nfcUrl, currentN, activatedAt, createdAt, usage }) => [
      uid,
      nfcUrl,
      STATUS_LABELS[usage.status],
      currentN,
      usage.totalDays,
      usage.openedDays,
      usage.missedDays,
      Math.round(usage.openRate * 100),
      usage.longestStreak,
      usage.lastOpenedDay ?? "",
      usage.totalScans,
      activatedAt?.toISOString() ?? "",
      createdAt.toISOString(),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  // BOM để Excel đọc đúng UTF-8
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="the-nfc-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
