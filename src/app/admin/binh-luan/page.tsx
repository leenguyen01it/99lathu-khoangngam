import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/Pagination";
import { requireAdmin } from "@/lib/admin";
import { formatAdminDateTime } from "@/lib/admin-format";
import { pageSize, positiveInt } from "@/lib/customer-data";
import { listCommentsForAdmin } from "@/server/reactions";
import { removeCommentAction, resetPenNameAction } from "./actions";

export const metadata: Metadata = { title: "Bình luận", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireAdmin();
  const raw = await searchParams;
  const size = pageSize(raw.pageSize);
  const page = positiveInt(raw.page);
  const { total, items } = await listCommentsForAdmin(page, size);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value) query.set(key, value);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-gold">Quản trị</p>
        <h1 className="text-[28px] font-semibold">Bình luận</h1>
        <p className="mt-1 text-[14px] text-sage">
          Bình luận hiện ngay dưới lá thư, không qua duyệt trước: lá trong thẻ thì mọi người cầm thẻ đã mở lá đó đều thấy, lá đọc thử thì ai vào trang đọc thử cũng thấy. Gỡ ở đây nếu có nội dung không phù hợp; nội dung bị gỡ được giữ trong nhật ký quản trị. Người cầm thẻ tự đặt được tên: tên không phù hợp thì bấm “Đặt lại tên” để thay bằng một bút danh ngẫu nhiên.
        </p>
      </header>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-sage/25">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] uppercase tracking-wider text-sage">
            <tr>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Lá thư</th>
              <th className="px-4 py-3">Người viết</th>
              <th className="px-4 py-3">Nội dung</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-sage/15 align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-sage">{formatAdminDateTime(item.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{item.letterTitle}</td>
                <td className="px-4 py-2.5">
                  {item.card ? (
                    <Link href={`/admin/cards/${item.card.id}`} className="font-mono tracking-wider hover:text-gold">{item.card.uid}</Link>
                  ) : (
                    <span className="text-sage">Người đọc thử</span>
                  )}
                  {item.penName ? <p className="mt-0.5 text-[12px] text-sage">{item.penName}</p> : null}
                  {item.penName && actor.role !== "support" ? (
                    <details className="text-[12px]">
                      <summary className="cursor-pointer text-rose hover:underline">Đặt lại tên</summary>
                      <form
                        action={item.card ? resetPenNameAction.bind(null, "card", item.card.id) : resetPenNameAction.bind(null, "reader", item.readerId ?? "")}
                        className="mt-1.5"
                      >
                        <p className="text-sage">Thay tên này bằng một bút danh ngẫu nhiên?</p>
                        <button className="mt-1 font-semibold text-rose hover:underline">Xác nhận đặt lại</button>
                      </form>
                    </details>
                  ) : null}
                </td>
                <td className="whitespace-pre-wrap break-words px-4 py-2.5">{item.text}</td>
                <td className="px-4 py-2.5 text-right">
                  {actor.role !== "support" ? (
                    <details>
                      <summary className="cursor-pointer text-rose hover:underline">Gỡ</summary>
                      <form action={removeCommentAction.bind(null, item.id)} className="mt-1.5">
                        <p className="whitespace-nowrap text-[12px] text-sage">Gỡ bình luận này?</p>
                        <button className="mt-1 whitespace-nowrap text-[13px] font-semibold text-rose hover:underline">Xác nhận gỡ</button>
                      </form>
                    </details>
                  ) : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sage">Chưa có bình luận nào.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination path="/admin/binh-luan" page={page} pageSize={size} total={total} params={query} />
      </section>
    </main>
  );
}
