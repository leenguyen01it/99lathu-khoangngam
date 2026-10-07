import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ReadingShell } from "@/components/ReadingShell";
import { dayKey, daysBetween } from "@/lib/day";
import { TOTAL_LETTERS, TRIAL_LETTERS, trialLettersUpTo } from "@/lib/letters";
import { site, themeLabel } from "@/lib/site";
import { getWordTimings } from "@/server/audio";

export const metadata: Metadata = { title: `Đọc thử · ${site.product}` };
export const dynamic = "force-dynamic";

// Bản đọc thử không cần thẻ: mỗi ngày mở thêm một lá trong bộ thư đọc thử riêng.
export default async function TrialPage() {
  const today = dayKey();
  const startedOn = (await cookies()).get("kn_trial")?.value ?? today;
  const opened = Math.min(TRIAL_LETTERS, daysBetween(startedOn, today) + 1);
  const [latest, ...earlier] = trialLettersUpTo(opened);
  if (!latest) return null;

  const timings = getWordTimings(latest);

  return (
    <ReadingShell
      letterId={latest.id}
      paper={{
        eyebrow: themeLabel(latest.theme),
        title: `Lá thư số ${latest.n}`,
        text: latest.text,
        page: latest.n,
      }}
      audio={timings ? { src: `/thu-thu/audio/${latest.n}`, words: timings } : null}
      opening
    >
      {opened >= TRIAL_LETTERS ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-sage">
          Bạn đã đọc hết {TRIAL_LETTERS} lá đọc thử. Trong tấm thẻ là {TOTAL_LETTERS} lá thư khác,
          chưa lá nào bạn từng đọc.
        </p>
      ) : null}
      {earlier.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-gold">
            Những lá đã mở
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {earlier.map((letter) => (
              <li key={letter.n} className="rounded-xl border border-sage/25 px-4 py-3">
                <p className="text-[12px] uppercase tracking-wider text-sage">
                  Lá thư số {letter.n} · {themeLabel(letter.theme)}
                </p>
                <p className="mt-1 font-serif text-[16px] leading-relaxed">{letter.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ReadingShell>
  );
}
