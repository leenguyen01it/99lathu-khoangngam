// Thu thử một lá thư với cài đặt giọng khác, để so sánh trước khi thu cả bộ.
// Bản thu thử nằm trong audio/_thu/ và không được trang web phát.
// Mỗi lần chạy tốn credit bằng số ký tự của lá thư. Bản nào đã có thì bỏ qua.
//
// Chạy:  node --env-file=.env scripts/try-voice.mjs <id> <nhãn> '<cài đặt JSON>' [seed]
// Ví dụ: node --env-file=.env scripts/try-voice.mjs lon-len-01 on-dinh-08 '{"stability":0.8}'
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "audio", "_thu");
// Thẻ cảm xúc đặt trước lá thư, ví dụ --tag="[calm, warm, gentle]", để ấn định một tâm trạng cho cả bài
const tag = process.argv.find((arg) => arg.startsWith("--tag="))?.slice(6) ?? "";
const [id, label, settingsJson, seed] = process.argv.slice(2).filter((arg) => !arg.startsWith("--tag="));
const { ELEVENLABS_API_KEY: apiKey, ELEVENLABS_VOICE_ID: voiceId } = process.env;
const model = process.env.ELEVENLABS_MODEL_ID || "eleven_v4";

if (!apiKey || !voiceId) throw new Error("Thiếu ELEVENLABS_API_KEY hoặc ELEVENLABS_VOICE_ID.");
if (!id || !label || !settingsJson) throw new Error("Cần: <id> <nhãn> '<cài đặt JSON>' [seed]");

const read = (file) => JSON.parse(fs.readFileSync(path.join(root, "content", file), "utf8")).letters;
const letter = [...read("letters.json"), ...read("trial-letters.json")].find((item) => item.id === id);
if (!letter) throw new Error(`Không có lá thư ${id}`);

fs.mkdirSync(outDir, { recursive: true });
const mp3 = path.join(outDir, `${id}-${label}.mp3`);
if (fs.existsSync(mp3)) {
  console.log(`${id}-${label}: đã có, bỏ qua`);
  process.exit(0);
}

const settings = JSON.parse(settingsJson);
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: tag ? `${tag} ${letter.text}` : letter.text,
      model_id: model,
      voice_settings: settings,
      ...(seed ? { seed: Number(seed) } : {}),
    }),
    signal: AbortSignal.timeout(180_000),
  },
);
if (!response.ok) {
  console.error(`ElevenLabs trả lỗi ${response.status} ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
const result = await response.json();
fs.writeFileSync(mp3, Buffer.from(result.audio_base64, "base64"));

// Mốc thời gian trả về có thể gồm cả các ký tự của thẻ cảm xúc. Chỉ giữ phần ứng với nội dung lá thư,
// để file .json khớp từng ký tự với lá thư như các bản thu khác.
let alignment = result.alignment ?? null;
if (alignment) {
  const offset = alignment.characters.join("").lastIndexOf(letter.text);
  if (offset < 0) {
    console.warn("Không tìm thấy nội dung lá thư trong mốc thời gian trả về; bỏ mốc thời gian.");
    alignment = null;
  } else {
    const cut = (list) => list.slice(offset, offset + letter.text.length);
    alignment = {
      characters: cut(alignment.characters),
      character_start_times_seconds: cut(alignment.character_start_times_seconds),
      character_end_times_seconds: cut(alignment.character_end_times_seconds),
    };
  }
}
fs.writeFileSync(
  mp3.replace(/\.mp3$/, ".json"),
  JSON.stringify({ id, label, model, settings, tag, seed: seed ? Number(seed) : null, text: letter.text, alignment }),
);
const sent = letter.text.length + (tag ? tag.length + 1 : 0);
console.log(`${id}-${label}: đã tạo (${sent} ký tự gửi đi${tag ? `, gồm thẻ ${tag}` : ""})`);
