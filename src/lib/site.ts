// Tên và câu chữ thương hiệu, sửa một chỗ này là đổi toàn trang.
export const site = {
  name: "Khoảng Ngẫm",
  product: "99 ngày thương mình",
  tagline: "Mỗi ngày một lá thư.",
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
