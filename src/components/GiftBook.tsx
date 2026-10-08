"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BookCover } from "./BookCover";

// Khoảng cách giữa các cột khi chữ được chia trang, khớp với .pager__flow trong globals.css
const GAP = 32;

/** Số La Mã thường (i, ii, iii...), như số trang phần đầu sách. */
function roman(n: number): string {
  const table: [string, number][] = [
    ["x", 10],
    ["ix", 9],
    ["v", 5],
    ["iv", 4],
    ["i", 1],
  ];
  let out = "";
  let rest = n;
  for (const [symbol, value] of table) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

interface Content {
  message: string;
  from: string | null;
}

/**
 * Một trang của lá thư tặng.
 * Chữ chảy thành các cột rộng đúng bằng trang (CSS multi-column), `index` chọn cột đang hiện.
 * Nhờ vậy trình duyệt tự ngắt trang đúng theo cỡ chữ và bề rộng màn hình.
 */
function Page({
  message,
  from,
  index,
  count,
  flowRef,
  className = "",
  onAnimationEnd,
}: Content & {
  index: number;
  count: number;
  flowRef?: React.Ref<HTMLDivElement>;
  className?: string;
  onAnimationEnd?: () => void;
}) {
  return (
    <article
      className={`flex flex-col bg-paper px-6 py-7 text-ink ${className}`}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="pager">
        <div
          ref={flowRef}
          className="pager__flow"
          style={{ transform: `translateX(calc(${-index} * (100% + ${GAP}px)))` }}
        >
          <header className="break-inside-avoid pb-5">
            <h1 className="text-[22px] font-bold leading-tight">
              Có một lá thư gửi riêng cho bạn
            </h1>
            <div aria-hidden="true" className="mt-1 h-0.5 w-12 rounded-full bg-deep/60" />
          </header>
          {/* Mỗi đoạn là một khối riêng: khoảng cách giữa hai đoạn tự biến mất khi rơi đúng đầu trang */}
          {message
            .split(/\n\s*\n/)
            .filter((paragraph) => paragraph.trim())
            .map((paragraph, i) => (
              <p
                key={i}
                className={`whitespace-pre-line break-words font-serif text-[18px] leading-[1.75] ${i > 0 ? "mt-[1.75em]" : ""}`}
              >
                {paragraph.trim()}
              </p>
            ))}
          {from ? (
            <p className="break-inside-avoid break-words pt-6 text-right font-serif text-[16px] italic text-deep">
              {from}
            </p>
          ) : null}
        </div>
      </div>
      {count > 1 ? (
        <div className="-mb-3 flex items-center justify-between pt-4 font-serif text-[14px] text-deep/80">
          <span />
          <span>
            {roman(index + 1)}
          </span>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Lá thư của người tặng, đặt trong cuốn sách.
 * Thư dài hơn một trang thì dùng nút Trước/Tiếp để chuyển trang.
 */
export function GiftBook({ message, from, withCover, onContinue, continuing = false }: Content & {
  withCover: boolean;
  onContinue?: () => void;
  continuing?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(1);
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  const [coverGone, setCoverGone] = useState(!withCover);
  const flowRef = useRef<HTMLDivElement>(null);

  // Đếm số trang: bề rộng toàn bộ các cột chia cho bề rộng một trang.
  useLayoutEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const measure = () => {
      const width = flow.clientWidth;
      if (!width) return;
      const pages = Math.max(1, Math.round((flow.scrollWidth + GAP) / (width + GAP)));
      setCount(pages);
      setPage((current) => Math.min(current, pages - 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(flow);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [message, from]);

  const turnTo = (to: number) => {
    if (turn || to < 0 || to >= count || to === page) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPage(to);
    else setTurn({ from: page, to });
  };

  const forward = turn ? turn.to > turn.from : false;
  // Khi lật tới: trang mới nằm dưới, trang cũ là tờ đang lật đi.
  // Khi lật lui: trang hiện tại nằm dưới, trang trước là tờ đang lật về.
  const baseIndex = turn ? (forward ? turn.to : turn.from) : page;

  return (
    <>
    <div className="book letter-in">
      <div className="book__back" />
      <div className="book__pages" />
      <Page message={message} from={from} index={baseIndex} count={count} flowRef={flowRef} />
      {turn ? (
        <Page
          message={message}
          from={from}
          index={forward ? turn.from : turn.to}
          count={count}
          className={`book__leaf ${forward ? "book__leaf--out" : "book__leaf--in"}`}
          onAnimationEnd={() => {
            setPage(turn.to);
            setTurn(null);
          }}
        />
      ) : null}
      {!coverGone ? <BookCover onOpened={() => setCoverGone(true)} /> : null}
    </div>
    {count > 1 || onContinue ? (
      <div className="mt-4">
        <nav aria-label="Các trang lời tặng" className="flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" aria-label="Trang trước" disabled={page === 0 || Boolean(turn) || continuing} onClick={() => { setCoverGone(true); turnTo(page - 1); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span role="status" aria-live="polite" aria-atomic="true" className="text-[14px] text-sage">{continuing ? "Đang mở…" : `Lời mở đầu · ${page + 1}/${count}`}</span>
          <button type="button" className="btn-ghost" aria-label={page === count - 1 && onContinue ? "Mở lá thư hôm nay" : "Trang tiếp"} title={page === count - 1 && onContinue ? "Mở lá thư hôm nay" : "Trang tiếp"} aria-busy={continuing} disabled={(page === count - 1 && !onContinue) || Boolean(turn) || continuing} onClick={() => {
            setCoverGone(true);
            if (page === count - 1) onContinue?.();
            else turnTo(page + 1);
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </nav>
      </div>
    ) : null}
    </>
  );
}
