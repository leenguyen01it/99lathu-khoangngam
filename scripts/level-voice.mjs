// Làm đều giọng trong một bản thu: giọng đọc AI thường mở đầu cao và to, rồi trầm và nhỏ dần về cuối.
// Script kéo cao độ và độ to của từng câu về gần mức chung của cả bài. Chạy trên máy bằng ffmpeg,
// không tốn credit, không đổi độ dài nên mốc thời gian từng câu vẫn dùng được.
//
// Chạy:  node scripts/level-voice.mjs <vào.mp3> <ra.mp3> [mức chỉnh cao độ 0..1, mặc định 0.8]
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { measure, printReport } from "./voice-metrics.mjs";

const [input, output, strengthArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("Cần: <vào.mp3> <ra.mp3> [mức chỉnh cao độ 0..1]");
  process.exit(1);
}
// Không kéo về 0 hẳn: một phần chênh lệch là tự nhiên (thanh điệu của từng câu khác nhau).
const strength = strengthArg === undefined ? 0.8 : Number(strengthArg);
const MAX_SHIFT = 2.5; // nửa cung; chỉnh nhiều hơn thế thì dễ nghe ra tiếng máy

const metaFile = input.replace(/\.mp3$/, ".json");
const before = measure(input, metaFile);
const rows = before.rows;
const targetLoud = [...rows].map((r) => r.loud).sort((a, b) => a - b)[rows.length >> 1];

const parts = rows.map((row, i) => {
  // Cắt ở giữa quãng nghỉ giữa hai câu, nên không cắt vào tiếng nói
  const start = i === 0 ? 0 : (rows[i - 1].to + row.from) / 2;
  const end = i === rows.length - 1 ? null : (row.to + rows[i + 1].from) / 2;
  const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, -row.shift * strength));
  const gain = Math.max(-6, Math.min(6, targetLoud - row.loud));
  const trim = end === null ? `atrim=start=${start.toFixed(4)}` : `atrim=start=${start.toFixed(4)}:end=${end.toFixed(4)}`;
  return {
    shift,
    gain,
    filter: `[0:a]${trim},asetpts=PTS-STARTPTS,rubberband=pitch=${(2 ** (shift / 12)).toFixed(5)}:formant=preserved:pitchq=quality,volume=${gain.toFixed(2)}dB[s${i}]`,
  };
});
const graph = `${parts.map((p) => p.filter).join(";")};${parts.map((_, i) => `[s${i}]`).join("")}concat=n=${parts.length}:v=0:a=1,alimiter=limit=0.95[out]`;

const run = spawnSync(
  "ffmpeg",
  ["-y", "-v", "error", "-i", input, "-filter_complex", graph, "-map", "[out]", "-ar", "44100", "-b:a", "128k", output],
  { encoding: "utf8" },
);
if (run.status !== 0) {
  console.error(run.stderr);
  process.exit(1);
}
// Độ dài không đổi nên dùng lại mốc thời gian của bản gốc
if (metaFile !== output.replace(/\.mp3$/, ".json")) fs.copyFileSync(metaFile, output.replace(/\.mp3$/, ".json"));

console.log("Đã chỉnh từng câu:");
parts.forEach((p, i) =>
  console.log(`  câu ${i + 1}: cao độ ${p.shift >= 0 ? "+" : ""}${p.shift.toFixed(2)} nửa cung, độ to ${p.gain >= 0 ? "+" : ""}${p.gain.toFixed(1)} dB`),
);
printReport(`TRƯỚC  ${input}`, before);
printReport(`SAU    ${output}`, measure(output));
