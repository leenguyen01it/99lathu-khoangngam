"use client";

import { useRef, useState } from "react";
import type { LetterImageInput } from "@/lib/letter-image";
import type { WordTiming } from "@/lib/sentences";
import { OPENING_EFFECT } from "@/lib/site";
import type { ReadingStyle } from "@/server/scans";
import { BookCover } from "./BookCover";
import { LetterPaper } from "./LetterPaper";
import { ListenButton } from "./ListenButton";
import { BOOK_SECONDS, Book, OpeningLetter, PlainLetter } from "./OpeningLetter";
import { SaveImageButton } from "./SaveImageButton";
import { Shell } from "./Shell";

function playPaperSound() {
  const context = new AudioContext();
  const duration = 0.14;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const progress = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - progress) * 0.16;
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1350;
  filter.Q.value = 0.7;
  source.buffer = buffer;
  source.connect(filter).connect(context.destination);
  source.start();
  source.onended = () => void context.close();
}

/**
 * Trang đọc một lá thư: khung trang, nút nghe trên sách, nút lưu ảnh ở thanh trên và lá thư.
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
  voiceSpeed,
  autoPlayAudio = false,
  readingStyle = "box",
  pageSound = false,
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
  voiceSpeed?: number;
  autoPlayAudio?: boolean;
  readingStyle?: ReadingStyle;
  pageSound?: boolean;
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
  const showListenButton = !opening || skipped || coverGone;
  const canTurn = Boolean(onTurn);
  const hints = { hasPrevious: canTurn && Boolean(previous), hasNext: canTurn && Boolean(next) };
  const letter = { ...paper, activeWord: audio ? activeWord : undefined };
  const listenButton = audio ? (
    <ListenButton
      src={audio.src}
      words={audio.words}
      letterId={letterId}
      token={token}
      onWord={setActiveWord}
      onStart={() => setListened(true)}
      speed={voiceSpeed}
      onPaper
      autoPlay={autoPlayAudio}
    />
  ) : null;
  const bookListenButton = listenButton && showListenButton ? (
    <div
      className={`book__audio-layer ${turn === 1 ? "book__audio-layer--out" : ""} ${
        turn === -1 ? "book__audio-layer--under" : ""
      }`}
    >
      <div
        className="book-audio-in pointer-events-auto absolute right-3 top-[25px]"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        {listenButton}
      </div>
    </div>
  ) : null;

  const turnTo = (direction: -1 | 1) => {
    if (turn || !onTurn || !(direction === 1 ? next : previous)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onTurn(direction);
    else {
      if (pageSound) playPaperSound();
      setTurn(direction);
    }
  };

  let body: React.ReactNode;
  if (OPENING_EFFECT !== "book") {
    // Kiểu phong thư không có lật trang giữa các lá
    body = opening ? <OpeningLetter {...letter} hasAudio={Boolean(audio)} readingStyle={readingStyle} skip={listened} /> : <PlainLetter {...letter} hasAudio={Boolean(audio)} readingStyle={readingStyle} />;
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
          <LetterPaper {...base} still hasAudio={Boolean(audio)} readingStyle={readingStyle} />
        ) : (
          <LetterPaper
            {...letter}
            {...hints}
            still
            hasAudio={Boolean(audio)}
            readingStyle={readingStyle}
            revealDelay={opening && !skipped ? BOOK_SECONDS : undefined}
          />
        )}
        {leaf && turn ? (
          <LetterPaper
            {...leaf}
            still
            hasAudio={Boolean(audio)}
            readingStyle={readingStyle}
            className={`book__leaf ${turn === 1 ? "book__leaf--out" : "book__leaf--in"}`}
            onAnimationEnd={() => onTurn?.(turn)}
          />
        ) : null}
        {bookListenButton}
      </Book>
    );
  }

  return (
    <Shell
      action={
        <div className="flex items-center gap-1.5">
          {actionBefore}
          <SaveImageButton letterId={letterId} token={token} {...paper} />
        </div>
      }
    >
      {before}
      <div className="relative w-full">
        {body}
        {OPENING_EFFECT !== "book" && listenButton && showListenButton ? (
          <div className="book-audio-in absolute right-6 top-6 z-10">
            {listenButton}
          </div>
        ) : null}
      </div>
      {children}
    </Shell>
  );
}
