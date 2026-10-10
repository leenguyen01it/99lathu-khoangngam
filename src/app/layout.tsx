import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { site } from "@/lib/site";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-lora",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.product}: mỗi ngày mở một lá thư · ${site.name}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "vi_VN",
    title: `${site.product}: mỗi ngày mở một lá thư`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#16302f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${lora.variable}`}>
      <body className="font-sans">
        {children}
        {/* Chỉ đo trên bản chạy thật, để lượt thử ở máy phát triển không lẫn vào số liệu. */}
        {process.env.NODE_ENV === "production" ? <Analytics id={site.gaId} /> : null}
      </body>
    </html>
  );
}
