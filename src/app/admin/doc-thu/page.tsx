import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { TRIAL_LETTERS } from "@/lib/letters";
import { trialStats } from "@/server/trial";

export const metadata: Metadata = { title: "Đọc thử", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ratio = (part: number, whole: number) => (whole ? `${part} / ${whole} (${Math.round((part / whole) * 100)}%)` : "Chưa có");
const viDay = (day: string) => day.split("-").reverse().join("/");

export default async function AdminTrialPage() {
  await requireAdmin();
  const stats = await trialStats();
  const tiles: [string, string, string][] = [
    ["Tổng người đọc thử", String(stats.total), "Mỗi trình duyệt tính là một người"],
    ["Hôm nay", String(stats.today), "Người bắt đầu đọc thử hôm nay"],
    ["7 ngày gần đây", String(stats.last7Days), "Người bắt đầu trong 7 ngày, tính cả hôm nay"],
    ["Quay lại ngày thứ 2", ratio(stats.returned2, stats.eligible), "Trong số người bắt đầu trước hôm nay"],
    ["Quay lại từ 3 ngày", ratio(stats.returned3, stats.eligible), "Mở trang ít nhất 3 ngày khác nhau"],
    [`Mở đủ ${TRIAL_LETTERS} lá`, String(stats.finished), "Còn quay lại khi lá cuối đã mở khoá"],
    ["Lượt nghe giọng đọc", String(stats.listens), "Trên các lá đọc thử"],
    ["Lượt lưu ảnh", String(stats.shares), "Trên các lá đọc thử"],
  ];
  const most = Math.max(1, ...stats.byOpened.map((row) => row.count));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Quản trị</p>
        <h1 className="text-[28px] font-semibold">Đọc thử</h1>
        <p className="mt-1 text-[14px] text-sage">
          Đếm từ lúc bật tính năng này. Bot và lượt tải trước của trình duyệt không được tính. Một người dùng hai máy hoặc xoá cookie sẽ thành hai người.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-sage/25 px-4 py-3">
            <p className="text-[13px] text-sage">{label}</p>
            <p className="text-[24px] font-bold text-gold">{value}</p>
            <p className="text-[12px] leading-snug text-sage/70">{hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sage/25 p-4">
          <h2 className="text-[16px] font-semibold">Đọc tới lá thứ mấy</h2>
          <p className="text-[13px] text-sage">Số lá đã mở khoá ở lần gần nhất mỗi người mở trang</p>
          {stats.byOpened.length === 0 ? (
            <p className="mt-3 text-[14px] text-sage">Chưa có ai đọc thử.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {stats.byOpened.map((row) => (
                <li key={row.opened} className="flex items-center gap-3 text-[14px]">
                  <span className="w-12 shrink-0">Lá {row.opened}</span>
                  <span className="h-2 rounded-full bg-gold" style={{ width: `${Math.max(2, (row.count / most) * 70)}%` }} />
                  <span className="font-bold text-gold">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-sage/25 p-4">
          <h2 className="text-[16px] font-semibold">Người mới theo ngày</h2>
          <p className="text-[13px] text-sage">14 ngày gần đây, theo giờ Việt Nam</p>
          {stats.byDay.length === 0 ? (
            <p className="mt-3 text-[14px] text-sage">Chưa có ai đọc thử trong 14 ngày qua.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-1.5">
              {stats.byDay.map((row) => (
                <li key={row.day} className="flex items-baseline gap-3 text-[14px]">
                  <span className="w-24 shrink-0 text-sage">{viDay(row.day)}</span>
                  <span className="font-bold text-gold">{row.count} người</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
