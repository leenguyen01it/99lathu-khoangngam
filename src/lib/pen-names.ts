// Tên của một thẻ trong phần cảm nghĩ dưới lá thư. Hệ thống đặt sẵn một bút danh,
// ghép một hình ảnh với một nét thời gian hoặc tính cách; người cầm thẻ đổi được thành tên của mình.

const THINGS = [
  "Mây", "Gió", "Mưa", "Nắng", "Sương", "Áng Mây", "Làn Gió", "Cơn Mưa", "Tia Nắng", "Vệt Nắng",
  "Hạt Mưa", "Giọt Sương", "Chiếc Lá", "Nhành Lá", "Ngọn Cỏ", "Khóm Trúc", "Rặng Tre", "Cành Mai", "Đóa Sen", "Bông Lúa",
  "Vầng Trăng", "Ngôi Sao", "Khoảng Trời", "Mặt Hồ", "Dòng Suối", "Con Sóng", "Bến Sông", "Con Đò", "Bờ Cát", "Ngọn Đồi",
  "Cánh Chim", "Cánh Diều", "Lối Nhỏ", "Góc Vườn", "Mái Hiên", "Ô Cửa", "Ngọn Đèn", "Tách Trà", "Trang Sách", "Tiếng Chuông",
  "Hương Cốm", "Mùi Mưa", "Khói Bếp", "Giàn Hoa", "Hàng Cau", "Bờ Tre", "Đồng Cỏ", "Triền Đê", "Phiến Đá", "Nhịp Cầu",
];

const MOODS = [
  "Chiều", "Sớm", "Ban Mai", "Cuối Ngày", "Giữa Trưa", "Đêm Hè", "Sau Mưa", "Đầu Mùa", "Chớm Thu", "Cuối Thu",
  "Đầu Xuân", "Mùa Hạ", "Mùa Đông", "Tháng Ba", "Tháng Mười", "Tháng Chạp", "Ngày Cũ", "Hôm Nay", "Bình Yên", "Lặng Lẽ",
  "Dịu Dàng", "Thong Thả", "Thảnh Thơi", "An Nhiên", "Hiền Lành", "Tinh Khôi", "Khe Khẽ", "Chậm Rãi", "Nho Nhỏ", "Xa Xa",
  "Đầu Ngõ", "Lưng Đồi", "Bên Sông", "Ven Hồ", "Trong Vườn", "Phương Nam", "Miền Xa", "Cuối Phố", "Trên Cao", "Rất Khẽ",
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)] as T;

export function randomPenName(): string {
  return `${pick(THINGS)} ${pick(MOODS)}`;
}

/** Số lần người cầm thẻ được đổi tên. */
export const PEN_NAME_CHANGES = 5;
export const PEN_NAME_MAX = 24;

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();
// Tên dễ bị hiểu là người của Khoảng Ngẫm. So khớp sau khi bỏ dấu, nên chỉ để những cụm
// không trùng tên người thật ("ho tro" sẽ chặn nhầm "Hồ Trọng", "quan tri" chặn nhầm "Quân Trí").
const RESERVED = ["khoang ngam", "khoangngam", "admin", "quan tri vien", "99 la thu"];

/**
 * Chuẩn hoá tên người dùng tự gõ. Chỉ nhận chữ, số và dấu cách, từ 2 tới PEN_NAME_MAX ký tự.
 * Trả null nếu tên không dùng được.
 */
export function cleanPenName(input: string): string | null {
  const name = input.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > PEN_NAME_MAX) return null;
  if (!/^[\p{L}\p{N} ]+$/u.test(name) || !/\p{L}/u.test(name)) return null;
  const flat = plain(name);
  return RESERVED.some((word) => flat.includes(word)) ? null : name;
}

const COLORS = ["#ecc98a", "#bcd3bd", "#dc9b86", "#9cc4c9", "#c9b3d6", "#e3d7a5", "#a8c99a", "#e0b4a0"];

/**
 * Số màu của vòng tròn đại diện, tính từ một chuỗi cố định của thẻ.
 * Hai người trùng tên vẫn thường khác màu, và đổi tên thì màu vẫn giữ.
 */
export function penTone(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % COLORS.length;
}

export const penToneColor = (tone: number) => COLORS[tone % COLORS.length] as string;

