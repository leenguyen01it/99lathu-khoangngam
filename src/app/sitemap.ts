import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Chỉ liệt kê trang công khai; các đường mở thẻ và admin đều noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/doc-thu`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
