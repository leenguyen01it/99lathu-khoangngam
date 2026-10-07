"use client";

import { useEffect, useRef, useState } from "react";
import { recordListen } from "@/app/actions";
import type { WordTiming } from "@/lib/sentences";
import { VOICE_SPEED } from "@/lib/site";

/**
 * Nút loa: bấm để nghe giọng đọc lá thư, bấm lần nữa để tạm dừng.
 * Trong lúc đọc, báo ra ngoài chữ nào đang được đọc (onWord) để trang thư tô sáng chữ đó.
 */
export function ListenButton({
  src,
  words,
  letterId,
  token,
  onWord,
  onStart,
}: {
  src: string;
  words: WordTiming[];
  letterId: string;
  token?: string;
  onWord: (index: number | null) => void;
  onStart: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const counted = useRef(false);
  const frame = useRef(0);
  const lastWord = useRef<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "failed">("idle");

  const report = (index: number | null) => {
    if (index === lastWord.current) return;
    lastWord.current = index;
    onWord(index);
  };

  // Một chữ chỉ kéo dài khoảng một phần tư giây, nên phải dò vị trí theo từng khung hình.
  // Sự kiện timeupdate của trình duyệt chỉ báo vài lần mỗi giây, không đủ nhanh.
  const follow = () => {
    const time = audioRef.current?.currentTime ?? 0;
    // -1: đang phát nhưng chưa tới chữ đầu tiên (khác với null là không phát)
    let current = -1;
    for (let i = 0; i < words.length; i++) {
      if (time >= (words[i]?.start ?? Infinity)) current = i;
      else break;
    }
    report(current);
    frame.current = requestAnimationFrame(follow);
  };
  const stopFollowing = () => cancelAnimationFrame(frame.current);

  // Rời trang hoặc đổi lá thư thì dừng đọc
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      cancelAnimationFrame(frame.current);
      audio?.pause();
      onWord(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state === "playing") {
      audio.pause();
      return;
    }
    try {
      if (state === "idle" || state === "failed") setState("loading");
      onStart();
      // Đặt lại mỗi lần phát: trình duyệt có thể trả tốc độ về 1 khi nạp lại file.
      audio.defaultPlaybackRate = VOICE_SPEED;
      audio.playbackRate = VOICE_SPEED;
      await audio.play();
      if (!counted.current) {
        counted.current = true;
        void recordListen(letterId, token);
      }
    } catch {
      setState("failed");
    }
  };

  const label =
    state === "playing"
      ? "Tạm dừng đọc"
      : state === "loading"
        ? "Đang tải giọng đọc"
        : state === "failed"
          ? "Chưa phát được, bấm để thử lại"
          : "Nghe lá thư";

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlaying={() => {
          setState("playing");
          stopFollowing();
          frame.current = requestAnimationFrame(follow);
        }}
        onPause={() => {
          stopFollowing();
          setState((current) => (current === "playing" ? "paused" : current));
        }}
        onEnded={() => {
          stopFollowing();
          setState("idle");
          report(null);
        }}
        onError={() => {
          stopFollowing();
          setState("failed");
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
          state === "failed"
            ? "border-rose/70 text-rose"
            : state === "playing"
              ? "border-gold bg-gold text-ink"
              : "border-sage/35 text-paper hover:border-gold hover:text-gold"
        } ${state === "loading" ? "animate-pulse" : ""}`}
      >
        {state === "playing" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
            <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
