import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { TOTAL_LETTERS } from "@/lib/letters";
import { site } from "@/lib/site";
import { MAX_CARDS_PER_BATCH } from "@/server/cards";
import { countListens, topListenedLetters } from "@/server/listens";
import { countShares, topSharedLetters, type ShareCount } from "@/server/shares";
import { STATUS_LABELS, listCardUsage, summarize } from "@/server/stats";
import { createCardBatch } from "./actions";
import { STATUS_STYLES, lastOpenLabel, percent } from "./status";
import { Pagination } from "@/components/admin/Pagination";
import { one, pageSize, positiveInt } from "@/lib/customer-data";

export const metadata: Metadata = {
  title: "Quản lý thẻ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Ranking({
  title,
  total,
  empty,
  items,
}: {
  title: string;
  total: string;
  empty: string;
  items: ShareCount[];
}) {
  return (
    <div className="rounded-2xl border border-sage/25 p-4">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <p className="text-[13px] text-sage">{total}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] text-sage">{empty}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.letterId} className="flex items-baseline gap-3 text-[14px]">
              <span className="w-14 shrink-0 font-bold text-gold">{item.count} lượt</span>
              <span className="w-32 shrink-0">{item.title}</span>
              <span className="truncate text-sage">{item.excerpt}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const raw = await searchParams;
  const q = one(raw.q).trim().toUpperCase();
  const status = one(raw.status);
  const size = pageSize(raw.pageSize);
  const requestedPage = positiveInt(raw.page);
  const [cards, topShared, totalShares, topListened, totalListens] = await Promise.all([
    listCardUsage(),
    topSharedLetters(10),
    countShares(),
    topListenedLetters(10),
    countListens(),
  ]);
  const overview = summarize(cards);
  const opened = overview.total - overview.byStatus.unopened;
  const filteredCards = cards.filter((card) => (!q || card.uid.includes(q)) && (!status || card.usage.status === status));
  const pages = Math.max(1, Math.ceil(filteredCards.length / size));
  const page = Math.min(requestedPage, pages);
  const visibleCards = filteredCards.slice((page - 1) * size, page * size);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value) query.set(key, value);

  const tiles: [string, string, string][] = [
    ["Tổng số thẻ", String(overview.total), `${opened} thẻ đã được mở`],
    [
      "Đang dùng",
      String(overview.byStatus.active),
      "Mở thư hôm nay hoặc hôm qua",
    ],
    ["Thưa dần", String(overview.byStatus.fading), "2 tới 6 ngày chưa mở"],
    ["Đã bỏ", String(overview.byStatus.dropped), "Từ 7 ngày chưa mở"],
    ["Đã đọc hết", String(overview.byStatus.finished), `Mở đủ ${TOTAL_LETTERS} lá`],
    [
      "Tỉ lệ mở trung bình",
      overview.averageOpenRate === null ? "Chưa có" : percent(overview.averageOpenRate),
      "Số ngày có mở trên số ngày đã có thẻ",
    ],
    [
      "Còn mở sau tuần đầu",
      overview.afterWeek.eligible
        ? `${overview.afterWeek.retained} / ${overview.afterWeek.eligible}`
        : "Chưa có",
      "Trong các thẻ đã mở hơn 7 ngày",
    ],
    [
      "Còn mở sau 30 ngày",
      overview.afterMonth.eligible
        ? `${overview.afterMonth.retained} / ${overview.afterMonth.eligible}`
        : "Chưa có",
      "Trong các thẻ đã mở hơn 30 ngày",
    ],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">{site.name}</p>
          <h1 className="text-[26px] font-bold">Quản lý thẻ</h1>
        </div>
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

      <section className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-sage/25 p-4">
        <form action={createCardBatch} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] text-sage">Số thẻ cần tạo (tối đa {MAX_CARDS_PER_BATCH})</span>
            <input
              name="count"
              type="number"
              min={1}
              max={MAX_CARDS_PER_BATCH}
              defaultValue={10}
              required
              className="field w-44"
            />
          </label>
          <button className="btn">Tạo thẻ</button>
        </form>
        <a href="/admin/export" className="btn-ghost">
          Tải CSV
        </a>
        <a href="/admin/print-export" className="btn-ghost">
          Tải file in QR
        </a>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Ranking
          title="Lá thư được nghe nhiều nhất"
          total={`Tổng cộng ${totalListens} lượt nghe`}
          empty="Chưa có ai bấm nghe lá thư nào."
          items={topListened}
        />
        <Ranking
          title="Lá thư được lưu ảnh nhiều nhất"
          total={`Tổng cộng ${totalShares} lượt lưu ảnh`}
          empty="Chưa có ai lưu ảnh lá thư nào."
          items={topShared}
        />
      </section>

      <form className="mt-6 rounded-2xl border border-sage/25 bg-deep/10 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px_170px_auto]">
          <label><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">Tìm thẻ</span><input className="field" name="q" defaultValue={one(raw.q)} placeholder="Nhập UID nội bộ" /></label>
          <label><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">Trạng thái sử dụng</span><select className="field" name="status" defaultValue={status}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-sage">Hiển thị</span><select className="field" name="pageSize" defaultValue={String(size)}><option value="25">25 thẻ mỗi trang</option><option value="50">50 thẻ mỗi trang</option><option value="100">100 thẻ mỗi trang</option></select></label>
          <div className="flex items-end gap-2"><button className="btn">Áp dụng</button>{q || status ? <Link href="/admin" className="btn-ghost">Xóa lọc</Link> : null}</div>
        </div>
      </form>

      <section className="mt-4 overflow-x-auto rounded-2xl border border-sage/25">
        <table className="w-full min-w-[860px] text-left text-[14px]">
          <thead className="text-[12px] uppercase tracking-wider text-sage">
            <tr>
              <th className="px-4 py-3">UID nội bộ</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Lá thư</th>
              <th className="px-4 py-3">Ngày có mở</th>
              <th className="px-4 py-3">Chuỗi dài nhất</th>
              <th className="px-4 py-3">Mở lần cuối</th>
              <th className="px-4 py-3">Thư tặng</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleCards.map(({ id, uid, currentN, hasGift, customer, usage }) => (
              <tr key={id} className="border-t border-sage/15">
                <td className="px-4 py-2.5 font-mono tracking-wider">
                  <Link href={`/admin/cards/${id}`} className="hover:text-gold">
                    {uid}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{customer ? <Link href={`/admin/customers/${customer.id}`} className="hover:text-gold">{customer.fullName || customer.phone || "Khách hàng"}</Link> : <span className="text-sage">Chưa gắn</span>}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${STATUS_STYLES[usage.status]}`}
                  >
                    {STATUS_LABELS[usage.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {currentN} / {TOTAL_LETTERS}
                </td>
                <td className="px-4 py-2.5">
                  {usage.totalDays ? (
                    <>
                      {usage.openedDays} / {usage.totalDays} ngày
                      <span className="ml-2 text-sage">{percent(usage.openRate)}</span>
                    </>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">{usage.totalDays ? `${usage.longestStreak} ngày` : ""}</td>
                <td className="px-4 py-2.5 text-sage">{lastOpenLabel(usage.daysSinceLastOpen)}</td>
                <td className="px-4 py-2.5">{hasGift ? "Có" : ""}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/admin/cards/${id}`} className="text-gold hover:underline">
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {visibleCards.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sage">
                  Chưa có thẻ nào. Nhập số lượng rồi bấm Tạo thẻ.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination path="/admin" page={page} pageSize={size} total={filteredCards.length} params={query} />
      </section>
    </main>
  );
}
