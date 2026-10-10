import { dayKey } from "@/lib/day";
import { TRIAL_LETTERS } from "@/lib/letters";
import { prisma } from "@/lib/prisma";

// Ghi và đếm người đọc thử. Mỗi người một dòng, cập nhật mỗi lần họ mở trang /doc-thu.

/** Ghi một lượt mở trang đọc thử của một người. */
export async function recordTrialVisit(readerId: string, startedOn: string, today: string, opened: number): Promise<void> {
  await prisma.trialReader.upsert({
    where: { id: readerId },
    create: { id: readerId, startedOn, lastDay: today, maxOpened: opened },
    update: {},
  });
  // Hai lệnh có điều kiện để nhiều request cùng lúc không cộng trùng ngày.
  await prisma.trialReader.updateMany({
    where: { id: readerId, lastDay: { not: today } },
    data: { lastDay: today, visitDays: { increment: 1 }, lastSeenAt: new Date() },
  });
  await prisma.trialReader.updateMany({ where: { id: readerId, maxOpened: { lt: opened } }, data: { maxOpened: opened } });
}

export type TrialStats = {
  total: number;
  today: number;
  last7Days: number;
  /** Người bắt đầu trước hôm nay, tức đã có cơ hội quay lại. */
  eligible: number;
  returned2: number;
  returned3: number;
  finished: number;
  listens: number;
  shares: number;
  byOpened: { opened: number; count: number }[];
  byDay: { day: string; count: number }[];
};

export async function trialStats(now: Date = new Date()): Promise<TrialStats> {
  const today = dayKey(now);
  const weekAgo = dayKey(new Date(now.getTime() - 6 * 86_400_000));
  const twoWeeksAgo = dayKey(new Date(now.getTime() - 13 * 86_400_000));
  const trialLetter = { letterId: { startsWith: "doc-thu-" } };
  const [total, todayCount, last7Days, eligible, returned2, returned3, finished, listens, shares, opened, days] = await Promise.all([
    prisma.trialReader.count(),
    prisma.trialReader.count({ where: { startedOn: today } }),
    prisma.trialReader.count({ where: { startedOn: { gte: weekAgo } } }),
    prisma.trialReader.count({ where: { startedOn: { lt: today } } }),
    prisma.trialReader.count({ where: { visitDays: { gte: 2 } } }),
    prisma.trialReader.count({ where: { visitDays: { gte: 3 } } }),
    prisma.trialReader.count({ where: { maxOpened: { gte: TRIAL_LETTERS } } }),
    prisma.listenEvent.count({ where: trialLetter }),
    prisma.shareEvent.count({ where: trialLetter }),
    prisma.trialReader.groupBy({ by: ["maxOpened"], _count: { _all: true }, orderBy: { maxOpened: "asc" } }),
    prisma.trialReader.groupBy({ by: ["startedOn"], where: { startedOn: { gte: twoWeeksAgo } }, _count: { _all: true }, orderBy: { startedOn: "desc" } }),
  ]);
  return {
    total,
    today: todayCount,
    last7Days,
    eligible,
    returned2,
    returned3,
    finished,
    listens,
    shares,
    byOpened: opened.map((row) => ({ opened: row.maxOpened, count: row._count._all })),
    byDay: days.map((row) => ({ day: row.startedOn, count: row._count._all })),
  };
}
