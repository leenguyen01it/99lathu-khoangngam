import fs from "node:fs";
import path from "node:path";
import type { Letter } from "@/lib/letters";
import { splitWords, type WordTiming } from "@/lib/sentences";

// Giọng đọc của từng lá thư nằm trong thư mục audio/ ở gốc dự án (tạo bằng scripts/generate-audio.mjs).
// Thư mục này không nằm trong public/: file chỉ được phát qua các đường dẫn có kiểm tra quyền.

const AUDIO_DIR = path.join(process.cwd(), "audio");
const ID_PATTERN = /^[a-z0-9-]+$/;

function audioFile(letterId: string, extension: "mp3" | "json"): string | null {
  if (!ID_PATTERN.test(letterId)) return null;
  return path.join(AUDIO_DIR, `${letterId}.${extension}`);
}

interface AlignmentFile {
  text: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
}

/**
 * Mốc thời gian của từng chữ trong bản thu, hoặc null nếu lá thư chưa có giọng đọc.
 * Cũng trả null khi nội dung lá thư đã được sửa sau lúc thu: thà không có nút nghe
 * còn hơn giọng đọc một đằng, chữ một nẻo.
 */
export function getWordTimings(letter: Letter): WordTiming[] | null {
  const mp3 = audioFile(letter.id, "mp3");
  const json = audioFile(letter.id, "json");
  if (!mp3 || !json || !fs.existsSync(mp3) || !fs.existsSync(json)) return null;

  let data: AlignmentFile;
  try {
    data = JSON.parse(fs.readFileSync(json, "utf8")) as AlignmentFile;
  } catch {
    return null;
  }
  if (data.text !== letter.text) return null;

  const starts = data.alignment?.character_start_times_seconds;
  const ends = data.alignment?.character_end_times_seconds;
  // Không có mốc thời gian thì vẫn nghe được, chỉ là không tô sáng chữ đang đọc.
  if (!starts || !ends || starts.length !== letter.text.length) return [];

  const timings: WordTiming[] = [];
  let position = 0;
  for (const word of splitWords(letter.text)) {
    const index = letter.text.indexOf(word, position);
    if (index < 0) return [];
    const last = index + word.length - 1;
    timings.push({ start: starts[index] ?? 0, end: ends[last] ?? 0 });
    position = last + 1;
  }
  return timings;
}

/** Trả file mp3 của một lá thư, có hỗ trợ Range (iPhone bắt buộc phải có mới phát được). */
export function serveAudio(request: Request, letterId: string): Response {
  const file = audioFile(letterId, "mp3");
  if (!file || !fs.existsSync(file)) return new Response("Không có giọng đọc", { status: 404 });

  const buffer = fs.readFileSync(file);
  const total = buffer.length;
  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=100-" là từ byte 100 tới hết; "bytes=-500" là 500 byte cuối
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    return new Response(new Uint8Array(buffer.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(new Uint8Array(buffer), {
    headers: { ...headers, "Content-Length": String(total) },
  });
}
