import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Đường mở thẻ (/uid, /v, /tang) không chặn ở đây: chúng đã có noindex,
// chặn crawl thì Google không đọc được thẻ noindex đó.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
