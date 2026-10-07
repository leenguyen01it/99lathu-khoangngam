import type { NextConfig } from "next";

const noStore = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Đường mở thẻ và đường xem thư: không cache, không lộ URL qua referrer
      { source: "/uid/:path*", headers: noStore },
      { source: "/v/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
