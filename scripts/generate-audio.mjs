// Tạo giọng đọc cho lá thư bằng ElevenLabs. Mỗi lá chỉ tạo một lần: lá nào đã có file thì bỏ qua,
// nên chạy lại không tốn thêm credit. Muốn tạo lại một lá thì xoá file của nó trong thư mục audio/.
//
// Chạy:  node --env-file=.env scripts/generate-audio.mjs <id> [<id>...]   (ví dụ: lon-len-01 doc-thu-01)
//        node --env-file=.env scripts/generate-audio.mjs --all
//
// Cần ba biến môi trường: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, và tuỳ chọn ELEVENLABS_MODEL_ID.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "audio");
const VOICE_SETTINGS = { stability: 0.5 }; // giống cài đặt giọng thân bài của kênh
const MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_v4";
// Thẻ cảm xúc đặt trước mỗi lá thư để cả bài giữ một tâm trạng. Không có thẻ, model tự diễn
// từng câu một kiểu và câu mở đầu hay vút lên. Đã nghe thử và chốt ngày 2026-10-07.
const VOICE_TAG = "[calm, warm, gentle]";

const { ELEVENLABS_API_KEY: apiKey, ELEVENLABS_VOICE_ID: voiceId } = process.env;
if (!apiKey || !voiceId) {
  console.error("Thiếu ELEVENLABS_API_KEY hoặc ELEVENLABS_VOICE_ID trong môi trường.");
  process.exit(1);
}

const read = (file) => JSON.parse(fs.readFileSync(path.join(root, "content", file), "utf8")).letters;
const letters = [...read("letters.json"), ...read("trial-letters.json")];
const args = process.argv.slice(2);
const wanted = args.includes("--all") ? letters : args.map((id) => letters.find((l) => l.id === id) ?? id);

const unknown = wanted.filter((item) => typeof item === "string");
if (!wanted.length || unknown.length) {
  console.error(unknown.length ? `Không có lá thư nào mang id: ${unknown.join(", ")}` : "Chưa chỉ định lá thư nào.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
let used = 0;
for (const letter of wanted) {
  const mp3 = path.join(outDir, `${letter.id}.mp3`);
  if (fs.existsSync(mp3)) {
    console.log(`${letter.id}: đã có, bỏ qua`);
    continue;
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${VOICE_TAG} ${letter.text}`,
        model_id: MODEL,
        voice_settings: VOICE_SETTINGS,
      }),
      signal: AbortSignal.timeout(180_000),
    },
  );
  if (!response.ok) {
    console.error(`${letter.id}: ElevenLabs trả lỗi ${response.status} ${(await response.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const result = await response.json();
  fs.writeFileSync(mp3, Buffer.from(result.audio_base64, "base64"));
  // Mốc thời gian từng ký tự, để tô sáng câu đang được đọc. Kết quả trả về gồm cả các ký tự của thẻ
  // cảm xúc: chỉ giữ phần ứng với nội dung lá thư, để file .json khớp từng ký tự với lá thư.
  let alignment = result.alignment ?? null;
  if (alignment) {
    const offset = alignment.characters.join("").lastIndexOf(letter.text);
    const cut = (list) => list.slice(offset, offset + letter.text.length);
    alignment =
      offset < 0
        ? null
        : {
            characters: cut(alignment.characters),
            character_start_times_seconds: cut(alignment.character_start_times_seconds),
            character_end_times_seconds: cut(alignment.character_end_times_seconds),
          };
  }
  fs.writeFileSync(
    path.join(outDir, `${letter.id}.json`),
    JSON.stringify({ id: letter.id, model: MODEL, tag: VOICE_TAG, text: letter.text, alignment }),
  );
  const sent = letter.text.length + VOICE_TAG.length + 1;
  used += sent;
  console.log(`${letter.id}: đã tạo (${sent} ký tự)${alignment ? "" : ", KHÔNG có mốc thời gian"}`);
}
console.log(`Xong. Số ký tự đã gửi đi trong lần chạy này: ${used}`);
