"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Chỉ đo các trang công khai. Đường mở thẻ (/uid, /v, /tang) và admin mang mã bí mật
// trong URL, nên tuyệt đối không tải Google Analytics ở đó.
const PUBLIC_PATHS = new Set(["/", "/doc-thu"]);

export function Analytics({ id }: { id: string }) {
  const pathname = usePathname();
  if (!PUBLIC_PATHS.has(pathname)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
