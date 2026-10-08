import { giftUrl, nfcUrl } from "@/lib/crypto";
import { dayKey } from "@/lib/day";
import { TOTAL_LETTERS } from "@/lib/letters";
import { prisma } from "@/lib/prisma";

// Thống kê sử dụng của từng thẻ, tính từ nhật ký chạm thẻ (ScanLog).
// "Ngày" dùng cùng quy ước với việc mở thư: giờ Việt Nam, bắt đầu lúc 0 giờ.

export type CardStatus = "unopened" | "active" | "fading" | "dropped" | "finished";

export const STATUS_LABELS: Record<CardStatus, string> = {
  unopened: "Chưa mở",
  active: "Đang dùng",
  fading: "Thưa dần",
  dropped: "Đã bỏ",
  finished: "Đã đọc hết",
};

export interface DayCell {
  day: string; // "YYYY-MM-DD"
  index: number; // ngày thứ mấy kể từ lần chạm đầu, bắt đầu từ 1
  scans: number;
  firstScanAt: Date | null;
}

export interface Usage {
  days: DayCell[]; // mọi ngày từ lần chạm đầu tới hôm nay
  totalDays: number;
  openedDays: number;
  missedDays: number;
  openRate: number; // 0..1
  longestStreak: number;
  currentStreak: number; // chuỗi ngày liên tiếp tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa mở)
  lastOpenedDay: string | null;
  daysSinceLastOpen: number | null;
  totalScans: number;
  status: CardStatus;
}

function addDays(key: string, amount: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/**
 * Trạng thái dựa trên số ngày kể từ lần mở gần nhất:
 * hôm nay hoặc hôm qua là "đang dùng", 2 tới 6 ngày là "thưa dần", từ 7 ngày là "đã bỏ".
 */
function statusOf(currentN: number, daysSinceLastOpen: number | null): CardStatus {
  if (daysSinceLastOpen === null) return "unopened";
  if (currentN >= TOTAL_LETTERS) return "finished";
  if (daysSinceLastOpen <= 1) return "active";
  if (daysSinceLastOpen <= 6) return "fading";
  return "dropped";
}

export function computeUsage(currentN: number, scans: Date[], now: Date = new Date()): Usage {
  const today = dayKey(now);
  const perDay = new Map<string, { scans: number; first: Date }>();
  for (const at of scans) {
    const key = dayKey(at);
    const entry = perDay.get(key);
    if (!entry) perDay.set(key, { scans: 1, first: at });
    else {
      entry.scans += 1;
      if (at < entry.first) entry.first = at;
    }
  }

  const sortedKeys = [...perDay.keys()].sort();
  const firstDay = sortedKeys[0];
  const days: DayCell[] = [];
  if (firstDay) {
    for (let key = firstDay, index = 1; key <= today; key = addDays(key, 1), index++) {
      const entry = perDay.get(key);
      days.push({ day: key, index, scans: entry?.scans ?? 0, firstScanAt: entry?.first ?? null });
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (const cell of days) {
    run = cell.scans > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  // Hôm nay chưa mở thì chưa coi là đứt chuỗi: tính chuỗi kết thúc ở hôm qua.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const cell = days[i];
    if (!cell) break;
    if (cell.scans > 0) currentStreak += 1;
    else if (i === days.length - 1) continue;
    else break;
  }

  const openedDays = days.filter((cell) => cell.scans > 0).length;
  const lastOpened = [...days].reverse().find((cell) => cell.scans > 0);
  const daysSinceLastOpen = lastOpened ? days.length - lastOpened.index : null;

  return {
    days,
    totalDays: days.length,
    openedDays,
    missedDays: days.length - openedDays,
    openRate: days.length ? openedDays / days.length : 0,
    longestStreak,
    currentStreak,
    lastOpenedDay: lastOpened?.day ?? null,
    daysSinceLastOpen,
    totalScans: scans.length,
    status: statusOf(currentN, daysSinceLastOpen),
  };
}

export interface CardUsageRow {
  id: string;
  uid: string;
  nfcUrl: string;
  giftUrl: string;
  currentN: number;
  hasGift: boolean;
  activatedAt: Date | null;
  createdAt: Date;
  customer: { id: string; fullName: string | null; phone: string | null } | null;
  order: { id: string; orderNumber: string | null } | null;
  usage: Usage;
}

/** Mọi thẻ kèm thống kê sử dụng, thẻ mới tạo đứng đầu. */
export async function listCardUsage(now: Date = new Date()): Promise<CardUsageRow[]> {
  const [cards, logs] = await Promise.all([
    prisma.card.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.scanLog.findMany({ select: { cardId: true, scannedAt: true } }),
  ]);
  const scansByCard = new Map<string, Date[]>();
  for (const log of logs) {
    const list = scansByCard.get(log.cardId);
    if (list) list.push(log.scannedAt);
    else scansByCard.set(log.cardId, [log.scannedAt]);
  }
  return cards.map((card) => ({
    id: card.id,
    uid: card.uid,
    nfcUrl: nfcUrl(card.uidHash),
    giftUrl: giftUrl(card.id),
    currentN: card.currentN,
    hasGift: Boolean(card.giftMessage),
    activatedAt: card.activatedAt,
    createdAt: card.createdAt,
    customer: card.customer,
    order: card.order,
    usage: computeUsage(card.currentN, scansByCard.get(card.id) ?? [], now),
  }));
}

export interface Overview {
  total: number;
  byStatus: Record<CardStatus, number>;
  averageOpenRate: number | null; // trung bình trên các thẻ đã mở
  // Trong các thẻ đã mở đủ lâu, bao nhiêu thẻ còn mở thư sau mốc đó
  afterWeek: { eligible: number; retained: number };
  afterMonth: { eligible: number; retained: number };
}

export function summarize(rows: CardUsageRow[]): Overview {
  const byStatus: Record<CardStatus, number> = {
    unopened: 0,
    active: 0,
    fading: 0,
    dropped: 0,
    finished: 0,
  };
  const retention = (afterDays: number) => {
    const eligible = rows.filter((row) => row.usage.totalDays > afterDays);
    return {
      eligible: eligible.length,
      retained: eligible.filter((row) =>
        row.usage.days.some((cell) => cell.index > afterDays && cell.scans > 0),
      ).length,
    };
  };
  for (const row of rows) byStatus[row.usage.status] += 1;
  const opened = rows.filter((row) => row.usage.totalDays > 0);
  return {
    total: rows.length,
    byStatus,
    averageOpenRate: opened.length
      ? opened.reduce((sum, row) => sum + row.usage.openRate, 0) / opened.length
      : null,
    afterWeek: retention(7),
    afterMonth: retention(30),
  };
}

export interface CardDetail {
  card: CardUsageRow & { giftFrom: string | null; giftMessage: string | null };
  logs: { id: string; scannedAt: Date; ip: string | null; userAgent: string | null }[];
  hours: number[]; // 24 ô: số ngày mà lần chạm đầu tiên rơi vào giờ đó (giờ Việt Nam)
}

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  hourCycle: "h23",
});

export async function getCardDetail(id: string, now: Date = new Date()): Promise<CardDetail | null> {
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });
  if (!card) return null;
  const logs = await prisma.scanLog.findMany({
    where: { cardId: id },
    orderBy: { scannedAt: "desc" },
    select: { id: true, scannedAt: true, ip: true, userAgent: true },
  });
  const usage = computeUsage(
    card.currentN,
    logs.map((log) => log.scannedAt),
    now,
  );
  const hours = new Array<number>(24).fill(0);
  for (const cell of usage.days) {
    if (!cell.firstScanAt) continue;
    const hour = Number(hourFormat.format(cell.firstScanAt));
    if (hour >= 0 && hour < 24) hours[hour] = (hours[hour] ?? 0) + 1;
  }
  return {
    card: {
      id: card.id,
      uid: card.uid,
      nfcUrl: nfcUrl(card.uidHash),
      giftUrl: giftUrl(card.id),
      currentN: card.currentN,
      hasGift: Boolean(card.giftMessage),
      giftFrom: card.giftFrom,
      giftMessage: card.giftMessage,
      activatedAt: card.activatedAt,
      createdAt: card.createdAt,
      customer: card.customer,
      order: card.order,
      usage,
    },
    logs,
    hours,
  };
}
