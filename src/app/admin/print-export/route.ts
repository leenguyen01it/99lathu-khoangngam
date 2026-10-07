import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { isAdmin } from "@/lib/admin";
import { nfcUrl } from "@/lib/crypto";
import { personalizeCardBack } from "@/lib/card-print";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DESIGN_DIR = path.join(process.cwd(), "design", "nfc-card");

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  if (!(await isAdmin())) return new Response("Không có quyền", { status: 403 });

  const cards = await prisma.card.findMany({
    where: { activatedAt: null },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { uid: true, uidHash: true },
  });
  if (!cards.length) return new Response("Không có thẻ chưa mở để xuất file in.", { status: 404 });

  const [front, back, fontRegular, fontMedium, fontItalic, fontWordmark] = await Promise.all([
    fs.readFile(path.join(DESIGN_DIR, "front.svg"), "utf8"),
    fs.readFile(path.join(DESIGN_DIR, "back.svg"), "utf8"),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-regular.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-medium.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "source-serif-4-italic.ttf")),
    fs.readFile(path.join(DESIGN_DIR, "fonts", "wordmark", "greatvibes.ttf")),
  ]);

  const zip = new JSZip();
  zip.file("mat-truoc.svg", front);
  zip.file("fonts/source-serif-4-regular.ttf", fontRegular);
  zip.file("fonts/source-serif-4-medium.ttf", fontMedium);
  zip.file("fonts/source-serif-4-italic.ttf", fontItalic);
  zip.file("fonts/wordmark/greatvibes.ttf", fontWordmark);

  const rows = [["uid", "nfcUrl", "fileMatSau"]];
  // Cac SVG mat sau nam trong thu muc con, nen font phai tro ve thu muc goc cua ZIP.
  const backForZip = back.replaceAll('url("fonts/', 'url("../fonts/');
  for (const card of cards) {
    const url = nfcUrl(card.uidHash);
    const filename = `mat-sau/${card.uid}.svg`;
    zip.file(filename, personalizeCardBack(backForZip, url));
    rows.push([card.uid, url, filename]);
  }
  zip.file("doi-chieu.csv", `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`);
  zip.file(
    "HUONG-DAN.txt",
    [
      "BỘ FILE IN THẺ NFC KHOẢNG NGẪM",
      "",
      "- mat-truoc.svg: mặt trước dùng chung.",
      "- mat-sau/<UID>.svg: mặt sau riêng của từng thẻ, QR chứa nfcUrl tương ứng.",
      "- doi-chieu.csv: bảng ghép UID, URL và tên file mặt sau.",
      "- Kích thước mỗi SVG: 91,6 x 60 mm, gồm bleed 3 mm mỗi cạnh.",
      "- Không thay đổi kích thước QR 16 x 16 mm hoặc khoảng trắng quanh QR.",
      "- Nhà in cần giữ đúng quan hệ UID/file mặt sau khi cá thể hóa thẻ.",
    ].join("\r\n"),
  );

  const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const responseBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  return new Response(responseBody, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="file-in-qr-${Date.now()}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
