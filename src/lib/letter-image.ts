// Vẽ một lá thư thành ảnh 1080 x 1350 (tỉ lệ 4:5) bằng canvas, chạy trong trình duyệt.
import { site } from "./site";

export interface LetterImageInput {
  eyebrow: string;
  title: string;
  text: string;
  page: number;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = {
  ink: "#16302f",
  deep: "#3e6658",
  paper: "#f7f0e2",
  gold: "#ecc98a",
  sage: "#bcd3bd",
};

/** Tên font thật mà next/font đã nạp (tên được băm), đọc từ biến CSS trên thẻ html. */
function fontFamily(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Logo Khoảng Ngẫm, vẽ trong ô vuông cạnh `size` có góc trên trái tại (x, y). */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.gold;
  ctx.stroke(new Path2D("M14 32A18 18 0 0 1 50 32"));
  ctx.stroke(new Path2D("M5 32H59"));
  ctx.strokeStyle = COLORS.sage;
  ctx.stroke(new Path2D("M17 40H47"));
  ctx.stroke(new Path2D("M24 47H40"));
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, spacing: string) {
  // letterSpacing chưa có ở mọi trình duyệt; thiếu thì chữ chỉ khít hơn một chút.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing;
}

export async function renderLetterImage(input: LetterImageInput): Promise<Blob> {
  const sans = fontFamily("--font-be-vietnam-pro", "system-ui, sans-serif");
  const serif = fontFamily("--font-lora", "Georgia, serif");
  await Promise.all([
    document.fonts.load(`700 54px ${sans}`, input.title),
    document.fonts.load(`400 44px ${serif}`, input.text),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không khả dụng");

  // Nền xanh với quầng sáng phía trên
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, -80, 0, WIDTH / 2, -80, 900);
  glow.addColorStop(0, "rgba(62, 102, 88, 0.75)");
  glow.addColorStop(1, "rgba(62, 102, 88, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Tờ giấy
  const paper = { x: 84, y: 84, w: WIDTH - 168, h: 1010 };
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = COLORS.paper;
  roundedRect(ctx, paper.x, paper.y, paper.w, paper.h, 14);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, paper.x + 1, paper.y + 1, paper.w - 2, paper.h - 2, 13);
  ctx.strokeStyle = "rgba(62, 102, 88, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Bóng đổ ở gáy, như trang sách
  const gutter = ctx.createLinearGradient(paper.x, 0, paper.x + 70, 0);
  gutter.addColorStop(0, "rgba(22, 48, 47, 0.16)");
  gutter.addColorStop(1, "rgba(22, 48, 47, 0)");
  ctx.save();
  roundedRect(ctx, paper.x, paper.y, paper.w, paper.h, 14);
  ctx.clip();
  ctx.fillStyle = gutter;
  ctx.fillRect(paper.x, paper.y, 70, paper.h);
  ctx.restore();

  const left = paper.x + 84;
  const right = paper.x + paper.w - 64;
  const textWidth = right - left;
  ctx.textBaseline = "alphabetic";

  // Tiêu đề và đường phân cách, đồng bộ với lá thư trên màn hình.
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 54px ${sans}`;
  ctx.fillText(input.title, left, paper.y + 128);
  ctx.fillStyle = "rgba(62, 102, 88, 0.68)";
  roundedRect(ctx, left, paper.y + 158, 96, 4, 2);
  ctx.fill();

  // Nội dung: chọn cỡ chữ lớn nhất mà cả lá thư vẫn nằm gọn trong tờ giấy
  const top = paper.y + 215;
  const bottom = paper.y + paper.h - 120;
  let size = 46;
  let lines: string[] = [];
  for (; size >= 28; size -= 2) {
    ctx.font = `400 ${size}px ${serif}`;
    lines = wrapLines(ctx, input.text, textWidth);
    if (lines.length * size * 1.62 <= bottom - top) break;
  }
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 ${size}px ${serif}`;
  lines.forEach((line, i) => ctx.fillText(line, left, top + size + i * size * 1.62));

  // Số trang ở góc dưới bên phải tờ giấy
  ctx.fillStyle = "rgba(62, 102, 88, 0.85)";
  ctx.font = `400 30px ${serif}`;
  ctx.textAlign = "right";
  ctx.fillText(String(input.page), right, paper.y + paper.h - 48);

  // Chân ảnh: logo, tên sách, tên thương hiệu
  ctx.textAlign = "center";
  drawLogo(ctx, WIDTH / 2 - 42, paper.y + paper.h + 34, 84);
  ctx.fillStyle = COLORS.paper;
  ctx.font = `400 42px ${serif}`;
  ctx.fillText(site.product, WIDTH / 2, paper.y + paper.h + 168);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `600 22px ${sans}`;
  spaced(ctx, "7px");
  ctx.fillText(site.name.toUpperCase(), WIDTH / 2, paper.y + paper.h + 214);
  spaced(ctx, "0px");

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Không tạo được ảnh"))), "image/png");
  });
}
