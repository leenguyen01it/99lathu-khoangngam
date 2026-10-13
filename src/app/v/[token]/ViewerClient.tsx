"use client";

import { useEffect, useState } from "react";
import { GiftBook } from "@/components/GiftBook";
import { HeartIcon, LetterReactions } from "@/components/LetterReactions";
import { Locked } from "@/components/Locked";
import { ReadingShell } from "@/components/ReadingShell";
import { Shell } from "@/components/Shell";
import { SocialFooter } from "@/components/SocialFooter";
import { TrialPurchase } from "@/components/TrialPurchase";
import type { Letter } from "@/lib/letters";
import type { WordTiming } from "@/lib/sentences";
import { themeLabel } from "@/lib/site";
import { markTrialRead } from "@/app/doc-thu/actions";
import type { Reactions } from "@/server/reactions";
import { markGiftSeen, setHeart } from "./actions";

interface Props {
  token?: string;
  expiresAt?: string;
  letters: Letter[]; // các lá đã mở, lá mới nhất đứng đầu
  audio: Record<number, WordTiming[]>; // mốc thời gian từng chữ của những lá đã có giọng đọc
  total: number;
  reactions?: Reactions; // tim và số cảm nghĩ của các lá đang hiện
  gift?: { from: string | null; message: string } | null;
  showGiftFirst?: boolean;
}

type View = { kind: "gift" } | { kind: "letter"; n: number } | { kind: "box" };

export function ViewerClient({ token, expiresAt, letters, audio, total, reactions, gift, showGiftFirst }: Props) {
  const todayN = letters[0]?.n ?? 1;
  // Không có token là trang đọc thử: cả bộ mở sẵn nên bắt đầu từ lá số 1 rồi lật tới.
  const trial = !token;
  const [locked, setLocked] = useState(false);
  const [openingToday, setOpeningToday] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [view, setView] = useState<View>(
    showGiftFirst ? { kind: "gift" } : { kind: "letter", n: trial ? 1 : todayN },
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
    // Ghi lại người đọc thử đã lật tới lá nào; lỗi ghi không được làm hỏng việc đọc.
    if (trial && next.kind === "letter") markTrialRead(next.n).catch(() => {});
  };

  const [hearts, setHearts] = useState(() => new Set(reactions?.hearted));
  const [heartCounts, setHeartCounts] = useState(reactions?.heartCounts ?? {});
  const [commentCounts, setCommentCounts] = useState(reactions?.commentCounts ?? {});
  const [onlyHearted, setOnlyHearted] = useState(false);
  // Đổi ngay trên màn hình rồi mới ghi; ghi không được thì trả lại như cũ.
  const toggleHeart = async (letterId: string) => {
    const on = !hearts.has(letterId);
    const apply = (value: boolean) => {
      setHearts((current) => {
        const next = new Set(current);
        if (value) next.add(letterId);
        else next.delete(letterId);
        return next;
      });
      setHeartCounts((current) => ({ ...current, [letterId]: Math.max(0, (current[letterId] ?? 0) + (value ? 1 : -1)) }));
    };
    apply(on);
    try {
      if (await setHeart(token ?? null, letterId, on)) return;
      // Với thẻ thật là phiên chạm thẻ đã hết hạn. Bản đọc thử thì chỉ không ghi được, vẫn đọc tiếp.
      if (token) setLocked(true);
      else apply(!on);
    } catch {
      apply(!on);
    }
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
    const filtering = onlyHearted && hearts.size > 0;
    const boxLetters = (trial ? letters.slice().reverse() : letters).filter((letter) => !filtering || hearts.has(letter.id));
    return (
      <Shell>
        <h1 className="text-[24px] font-bold">Hộp thư của bạn</h1>
        <p className="mt-1 text-[14px] text-sage">
          {trial ? `${total} lá đọc thử, đọc lá nào trước cũng được.` : `Đã mở ${letters.length} trên ${total} lá.`}
        </p>
        {hearts.size > 0 ? (
          <button
            type="button"
            aria-pressed={filtering}
            onClick={() => setOnlyHearted(!filtering)}
            className={`mt-4 flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] transition ${
              filtering ? "border-rose/70 text-rose" : "border-sage/35 text-sage hover:border-gold hover:text-gold"
            }`}
          >
            <HeartIcon filled={filtering} size={15} />
            {filtering ? "Xem tất cả lá đã mở" : `Chỉ xem ${hearts.size} lá đã thả tim`}
          </button>
        ) : null}
        <ul className="mt-5 flex flex-col gap-2.5">
          {gift && !filtering ? (
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
          {boxLetters.map((letter) => (
            <li key={letter.n}>
              <button
                className="w-full rounded-xl border border-sage/25 px-4 py-3 text-left transition hover:border-sage/60"
                onClick={() => go({ kind: "letter", n: letter.n })}
              >
                <span className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-sage">
                  Lá số {letter.n} · {themeLabel(letter.theme)}
                  {hearts.has(letter.id) ? <span className="text-rose"><HeartIcon filled size={13} /></span> : null}
                </span>
                <span className="block truncate text-[15px]">{letter.text}</span>
              </button>
            </li>
          ))}
        </ul>
        {!token ? <><TrialPurchase /><SocialFooter /></> : null}
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
      {reactions ? (
        <LetterReactions
          letterId={letter.id}
          letterN={letter.n}
          hearted={hearts.has(letter.id)}
          heartCount={heartCounts[letter.id] ?? 0}
          commentCount={commentCounts[letter.id] ?? 0}
          token={token ?? null}
          onToggleHeart={() => toggleHeart(letter.id)}
          onCommentCount={(delta) => setCommentCounts((current) => ({ ...current, [letter.id]: Math.max(0, (current[letter.id] ?? 0) + delta) }))}
          onExpired={() => {
            if (token) setLocked(true);
          }}
        />
      ) : null}
      {isToday && todayN >= total ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-sage">
          {trial
            ? `Bạn đã đọc hết ${total} lá đọc thử. 99 lá trong thẻ là những lá khác hẳn, bạn chưa đọc lá nào.`
            : "Bạn đã mở hết các lá thư. Cảm ơn bạn đã ghé mỗi ngày."}
        </p>
      ) : null}
      {!token ?<><TrialPurchase /><SocialFooter /></> : null}
    </ReadingShell>
  );
}
