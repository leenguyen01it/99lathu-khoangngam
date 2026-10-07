"use client";

import { useState } from "react";
import { OPENING_EFFECT } from "@/lib/site";
import { BookCover } from "./BookCover";
import { Envelope } from "./Envelope";
import { LetterPaper } from "./LetterPaper";

// Thời điểm chữ bắt đầu hiện, khớp với các mốc thời gian trong globals.css:
// bìa sách khuất hẳn sau khoảng 1,45 giây; lớp phủ phong thư bắt đầu mờ lúc 1,45 giây.
export const BOOK_SECONDS = 1.45;
const ENVELOPE_SECONDS = 1.45;

interface Paper {
  eyebrow: string;
  title: string;
  text: string;
  signature?: string;
  page?: number;
  activeWord?: number | null;
}

/** Thân cuốn sách: bìa sau, xấp giấy, rồi trang thư nằm trên. */
export function Book({
  children,
  cover,
  onClick,
  onTouchStart,
  onTouchEnd,
  animate = true,
}: {
  children: React.ReactNode;
  cover?: React.ReactNode;
  animate?: boolean; // false: hiện ngay, không mờ dần vào (dùng khi vừa lật trang tới)
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={`book ${animate ? "letter-in" : ""}`}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="book__back" />
      <div className="book__pages" />
      {children}
      {cover}
    </div>
  );
}

/** Lá thư hiện ngay, không có màn mở đầu (dùng khi xem lại thư trong hộp thư). */
export function PlainLetter(props: Paper) {
  if (OPENING_EFFECT !== "book") return <LetterPaper {...props} />;
  return (
    <Book>
      <LetterPaper {...props} still />
    </Book>
  );
}

/**
 * Lá thư có màn mở đầu (lật bìa sách hoặc mở phong thư), rồi chữ hiện dần từng câu.
 * Chạm vào bất cứ đâu để bỏ qua và đọc ngay. `skip` cho phép bỏ qua từ bên ngoài (khi bấm nghe).
 */
export function OpeningLetter({ skip = false, ...props }: Paper & { skip?: boolean }) {
  const [tapped, setTapped] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const skipped = tapped || skip;
  const showIntro = !skipped && !introDone;

  if (OPENING_EFFECT === "book") {
    return (
      <Book
        onClick={() => setTapped(true)}
        cover={showIntro ? <BookCover onOpened={() => setIntroDone(true)} /> : null}
      >
        <LetterPaper {...props} still revealDelay={skipped ? undefined : BOOK_SECONDS} />
      </Book>
    );
  }

  return (
    <div onClick={() => setTapped(true)}>
      {showIntro ? (
        <div
          className="envelope-overlay fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setIntroDone(true);
          }}
        >
          <Envelope mode="opening" />
        </div>
      ) : null}
      <LetterPaper {...props} revealDelay={skipped ? undefined : ENVELOPE_SECONDS} />
    </div>
  );
}
