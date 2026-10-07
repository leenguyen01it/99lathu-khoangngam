"use client";

import { useRef, useState } from "react";
import type { LetterImageInput } from "@/lib/letter-image";
import type { WordTiming } from "@/lib/sentences";
import { OPENING_EFFECT } from "@/lib/site";
import { BookCover } from "./BookCover";
import { LetterPaper } from "./LetterPaper";
import { ListenButton } from "./ListenButton";
import { BOOK_SECONDS, Book, OpeningLetter, PlainLetter } from "./OpeningLetter";
import { SaveImageButton } from "./SaveImageButton";
import { Shell } from "./Shell";

/**
 * Trang đọc một lá thư: khung trang, hai nút ở góc trên bên phải (nghe, lưu ảnh) và lá thư.
 * Giữ chung một chỗ việc "chữ nào đang được đọc" để nút loa và trang thư khớp với nhau.
 *
 * Nếu truyền `previous` hoặc `next`, người đọc lật được sang lá bên cạnh như lật trang sách:
 * chạm mép trái hoặc vuốt sang phải để lật về, chạm phần còn lại hoặc vuốt sang trái để lật tới.
 * Lật xong thì gọi `onTurn` để trang cha đổi sang lá đó.
 */
export function ReadingShell({
  letterId,
  token,
  paper,
  audio,
  opening,
  settled = false,
  previous = null,
  next = null,
  onTurn,
  actionBefore,
  before,
  children,
}: {
  letterId: string;
  token?: string;
  paper: LetterImageInput;
  audio: { src: string; words: WordTiming[] } | null;
  opening: boolean; // có màn lật bìa và hiện chữ dần hay không
  settled?: boolean; // vừa lật trang tới lá này: cuốn sách đứng yên, không mờ dần vào
  previous?: LetterImageInput | null;
  next?: LetterImageInput | null;
  onTurn?: (direction: -1 | 1) => void;
  actionBefore?: React.ReactNode;
  before?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [listened, setListened] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const [turn, setTurn] = useState<-1 | 1 | null>(null);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);

  const skipped = tapped || listened;
  const canTurn = Boolean(onTurn);
  const hints = { hasPrevious: canTurn && Boolean(previous), hasNext: canTurn && Boolean(next) };
  const letter = { ...paper, activeWord: audio ? activeWord : undefined };

  const turnTo = (direction: -1 | 1) => {
    if (turn || !onTurn || !(direction === 1 ? next : previous)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onTurn(direction);
    else setTurn(direction);
  };

  let body: React.ReactNode;
  if (OPENING_EFFECT !== "book") {
    // Kiểu phong thư không có lật trang giữa các lá
    body = opening ? <OpeningLetter {...letter} skip={listened} /> : <PlainLetter {...letter} />;
  } else {
    // Khi lật tới: lá sau nằm dưới, lá hiện tại là tờ đang lật đi.
    // Khi lật về: lá hiện tại nằm dưới, lá trước là tờ đang lật vào.
    const base = turn === 1 && next ? next : null;
    const leaf = turn === 1 ? letter : turn === -1 ? previous : null;
    body = (
      <Book
        animate={!settled}
        cover={
          opening && !skipped && !coverGone ? <BookCover onOpened={() => setCoverGone(true)} /> : null
        }
        onClick={(event) => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          // Lần chạm đầu ở màn mở đầu chỉ để hiện đủ lá thư, chưa lật trang
          if (opening && !skipped) {
            setTapped(true);
            return;
          }
          const box = event.currentTarget.getBoundingClientRect();
          turnTo((event.clientX - box.left) / box.width < 0.35 ? -1 : 1);
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start === null || end === undefined || Math.abs(end - start) < 40) return;
          swiped.current = true;
          if (opening && !skipped) setTapped(true);
          turnTo(end < start ? 1 : -1);
        }}
      >
        {base ? (
          <LetterPaper {...base} still />
        ) : (
          <LetterPaper
            {...letter}
            {...hints}
            still
            revealDelay={opening && !skipped ? BOOK_SECONDS : undefined}
          />
        )}
        {leaf && turn ? (
          <LetterPaper
            {...leaf}
            still
            className={`book__leaf ${turn === 1 ? "book__leaf--out" : "book__leaf--in"}`}
            onAnimationEnd={() => onTurn?.(turn)}
          />
        ) : null}
      </Book>
    );
  }

  return (
    <Shell
      action={
        <div className="flex items-center gap-2">
          {actionBefore}
          {audio ? (
            <ListenButton
              src={audio.src}
              words={audio.words}
              letterId={letterId}
              token={token}
              onWord={setActiveWord}
              onStart={() => setListened(true)}
            />
          ) : null}
          <SaveImageButton letterId={letterId} token={token} {...paper} />
        </div>
      }
    >
      {before}
      {body}
      {children}
    </Shell>
  );
}
