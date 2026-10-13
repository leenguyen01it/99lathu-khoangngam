import { TRIAL_LETTERS, trialLettersUpTo } from "@/lib/letters";
import { serveAudio } from "@/server/audio";

export const dynamic = "force-dynamic";

// Giọng đọc của một lá đọc thử. Cả bộ đọc thử đều mở sẵn.
export async function GET(request: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const letter = trialLettersUpTo(TRIAL_LETTERS).find((item) => item.n === Number(n));
  if (!letter) return new Response("Không có lá thư này", { status: 404 });
  return serveAudio(request, letter.id);
}
