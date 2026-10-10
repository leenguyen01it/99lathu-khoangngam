// Nhận diện ẩn danh người đọc thử để đếm số người và số ngày họ quay lại.
// Mã là UUID ngẫu nhiên, không gắn với tên, số điện thoại hay địa chỉ IP.
export const READER_COOKIE = "kn_reader";
/** Middleware chuyển mã vừa tạo cho trang qua header này, vì cookie mới chưa có trong request đầu tiên. */
export const READER_HEADER = "x-kn-reader";

const READER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isReaderId = (value: string | null | undefined): value is string => !!value && READER_ID.test(value);

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|zalo|headless|lighthouse|pagespeed|monitor|curl|wget|python|axios|node-fetch/i;
/** Bot và công cụ không giữ cookie, mỗi lượt sẽ thành một "người" mới nếu không lọc. */
export const isBot = (userAgent: string | null) => !userAgent || BOT.test(userAgent);
