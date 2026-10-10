import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { ViewerClient } from "@/app/v/[token]/ViewerClient";
import { dayKey, daysBetween } from "@/lib/day";
import { TRIAL_LETTERS, trialLettersUpTo } from "@/lib/letters";
import type { WordTiming } from "@/lib/sentences";
import { site } from "@/lib/site";
import { READER_COOKIE, READER_HEADER, isBot, isReaderId } from "@/lib/trial-reader";
import { getWordTimings } from "@/server/audio";
import { recordTrialVisit } from "@/server/trial";

const title = `Đọc thử ${TRIAL_LETTERS} lá thư miễn phí`;
const description = `Đọc thử ${TRIAL_LETTERS} lá thư của ${site.product}, mỗi ngày mở thêm một lá. Có giọng đọc, không cần ứng dụng, không cần tài khoản.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/doc-thu" },
  // Khai báo openGraph ở trang con thì không còn thừa hưởng ảnh của layout, nên phải ghi lại ảnh.
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "vi_VN",
    url: "/doc-thu",
    title,
    description,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: `${site.product} của ${site.name}` }],
  },
};
export const dynamic = "force-dynamic";

// Mỗi ngày mở thêm một lá; dùng chung giao diện đọc và hộp thư với thẻ thật.
export default async function TrialPage() {
  const today = dayKey();
  const jar = await cookies();
  const startedOn = jar.get("kn_trial")?.value ?? today;
  const opened = Math.min(TRIAL_LETTERS, daysBetween(startedOn, today) + 1);

  // Đếm người đọc thử sau khi đã trả trang, để lỗi database không làm hỏng trang đọc.
  // Bỏ qua bot và lượt tải trước (prefetch) của trình duyệt.
  const head = await headers();
  const cookieId = jar.get(READER_COOKIE)?.value;
  const readerId = isReaderId(cookieId) ? cookieId : head.get(READER_HEADER);
  const prefetch = head.has("next-router-prefetch") || /prefetch/i.test(head.get("sec-purpose") ?? head.get("purpose") ?? "");
  if (isReaderId(readerId) && !prefetch && !isBot(head.get("user-agent"))) {
    after(() => recordTrialVisit(readerId, startedOn, today, opened).catch((error) => console.error("recordTrialVisit", error)));
  }
  const letters = trialLettersUpTo(opened);
  const audio: Record<number, WordTiming[]> = {};
  for (const letter of letters) {
    const timings = getWordTimings(letter);
    if (timings) audio[letter.n] = timings;
  }

  return <ViewerClient letters={letters} audio={audio} total={TRIAL_LETTERS} />;
}
