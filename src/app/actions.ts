"use server";

import { recordListenEvent } from "@/server/listens";
import { recordShareEvent } from "@/server/shares";

// Hai hàm ghi số liệu, gọi từ nút lưu ảnh và nút nghe.
// Chỉ là thống kê: ghi không được thì bỏ qua, không được làm hỏng việc người dùng đang làm.

const clean = (letterId: string, token?: string) =>
  [String(letterId).slice(0, 64), token ? String(token).slice(0, 600) : undefined] as const;

export async function recordShare(letterId: string, token?: string): Promise<void> {
  try {
    await recordShareEvent(...clean(letterId, token));
  } catch {}
}

export async function recordListen(letterId: string, token?: string): Promise<void> {
  try {
    await recordListenEvent(...clean(letterId, token));
  } catch {}
}
