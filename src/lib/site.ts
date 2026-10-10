// Tên và câu chữ thương hiệu, sửa một chỗ này là đổi toàn trang.
export const site = {
  name: "Khoảng Ngẫm",
  product: "99 ngày thương mình",
  tagline: "Mỗi ngày một lá thư.",
  // Địa chỉ công khai của app, dùng cho canonical, sitemap và ảnh chia sẻ.
  url: (process.env.APP_URL ?? "https://99lathu.khoangngam.com").replace(/\/+$/, ""),
  description:
    "Chạm thẻ để mở lá thư của hôm nay. 99 lá thư ngắn về những ngày cố gắng, lớn lên, yêu thương và dịu dàng với chính mình. Đọc thử miễn phí.",
  // Mã đo lường Google Analytics 4, dùng chung với landing để theo được hành trình từ landing sang đọc thử.
  gaId: "G-6MD1104BLZ",
  socialHandle: "@khoangngam",
  orderUrl: "https://khoangngam.com/#dat-hang",
  socialLinks: [
    { name: "Facebook", href: "https://www.facebook.com/khoangngam" },
    { name: "YouTube", href: "https://www.youtube.com/@khoangngam" },
    { name: "TikTok", href: "https://www.tiktok.com/@khoangngam" },
    { name: "Instagram", href: "https://www.instagram.com/khoangngam/" },
    { name: "Threads", href: "https://www.threads.com/@khoangngam" },
  ],
};

// Tốc độ phát giọng đọc. Bản thu giữ tốc độ tự nhiên, trình phát tua lên khi nghe
// (cao độ giọng được giữ nguyên), nên đổi con số này không cần thu lại.
export const VOICE_SPEED = 1.2;

// Cách trang thư đi theo giọng đọc:
// "ink" là mực hiện dần (lá thư nhạt đi, đọc tới đâu chữ đậm lên tới đó),
// "box" là ô vàng nhảy theo từng chữ.
export const READING_STYLE: "ink" | "box" = "ink";

// Hiệu ứng khi mở lá thư: "book" là lật bìa sách, "envelope" là mở phong thư.
export const OPENING_EFFECT: "book" | "envelope" = "book";

export const THEME_LABELS: Record<string, string> = {
  "co-gang": "Cố gắng",
  "ban-than": "Thành người mình thích",
  "lon-len": "Lớn lên",
  "tinh-yeu": "Tình yêu",
  "khong-lay-long": "Không cần vừa lòng ai",
  "ban-be": "Bạn bè",
  "tuoi-tre": "Tuổi trẻ",
  "uoc-mo": "Ước mơ",
  "ngay-mai": "Ngày mai",
};

export const themeLabel = (theme: string) => THEME_LABELS[theme] ?? theme;
