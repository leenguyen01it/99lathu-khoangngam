// Đo một bản thu giọng đọc theo từng câu: cao độ, độ to, tốc độ nói. Chạy trên máy bằng ffmpeg.
// Dùng chung cho check-voice.mjs (in bảng) và level-voice.mjs (làm đều giọng).
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const RATE = 16000;

function pcm(file) {
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-af", "highpass=f=90,lowpass=f=900", "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"],
    { maxBuffer: 1 << 28 },
  );
  if (result.status !== 0) throw new Error(String(result.stderr));
  return new Float32Array(result.stdout.buffer, result.stdout.byteOffset, result.stdout.length / 4);
}

const median = (values) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
};

/** Cao độ (Hz) của từng khung 40ms có tiếng nói, tìm bằng tự tương quan trong khoảng 90 tới 400 Hz. */
function pitches(samples) {
  const size = 640;
  const step = 320;
  const minLag = Math.floor(RATE / 400);
  const maxLag = Math.ceil(RATE / 90);
  const out = [];
  for (let start = 0; start + size + maxLag < samples.length; start += step) {
    let energy = 0;
    for (let i = 0; i < size; i++) energy += samples[start + i] ** 2;
    if (energy / size < 1e-5) continue;
    let bestLag = 0;
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      let norm = 0;
      for (let i = 0; i < size; i++) {
        sum += samples[start + i] * samples[start + i + lag];
        norm += samples[start + i + lag] ** 2;
      }
      const corr = sum / Math.sqrt(energy * norm + 1e-12);
      if (corr > best) {
        best = corr;
        bestLag = lag;
      }
    }
    if (best > 0.55) out.push(RATE / bestLag);
  }
  return out;
}

const rmsDb = (samples) => {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return 10 * Math.log10(sum / Math.max(1, samples.length) + 1e-12);
};

export const splitSentences = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean);

/**
 * Đo file .mp3, dùng file .json cùng tên (hoặc `metaFile`) để biết mỗi câu nằm ở đoạn nào.
 * Trả về cao độ giữa của cả bài và số liệu từng câu.
 */
export function measure(file, metaFile = file.replace(/\.mp3$/, ".json")) {
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  const starts = meta.alignment.character_start_times_seconds;
  const ends = meta.alignment.character_end_times_seconds;
  const samples = pcm(file);
  const overall = median(pitches(samples));

  const rows = [];
  let position = 0;
  for (const sentence of splitSentences(meta.text)) {
    const index = meta.text.indexOf(sentence, position);
    const last = index + sentence.length - 1;
    position = last + 1;
    const from = starts[index];
    const to = ends[last];
    const slice = samples.subarray(Math.floor(from * RATE), Math.floor(to * RATE));
    const hz = median(pitches(slice));
    rows.push({
      from,
      to,
      hz,
      shift: 12 * Math.log2(hz / overall), // nửa cung so với cả bài
      loud: rmsDb(slice),
      rate: sentence.length / (to - from),
      text: sentence,
    });
  }
  const spread = (key) => Math.max(...rows.map((r) => r[key])) - Math.min(...rows.map((r) => r[key]));
  return {
    overall,
    duration: samples.length / RATE,
    rows,
    spread: { pitch: spread("shift"), loud: spread("loud"), rate: spread("rate") },
  };
}

export function printReport(file, report) {
  console.log(`\n${file}  (cao độ giữa của cả bài: ${report.overall.toFixed(0)} Hz, dài ${report.duration.toFixed(1)}s)`);
  console.log("  câu   thời gian     cao độ   lệch (nửa cung)   độ to     ký tự/giây   mở đầu");
  report.rows.forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}    ${r.from.toFixed(1).padStart(4)}-${r.to.toFixed(1).padEnd(5)}   ${r.hz.toFixed(0).padStart(3)} Hz   ${(r.shift >= 0 ? "+" : "") + r.shift.toFixed(1).padStart(4)}             ${r.loud.toFixed(1)} dB   ${r.rate.toFixed(1).padStart(4)}         ${r.text.slice(0, 34)}`,
    );
  });
  console.log(
    `  Chênh giữa câu cao nhất và thấp nhất: ${report.spread.pitch.toFixed(1)} nửa cung | chênh độ to: ${report.spread.loud.toFixed(1)} dB | chênh tốc độ: ${report.spread.rate.toFixed(1)} ký tự/giây`,
  );
}
