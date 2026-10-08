import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { isAdmin } from "@/lib/admin";
import { nfcUrl } from "@/lib/crypto";
import { personalizeCardBack } from "@/lib/card-print";
import { cardPdf } from "@/lib/card-pdf";
import { prisma } from "@/lib/prisma";
import { findCardBatch, listCardBatches, MAX_CARDS_PER_BATCH } from "@/server/card-batches";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DESIGN_DIR = path.join(process.cwd(), "design", "nfc-card");

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Không có quyền", { status: 403 });

  const batchId = new URL(request.url).searchParams.get("batch") || (await listCardBatches())[0]?.id || "unopened";
  const batch = batchId === "unopened" ? null : await findCardBatch(batchId);
  const uids = batch?.uids ?? null;
  if (batchId !== "unopened" && !uids) return new Response("Không tìm thấy đợt tạo thẻ.", { status: 404 });
  const cards = await prisma.card.findMany({
    where: uids ? { uid: { in: uids } } : { activatedAt: null },
    orderBy: [{ createdAt: "desc" }, { uid: "asc" }],
    take: MAX_CARDS_PER_BATCH,
    select: { uid: true, uidHash: true },
  });
  if (!cards.length) return new Response("Không có thẻ để xuất file in.", { status: 404 });
  if (uids && cards.length !== uids.length) return new Response("Đợt tạo này thiếu thẻ. Vui lòng kiểm tra trước khi in.", { status: 409 });
  // Keep each number attached to the same card whenever this batch is exported again.
  if (uids) cards.sort((a, b) => uids.indexOf(a.uid) - uids.indexOf(b.uid));

  const [front, back, fontRegular, fontMedium, fontItalic, fontWordmark] = await Promise.all([
    fs.readFile(path.join(DESIGN_DIR, "front.svg"), "utf8"),
    fs.readFile(path.join(DESIGN_DIR, "back.svg"), "utf8"),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-regular.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-medium.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-italic.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "wordmark", "greatvibes.ttf")),
  ]);

  const zip = new JSZip();
  const fonts = { regular: fontRegular, medium: fontMedium, italic: fontItalic, wordmark: fontWordmark };
  zip.file("mat-truoc.pdf", await cardPdf(front, fonts));

  for (const [index, card] of cards.entries()) {
    const url = nfcUrl(card.uidHash);
    const filename = `mat-sau/KN${String(index + 1).padStart(3, "0")}.pdf`;
    zip.file(filename, await cardPdf(personalizeCardBack(back, url), fonts));
  }

  const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(batch?.createdAt ?? new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? "";
  const dateLabel = `${part("day")}-${part("month")}-${part("year")}`;
  const filename = `Khoang-Ngam_File-In_${cards.length}-The_${dateLabel}.zip`;
  const responseBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  return new Response(responseBody, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
