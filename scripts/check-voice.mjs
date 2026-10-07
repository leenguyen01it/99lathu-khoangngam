// In bảng độ đều của bản thu giọng đọc, từng câu một: cao độ, độ to và tốc độ nói.
// Chạy hoàn toàn trên máy (ffmpeg), không tốn credit.
//
// Chạy:  node scripts/check-voice.mjs audio/lon-len-01.mp3 [file khác...]
// Mỗi file .mp3 cần file .json cùng tên (mốc thời gian từng ký tự do generate-audio.mjs ghi ra).
import { measure, printReport } from "./voice-metrics.mjs";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Chưa chỉ định file .mp3 nào.");
  process.exit(1);
}
for (const file of files) printReport(file, measure(file));
