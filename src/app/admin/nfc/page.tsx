import type { Metadata } from "next";
import { requireWriteAdmin } from "@/lib/admin";
import { one } from "@/lib/customer-data";
import { listCardBatches } from "@/server/card-batches";
import { nfcProgress } from "@/server/nfc-cards";
import { NfcWriter } from "@/components/admin/NfcWriter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ghi thẻ NFC", robots: { index: false, follow: false } };

export default async function NfcPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireWriteAdmin();
  const [batches, progress, params] = await Promise.all([listCardBatches(), nfcProgress(), searchParams]);
  const requested = one(params.batch);
  const initialBatchId = batches.find((batch) => batch.id === requested)?.id ?? batches[0]?.id ?? "";
  return <main className="mx-auto w-full max-w-3xl px-5 py-8">
    <h1 className="text-[26px] font-bold">Ghi thẻ NFC</h1>
    <p className="mt-2 text-[14px] leading-relaxed text-sage">Quét QR trên thẻ, áp chính thẻ đó vào điện thoại để ghi, rồi chạm lại để xác nhận. Không cần giữ thứ tự thẻ của nhà in.</p>
    <NfcWriter batches={batches.map(({ id, createdAt, count }) => ({ id, createdAt: createdAt.toISOString(), count }))} initialBatchId={initialBatchId} initialProgress={progress} />
  </main>;
}
