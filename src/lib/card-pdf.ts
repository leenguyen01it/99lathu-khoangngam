import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";

export type CardFonts = {
  regular: Buffer;
  medium: Buffer;
  italic: Buffer;
  wordmark: Buffer;
};

const MM_TO_PT = 72 / 25.4;

/** One vector page at print size, with fonts embedded in the PDF. */
export function cardPdf(svg: string, fonts: CardFonts): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const width = 91.6 * MM_TO_PT;
    const height = 60 * MM_TO_PT;
    const doc = new PDFDocument({ size: [width, height], margin: 0, font: fonts.regular as unknown as string, autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont("CardRegular", fonts.regular);
      doc.registerFont("CardMedium", fonts.medium);
      doc.registerFont("CardItalic", fonts.italic);
      doc.registerFont("CardWordmark", fonts.wordmark);
      doc.font("CardRegular");
      doc.addPage();
      // The SVG viewBox uses millimetres; use explicit point dimensions for PDF.
      const printable = svg
        .replace(/<style>[\s\S]*?<\/style>/g, "")
        .replace(/<g id="guides"[\s\S]*?<\/g>/, "")
        .replace('width="91.6mm" height="60mm"', `width="${width}" height="${height}"`)
        .replace('font-weight="500"', 'font-weight="bold"');
      SVGtoPDF(doc, printable, 0, 0, {
        width,
        height,
        assumePt: true,
        fontCallback: (family, bold, italic) => {
          if (family.includes("Great Vibes")) return "CardWordmark";
          if (italic) return "CardItalic";
          return bold ? "CardMedium" : "CardRegular";
        },
        warningCallback: (warning) => { throw new Error(`Card PDF: ${warning}`); },
      });
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
