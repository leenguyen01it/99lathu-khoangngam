import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ViewerClient } from "@/app/v/[token]/ViewerClient";
import { dayKey, daysBetween } from "@/lib/day";
import { TRIAL_LETTERS, trialLettersUpTo } from "@/lib/letters";
import type { WordTiming } from "@/lib/sentences";
import { site } from "@/lib/site";
import { getWordTimings } from "@/server/audio";

export const metadata: Metadata = { title: `Đọc thử · ${site.product}` };
export const dynamic = "force-dynamic";

// Mỗi ngày mở thêm một lá; dùng chung giao diện đọc và hộp thư với thẻ thật.
export default async function TrialPage() {
  const today = dayKey();
  const startedOn = (await cookies()).get("kn_trial")?.value ?? today;
  const opened = Math.min(TRIAL_LETTERS, daysBetween(startedOn, today) + 1);
  const letters = trialLettersUpTo(opened);
  const audio: Record<number, WordTiming[]> = {};
  for (const letter of letters) {
    const timings = getWordTimings(letter);
    if (timings) audio[letter.n] = timings;
  }

  return <ViewerClient letters={letters} audio={audio} total={TRIAL_LETTERS} />;
}
