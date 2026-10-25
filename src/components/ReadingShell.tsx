"use client";

import { useEffect, useRef, useState } from "react";
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
  const duration = 0.24;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const progress = i / data.length;
    // Hai nhịp giấy rất ngắn: mép giấy được nhấc lên rồi nhẹ nhàng đặt xuống.
    const lift = Math.exp(-Math.pow((progress - 0.22) / 0.16, 2));
    const settle = Math.exp(-Math.pow((progress - 0.67) / 0.22, 2)) * 0.55;
    const softenedNoise = (Math.random() * 2 - 1) * 0.7 + Math.sin(i * 0.19) * 0.3;
    data[i] = softenedNoise * (lift + settle);
  }
  const source = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const lowpass = context.createBiquadFilter();
  const gain = context.createGain();
  highpass.type = "highpass";
  highpass.frequency.value = 320;
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(2400, context.currentTime);
  lowpass.frequency.exponentialRampToValueAtTime(1200, context.currentTime + duration);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.038, context.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.buffer = buffer;
  source.connect(highpass).connect(lowpass).connect(gain).connect(context.destination);
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrolledDuringTouch = useRef(false);
  const swiped = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const bookButtonRef = useRef<HTMLDivElement>(null);

  // Nút nghe nằm cạnh tiêu đề nên cuộn lên cùng tiêu đề, khỏi đè lên chữ khi trang thư dài.
  // Riêng lúc đang nghe (activeWord khác null) thì nút đứng yên ở góc trên để luôn bấm dừng được:
  // trang tự cuộn theo chữ đang đọc nên chữ nằm dưới nút là chữ đã đọc qua.
  const placeBookButton = () => {
    const button = bookButtonRef.current;
    const page = frameRef.current?.querySelector<HTMLElement>(".book > article:not(.book__leaf)");
    if (!button) return;
    button.style.top = `${25 - (activeWord === null && page ? page.scrollTop : 0)}px`;
  };
  useEffect(placeBookButton);

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
        ref={bookButtonRef}
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
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          scrolledDuringTouch.current = false;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0];
          touchStart.current = null;
          if (!start || !end || scrolledDuringTouch.current) return;
          const dx = end.clientX - start.x;
          const dy = end.clientY - start.y;
          // Chỉ lật khi vuốt hẳn sang ngang; vuốt dọc để đọc tiếp thư dài thì bỏ qua dù tay hơi lệch.
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          swiped.current = true;
          if (opening && !skipped) setTapped(true);
          turnTo(dx < 0 ? 1 : -1);
        }}
      >
        {base ? (
          <LetterPaper {...base} still hasAudio={Boolean(audio)} readingStyle={readingStyle} />
        ) : (
          <LetterPaper
            {...letter}
            {...hints}
            onPrevious={() => {
              setTapped(true);
              turnTo(-1);
            }}
            onNext={() => {
              setTapped(true);
              turnTo(1);
            }}
            still
            hasAudio={Boolean(audio)}
            readingStyle={readingStyle}
            revealDelay={opening && !skipped ? BOOK_SECONDS : undefined}
          />
        )}
        {leaf && turn ? (
          <LetterPaper
            {...leaf}
            {...(turn === 1 ? hints : {})}
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
      <div ref={frameRef} className="relative w-full" onScrollCapture={() => {
          if (touchStart.current) scrolledDuringTouch.current = true;
          placeBookButton();
        }}>
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
