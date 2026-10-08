import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { TOTAL_LETTERS } from "@/lib/letters";
import { countListens } from "@/server/listens";
import { countShares } from "@/server/shares";
import { STATUS_LABELS, getCardDetail, type DayCell } from "@/server/stats";
import { STATUS_STYLES, lastOpenLabel, percent } from "../../status";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { formatAdminDateTime, formatAdminDayKey } from "@/lib/admin-format";
import { resetActivation } from "./actions";

export const metadata: Metadata = {
  title: "Chi tiết thẻ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const VN = "Asia/Ho_Chi_Minh";
const timeOnly = new Intl.DateTimeFormat("vi-VN", { timeZone: VN, hour: "2-digit", minute: "2-digit" });
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** "2026-10-06" thành "06/10" */
const shortDay = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

/** Thứ trong tuần của một khoá ngày, 0 là thứ Hai. */
const weekdayOf = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;

function Calendar({ days }: { days: DayCell[] }) {
  const first = days[0];
  if (!first) return null;
  const blanks = weekdayOf(first.day);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((name) => (
        <div key={name} className="pb-1 text-center text-[11px] uppercase tracking-wider text-sage/70">
          {name}
        </div>
      ))}
      {Array.from({ length: blanks }, (_, i) => (
        <div key={`blank-${i}`} />
      ))}
      {days.map((cell, i) => {
        const opened = cell.scans > 0;
        const isToday = i === days.length - 1;
        const tone = opened
          ? "border-gold bg-gold text-ink"
          : isToday
            ? "border-dashed border-sage/50 text-sage"
            : "border-rose/40 text-rose/80";
        return (
          <div
            key={cell.day}
            className={`rounded-lg border px-1 py-1.5 text-center ${tone}`}
            title={
              opened
                ? `Ngày ${cell.index} (${formatAdminDayKey(cell.day)}): mở lúc ${timeOnly.format(cell.firstScanAt ?? undefined)}, ${cell.scans} lần chạm`
                : `Ngày ${cell.index} (${formatAdminDayKey(cell.day)}): không mở`
            }
          >
            <p className="text-[13px] font-semibold leading-tight">{shortDay(cell.day)}</p>
            <p className="text-[11px] leading-tight opacity-80">
              {opened ? timeOnly.format(cell.firstScanAt ?? undefined) : isToday ? "chưa mở" : "bỏ"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function HourChart({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {hours.map((count, hour) => (
          <div
            key={hour}
            className={`flex-1 rounded-t ${count ? "bg-gold" : "bg-sage/15"}`}
            style={{ height: `${count ? Math.max(8, (count / max) * 100) : 3}%` }}
            title={`${hour} giờ: ${count} ngày`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-sage/70">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  );
}

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const detail = await getCardDetail(id);
  if (!detail) notFound();

  const { card, logs, hours } = detail;
  const [shares, listens] = await Promise.all([countShares(card.id), countListens(card.id)]);
  const { usage } = card;
  const missed = usage.days.filter((cell, i) => cell.scans === 0 && i < usage.days.length - 1);

  const tiles: [string, string, string][] = [
    ["Lá thư đã mở", `${card.currentN} / ${TOTAL_LETTERS}`, ""],
    [
      "Ngày có mở",
      usage.totalDays ? `${usage.openedDays} / ${usage.totalDays}` : "Chưa có",
      usage.totalDays ? `Tỉ lệ ${percent(usage.openRate)}` : "",
    ],
    ["Ngày bỏ", usage.totalDays ? String(missed.length) : "Chưa có", "Không tính hôm nay"],
    ["Chuỗi dài nhất", usage.totalDays ? `${usage.longestStreak} ngày` : "Chưa có", ""],
    ["Chuỗi hiện tại", usage.totalDays ? `${usage.currentStreak} ngày` : "Chưa có", ""],
    ["Mở lần cuối", lastOpenLabel(usage.daysSinceLastOpen) || "Chưa mở", usage.lastOpenedDay ? formatAdminDayKey(usage.lastOpenedDay) : ""],
    ["Tổng lượt chạm", String(usage.totalScans), "Tính cả chạm lại trong ngày"],
    ["Nghe và lưu ảnh", `${listens} nghe · ${shares} lưu`, card.hasGift ? `Có thư tặng${card.giftFrom ? ` từ ${card.giftFrom}` : ""}` : "Không có thư tặng"],
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <Link href="/admin" className="text-[14px] text-sage hover:text-gold">
        ‹ Tất cả thẻ
      </Link>

      <header className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-[26px] font-bold tracking-wider">{card.uid}</h1>
        <span
          className={`rounded-full border px-3 py-0.5 text-[13px] font-medium ${STATUS_STYLES[usage.status]}`}
        >
          {STATUS_LABELS[usage.status]}
        </span>
      </header>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 break-all font-mono text-[12px] text-sage">{card.nfcUrl}</p>
        <CopyLinkButton value={card.nfcUrl} iconOnly />
      </div>
      <p className="mt-1 text-[13px] text-sage">
        Tạo ngày {formatAdminDateTime(card.createdAt)}
        {card.activatedAt ? ` · Mở lần đầu ${formatAdminDateTime(card.activatedAt)}` : " · Chưa được mở"}
      </p>
      <section className="mt-4 rounded-2xl border border-sage/25 p-4">
        <h2 className="text-[16px] font-semibold">Kiểm tra trước khi giao thẻ</h2>
        <p className={`mt-2 text-[14px] ${card.activatedAt ? "text-rose" : "text-sage"}`}>
          {card.activatedAt ? "Đã kích hoạt. Nếu đây là lượt thử của nhà in, hãy đặt lại trước khi giao khách." : "Chưa kích hoạt. Thẻ sẵn sàng để khách xác nhận mở lần đầu."}
        </p>
        {actor.role !== "support" && card.activatedAt ? <details className="mt-3">
          <summary className="cursor-pointer text-[14px] text-gold">Đặt lại kích hoạt</summary>
          <form action={resetActivation.bind(null, card.id)} className="mt-3">
            <p className="text-[13px] text-sage">Thẻ trở về chưa kích hoạt, bắt đầu từ lá thư đầu tiên. Xóa lịch sử chạm, nghe, lưu ảnh và thu hồi phiên đọc cũ. Giữ lời tặng, khách hàng, đơn hàng và URL trên thẻ. Thao tác được ghi vào nhật ký quản trị.</p>
            <label className="mt-3 flex items-start gap-2 text-[14px]"><input type="checkbox" name="confirm" value="yes" required className="mt-1" />Tôi xác nhận đặt lại thẻ này trước khi giao khách.</label>
            <button className="btn mt-3">Xác nhận đặt lại thẻ</button>
          </form>
        </details> : null}
      </section>
      <div className="mt-4 rounded-2xl border border-gold/40 p-4">
        <p className="text-[13px] font-medium text-gold">Link gửi khách viết lời tặng</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a href={card.giftUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all font-mono text-[12px] text-sage hover:text-gold">
            {card.giftUrl}
          </a>
          <CopyLinkButton value={card.giftUrl} />
        </div>
      </div>
      <section id="gift-letter" className="mt-4 rounded-2xl border border-gold/40 p-4">
        <h2 className="text-[16px] font-semibold text-gold">Lời tặng từ người tặng</h2>
        {card.giftMessage ? (
          <>
            <p className="mt-2 text-[13px] text-sage">Người tặng: {card.giftFrom || "Không ghi tên"}</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{card.giftMessage}</p>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-sage">Chưa có lời tặng cho thẻ này.</p>
        )}
      </section>
      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        {card.customer ? <Link href={`/admin/customers/${card.customer.id}`} className="rounded-full border border-sage/30 px-3 py-1 hover:border-gold">Khách: {card.customer.fullName || card.customer.phone || "Chi tiết"}</Link> : <span className="rounded-full border border-sage/20 px-3 py-1 text-sage">Chưa gắn khách hàng</span>}
        {card.order ? <Link href={`/admin/orders/${card.order.id}`} className="rounded-full border border-sage/30 px-3 py-1 hover:border-gold">Đơn: {card.order.orderNumber || card.order.id.slice(-8)}</Link> : null}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-sage/25 px-4 py-3">
            <p className="text-[13px] text-sage">{label}</p>
            <p className="text-[22px] font-bold text-gold">{value}</p>
            <p className="min-h-[16px] text-[12px] text-sage/70">{hint}</p>
          </div>
        ))}
      </section>

      {usage.totalDays === 0 ? (
        <p className="mt-8 rounded-2xl border border-sage/25 px-4 py-8 text-center text-sage">
          Thẻ này chưa được chạm lần nào nên chưa có dữ liệu sử dụng.
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-sage/25 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold">Lịch mở thư từng ngày</h2>
              <p className="flex flex-wrap items-center gap-3 text-[12px] text-sage">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-gold bg-gold" /> Có mở (giờ mở lần đầu)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-rose/60" /> Không mở
                </span>
              </p>
            </div>
            <Calendar days={usage.days} />
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-sage/25 p-4">
              <h2 className="mb-1 text-[16px] font-semibold">Giờ mở thư trong ngày</h2>
              <p className="mb-4 text-[12px] text-sage">Tính theo lần chạm đầu tiên của mỗi ngày.</p>
              <HourChart hours={hours} />
            </div>
            <div className="rounded-2xl border border-sage/25 p-4">
              <h2 className="mb-1 text-[16px] font-semibold">Những ngày không mở</h2>
              <p className="mb-3 text-[12px] text-sage">
                {missed.length
                  ? `${missed.length} ngày, không tính hôm nay.`
                  : "Chưa bỏ ngày nào kể từ lần mở đầu tiên."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missed.map((cell) => (
                  <span
                    key={cell.day}
                    className="rounded-md border border-rose/40 px-2 py-0.5 text-[12px] text-rose/90"
                  >
                    {shortDay(cell.day)}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-x-auto rounded-2xl border border-sage/25">
            <h2 className="px-4 pt-4 text-[16px] font-semibold">Nhật ký chạm thẻ</h2>
            <table className="mt-2 w-full min-w-[620px] text-left text-[13px]">
              <thead className="text-[12px] uppercase tracking-wider text-sage">
                <tr>
                  <th className="px-4 py-2">Thời điểm</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2">Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 300).map((log) => (
                  <tr key={log.id} className="border-t border-sage/15">
                    <td className="whitespace-nowrap px-4 py-2">{formatAdminDateTime(log.scannedAt)}</td>
                    <td className="px-4 py-2 font-mono text-sage">{log.ip ?? ""}</td>
                    <td className="max-w-[420px] truncate px-4 py-2 text-sage" title={log.userAgent ?? ""}>
                      {log.userAgent ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length > 300 ? (
              <p className="px-4 py-3 text-[12px] text-sage">
                Đang hiện 300 lượt gần nhất trên tổng {logs.length} lượt.
              </p>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
