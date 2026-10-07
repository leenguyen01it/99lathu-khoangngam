const ADMIN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const fullDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ADMIN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fullTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: ADMIN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const formatAdminDate = (date: Date) => fullDate.format(date);
export const formatAdminDateTime = (date: Date) => `${fullDate.format(date)} ${fullTime.format(date)}`;
export const formatAdminDayKey = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
