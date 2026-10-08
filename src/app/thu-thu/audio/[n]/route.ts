import { cookies } from "next/headers";
import { dayKey, daysBetween } from "@/lib/day";
import { TRIAL_LETTERS, trialLettersUpTo } from "@/lib/letters";
import { serveAudio } from "@/server/audio";

export const dynamic = "force-dynamic";

// Giọng đọc của một lá đọc thử. Chỉ phát những lá mà người này đã tới ngày được mở.
export async function GET(request: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const today = dayKey();
  const startedOn = (await cookies()).get("kn_trial")?.value ?? today;
  const opened = Math.min(TRIAL_LETTERS, daysBetween(startedOn, today) + 1);

  const letter = trialLettersUpTo(opened).find((item) => item.n === Number(n));
  if (!letter) return new Response("Lá thư này chưa được mở", { status: 403 });
  return serveAudio(request, letter.id);
}
