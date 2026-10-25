"use client";

import { useEffect, useRef } from "react";
import { splitSentences, splitWords } from "@/lib/sentences";
import type { ReadingStyle } from "@/server/scans";

// Chữ bắt đầu thấm ra giấy sau khi tờ thư hiện lên được REVEAL_START giây (globals.css: .ink-reveal).
const REVEAL_START = 0.15;

/**
 * Lớp CSS của một chữ khi đang nghe giọng đọc.
 * `active` là thứ tự chữ đang được đọc: null là không nghe, -1 là đang nghe nhưng chưa đọc tới chữ nào.
 */
function wordClass(index: number, active: number | null | undefined, readingStyle: ReadingStyle): string {
  if (active === null || active === undefined) return "word";
  if (readingStyle === "off") return "word";
  if (readingStyle === "box") return index === active ? "word reading" : "word";
  // Mực hiện dần: chữ đã đọc thì đậm, chữ chưa đọc thì nhạt
  return index <= active ? "word" : "word word--unread";
}

/** Nút lật trang ở chân tờ thư. Không có trang để lật thì giữ chỗ trống cho số trang nằm giữa. */
function PageButton({ label, show, side, onTurn, children }: {
  label: string;
  show: boolean;
  side: "left" | "right";
  onTurn?: () => void;
  children: React.ReactNode;
}) {
  if (!show) return <span aria-hidden="true" className="h-11 w-11" />;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Mũi tên nằm sát mép giấy, vùng chạm vẫn đủ 44px lan vào trong
      className={`inline-flex h-11 w-11 items-center text-deep ${side === "left" ? "justify-start" : "justify-end"}`}
      onClick={(event) => {
        event.stopPropagation();
        onTurn?.();
      }}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/**
 * Tờ giấy của một lá thư.
 * - `revealDelay` (giây): chữ thấm dần từ trên xuống như mực loang, bắt đầu sau khoảng trễ đó. Bỏ trống thì hiện ngay.
 * - `still`: tờ giấy đứng yên từ đầu, không tự mờ dần hiện ra (dùng khi có bìa sách che phía trên).
 * - `activeWord`: thứ tự chữ đang được giọng đọc đọc tới. null là không nghe, -1 là đang nghe
 *   nhưng chưa tới chữ đầu tiên. Bỏ trống hẳn nếu lá thư không có giọng đọc.
 */
export function LetterPaper({
  eyebrow,
  title,
  text,
  signature,
  page,
  revealDelay,
  still = false,
  activeWord,
  hasAudio = false,
  readingStyle = "box",
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  className = "",
  onAnimationEnd,
}: {
  eyebrow: string;
  title: string;
  text: string;
  signature?: string;
  page?: number;
  revealDelay?: number;
  still?: boolean;
  activeWord?: number | null;
  hasAudio?: boolean;
  readingStyle?: ReadingStyle;
  hasPrevious?: boolean; // có trang trước để lật về: hiện nút lật ở góc dưới trái
  hasNext?: boolean; // có trang sau để lật tới: hiện nút lật ở góc dưới phải
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
  onAnimationEnd?: () => void;
}) {
  const reveal = revealDelay !== undefined;
  const karaoke = activeWord !== undefined;
  // Chỉ tách câu và chữ khi cần tô sáng từng chữ theo giọng đọc.
  const sentences = karaoke ? splitSentences(text) : null;
  let wordIndex = 0;
  const articleRef = useRef<HTMLElement>(null);

  // Trang sách cao cố định, thư dài thì cuộn bên trong. Khi nghe giọng đọc, chữ đang đọc trôi
  // xuống gần mép dưới (hoặc khuất phía trên) thì cuộn trang để chữ đó nằm ở khoảng một phần ba trang.
  useEffect(() => {
    const article = articleRef.current;
    if (!article || activeWord === null || activeWord === undefined || activeWord < 0) return;
    if (article.scrollHeight <= article.clientHeight) return;
    const word = article.querySelectorAll(".word")[activeWord];
    if (!(word instanceof HTMLElement)) return;
    const top = word.getBoundingClientRect().top - article.getBoundingClientRect().top;
    if (top > 0 && top < article.clientHeight * 0.75) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    article.scrollTo({ top: article.scrollTop + top - article.clientHeight / 3, behavior: reduce ? "auto" : "smooth" });
  }, [activeWord]);

  // Còn chữ bên dưới chưa cuộn tới thì bật data-more để hiện dải giấy mờ ở mép dưới (globals.css).
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const update = () => {
      const more = article.scrollHeight - article.clientHeight - article.scrollTop > 4;
      article.toggleAttribute("data-more", more);
    };
    update();
    article.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(article);
    const body = article.querySelector("p");
    if (body) observer.observe(body);
    return () => {
      article.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [text]);

  return (
    <article
      ref={articleRef}
      className={`flex flex-col rounded-2xl bg-paper px-6 py-7 text-ink shadow-xl shadow-black/25 ${still ? "" : "letter-in"} ${className}`}
      style={reveal && !still ? { animationDelay: `${revealDelay}s` } : undefined}
      onAnimationEnd={
        onAnimationEnd
          ? (event) => {
              if (event.target === event.currentTarget) onAnimationEnd();
            }
          : undefined
      }
    >
      <h1 className={`text-[22px] font-bold leading-tight ${hasAudio ? "pr-10" : ""}`}>{title}</h1>
      <div aria-hidden="true" className="mt-1 h-0.5 w-12 rounded-full bg-deep/60" />
      <div
        className={reveal ? "ink-reveal" : undefined}
        style={reveal ? { animationDelay: `${(revealDelay ?? 0) + REVEAL_START}s` } : undefined}
      >
        <p className="mt-3 whitespace-pre-line font-serif text-[18px] leading-[1.75]">
          {sentences
            ? sentences.map((sentence, i) => (
                <span key={i}>
                  {splitWords(sentence).map((word) => {
                    const index = wordIndex++;
                    return (
                      <span key={index}>
                        <span className={wordClass(index, activeWord, readingStyle)}>{word}</span>{" "}
                      </span>
                    );
                  })}
                </span>
              ))
            : text}
        </p>
        {signature ? (
          <p className="mt-6 text-right font-serif text-[16px] italic text-deep">{signature}</p>
        ) : null}
      </div>
      {page !== undefined ? (
        // Số trang ở giữa, hai bên là nút lật cho người không quen vuốt.
        // Nút chặn sự kiện chạm để cuốn sách bên ngoài không lật thêm lần nữa.
        <nav aria-label="Lật trang" className="-mx-4 -mb-4 mt-auto flex items-center justify-between pt-6 font-serif text-[14px] text-deep/80">
          <PageButton label="Lá trước" show={hasPrevious} side="left" onTurn={onPrevious}>
            <path d="m15 18-6-6 6-6" />
          </PageButton>
          <span>{page}</span>
          <PageButton label="Lá tiếp" show={hasNext} side="right" onTurn={onNext}>
            <path d="m9 6 6 6-6 6" />
          </PageButton>
        </nav>
      ) : null}
    </article>
  );
}
