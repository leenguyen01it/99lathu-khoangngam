import QRCode from "qrcode";

const QR_X = 56.6;
const QR_Y = 27.5;
const QR_SIZE_MM = 16;

/** Tao QR vector, gom cac module lien tiep tren tung dong thanh mot path gon. */
export function qrSvgGroup(value: string): string {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const parts: string[] = [];

  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x += 1;
      parts.push(`M${start} ${y}h${x - start}v1H${start}z`);
    }
  }

  const scale = QR_SIZE_MM / size;
  return `<g id="qr-card" transform="translate(${QR_X} ${QR_Y}) scale(${scale})" fill="#16302f" shape-rendering="crispEdges"><path d="${parts.join("")}"/></g>`;
}

export function personalizeCardBack(template: string, url: string): string {
  const personalized = template.replace(/<g id="qr-sample"[\s\S]*?<\/g>/, qrSvgGroup(url));
  if (personalized === template) throw new Error("Khong tim thay qr-sample trong mau mat sau");
  return personalized;
}

