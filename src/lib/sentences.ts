/** Tách một lá thư thành từng câu. Dùng cho hiệu ứng hiện chữ dần. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

/**
 * Tách thành từng chữ (ngăn bởi khoảng trắng). Thứ tự chữ ở đây là thứ tự dùng để tô sáng
 * theo giọng đọc, nên máy chủ và trang thư phải cùng dùng hàm này.
 */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Thời điểm một chữ được đọc trong bản thu, tính bằng giây. */
export interface WordTiming {
  start: number;
  end: number;
}
