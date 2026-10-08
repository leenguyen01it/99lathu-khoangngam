"use client";

import { useEffect, useState } from "react";
import { GiftBook } from "@/components/GiftBook";
import { Locked } from "@/components/Locked";
import { ReadingShell } from "@/components/ReadingShell";
import { Shell } from "@/components/Shell";
import type { Letter } from "@/lib/letters";
import type { WordTiming } from "@/lib/sentences";
import { themeLabel } from "@/lib/site";
import { markGiftSeen } from "./actions";

interface Props {
  token?: string;
  expiresAt?: string;
  letters: Letter[]; // các lá đã mở, lá mới nhất đứng đầu
  audio: Record<number, WordTiming[]>; // mốc thời gian từng chữ của những lá đã có giọng đọc
  total: number;
  gift?: { from: string | null; message: string } | null;
  showGiftFirst?: boolean;
}

type View = { kind: "gift" } | { kind: "letter"; n: number } | { kind: "box" };

export function ViewerClient({ token, expiresAt, letters, audio, total, gift, showGiftFirst }: Props) {
  const todayN = letters[0]?.n ?? 1;
  const [locked, setLocked] = useState(false);
  const [openingToday, setOpeningToday] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [view, setView] = useState<View>(
    showGiftFirst ? { kind: "gift" } : { kind: "letter", n: todayN },
  );
  // Màn mở phong thư chỉ chạy một lần, ở màn hình đầu tiên sau khi chạm thẻ.
  // Xem lại thư trong hộp thư thì hiện ngay.
  const [firstScreen, setFirstScreen] = useState(true);
  // Vừa lật trang tới một lá thì cuốn sách đứng yên, không mờ dần vào như khi mở từ hộp thư
  const [turned, setTurned] = useState(false);
  const go = (next: View, byTurning = false) => {
    setFirstScreen(false);
    setTurned(byTurning);
    setView(next);
  };

  // Khoá trang đúng lúc phiên hết hạn, kể cả khi tab vừa được mở lại sau một lúc.
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    const check = () => {
      if (Date.now() >= deadline) setLocked(true);
    };
    check();
    const timer = setTimeout(() => setLocked(true), Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [expiresAt]);

  if (locked) return <Locked />;

  if (view.kind === "gift" && gift) {
    return (
      <Shell>
        <GiftBook message={gift.message} from={gift.from} withCover={firstScreen} continuing={openingToday} onContinue={async () => {
          setOpeningToday(true);
          setGiftError(null);
          try {
            if (!token || !await markGiftSeen(token)) {
              setLocked(true);
              return;
            }
            go({ kind: "letter", n: todayN }, true);
          } catch {
            setGiftError("Chưa thể mở thư hôm nay. Bạn thử lại nhé.");
          } finally {
            setOpeningToday(false);
          }
        }} />
        {giftError ? <p role="alert" className="mt-4 text-center text-[14px] text-rose">{giftError}</p> : null}
      </Shell>
    );
  }

  if (view.kind === "box") {
    return (
      <Shell>
        <h1 className="text-[24px] font-bold">Hộp thư của bạn</h1>
        <p className="mt-1 text-[14px] text-sage">
          Đã mở {letters.length} trên {total} lá.
        </p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {gift ? (
            <li>
              <button
                className="w-full rounded-xl border border-gold/50 px-4 py-3 text-left"
                onClick={() => go({ kind: "gift" })}
              >
                <span className="block text-[12px] uppercase tracking-wider text-gold">Lời mở đầu</span>
                <span className="block text-[15px]">
                  {gift.from ? `Lá thư từ ${gift.from}` : "Lá thư gửi riêng cho bạn"}
                </span>
              </button>
            </li>
          ) : null}
          {letters.map((letter) => (
            <li key={letter.n}>
              <button
                className="w-full rounded-xl border border-sage/25 px-4 py-3 text-left transition hover:border-sage/60"
                onClick={() => go({ kind: "letter", n: letter.n })}
              >
                <span className="block text-[12px] uppercase tracking-wider text-sage">
                  Lá số {letter.n} · {themeLabel(letter.theme)}
                </span>
                <span className="block truncate text-[15px]">{letter.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  const n = view.kind === "letter" ? view.n : todayN;
  const letter = letters.find((item) => item.n === n) ?? letters[0];
  if (!letter) return <Locked />;
  const isToday = letter.n === todayN;
  const toPaper = (item: Letter) => ({
    eyebrow: themeLabel(item.theme),
    title: `Lá thư số ${item.n}`,
    text: item.text,
    page: item.n,
  });
  const paper = toPaper(letter);
  // Hai lá liền kề đã mở, để lật trang qua lại như trong sách
  const previous = letters.find((item) => item.n === letter.n - 1);
  const next = letters.find((item) => item.n === letter.n + 1);

  const timings = audio[letter.n];

  return (
    <ReadingShell
      key={letter.n}
      letterId={letter.id}
      token={token}
      paper={paper}
      audio={timings ? { src: token ? `/v/${token}/audio/${letter.n}` : `/doc-thu/audio/${letter.n}`, words: timings } : null}
      opening={firstScreen}
      settled={turned}
      previous={previous ? toPaper(previous) : null}
      next={next ? toPaper(next) : null}
      onTurn={(direction) => go({ kind: "letter", n: letter.n + direction }, true)}
      actionBefore={
        letters.length > 1 || gift ? (
          <button
            type="button"
            onClick={() => go({ kind: "box" })}
            aria-label="Xem hộp thư"
            title="Xem hộp thư"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage/35 text-paper transition hover:border-gold hover:text-gold"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 6.5h16v11H4z" />
              <path d="m4.5 7 7.5 6 7.5-6" />
            </svg>
          </button>
        ) : null
      }
    >
      {isToday && todayN >= total ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-sage">
          Bạn đã mở hết các lá thư. Cảm ơn bạn đã ghé mỗi ngày.
        </p>
      ) : null}
    </ReadingShell>
  );
}
