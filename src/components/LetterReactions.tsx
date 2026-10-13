"use client";

import { useCallback, useState } from "react";
import { CommentSheet } from "./CommentSheet";

export function HeartIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z" />
    </svg>
  );
}

const round = "relative flex h-10 items-center justify-center rounded-full border transition";
const idle = "border-sage/35 text-paper hover:border-gold hover:text-gold";
const sized = (count: number) => (count > 0 ? "gap-1.5 px-3.5" : "w-10");

/**
 * Hàng nút dưới lá thư, cả thẻ thật lẫn bản đọc thử: thả tim và cảm nghĩ, mỗi nút kèm tổng số của lá đó.
 * Nằm ngoài cuốn sách vì chạm vào trang thư là lật trang.
 */
export function LetterReactions({
  letterId,
  letterN,
  token,
  hearted,
  heartCount,
  commentCount,
  onToggleHeart,
  onCommentCount,
  onExpired,
}: {
  letterId: string;
  letterN: number;
  token: string | null; // null: bản đọc thử
  hearted: boolean;
  heartCount: number;
  commentCount: number;
  onToggleHeart: () => void;
  onCommentCount: (delta: number) => void;
  onExpired: () => void;
}) {
  // Tăng mỗi lần vừa thả tim, để hiệu ứng chạy lại từ đầu
  const [burst, setBurst] = useState(0);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (!hearted) setBurst((count) => count + 1);
          onToggleHeart();
        }}
        aria-pressed={hearted}
        aria-label={hearted ? "Bỏ tim lá thư này" : "Thả tim lá thư này"}
        title={hearted ? "Bỏ tim" : "Thả tim"}
        className={`${round} ${sized(heartCount)} ${hearted ? "border-rose/70 text-rose" : idle}`}
      >
        <span key={burst} className={hearted && burst ? "heart-pop" : undefined}>
          <HeartIcon filled={hearted} />
        </span>
        {heartCount > 0 ? <span className="text-[14px] tabular-nums">{heartCount}</span> : null}
        {hearted && burst ? (
          <span key={`burst-${burst}`} aria-hidden>
            <span className="heart-ring" />
            {[-16, 2, 18].map((drift, index) => (
              <span
                key={drift}
                className="heart-float"
                style={{ "--drift": `${drift}px`, animationDelay: `${index * 0.09}s` } as React.CSSProperties}
              >
                <HeartIcon filled size={11} />
              </span>
            ))}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Xem và viết cảm nghĩ"
        title="Cảm nghĩ"
        className={`${round} ${sized(commentCount)} ${idle}`}
      >
        <CommentIcon />
        {commentCount > 0 ? <span className="text-[14px] tabular-nums">{commentCount}</span> : null}
      </button>
      <CommentSheet
        open={open}
        onClose={close}
        token={token}
        letterId={letterId}
        letterN={letterN}
        count={commentCount}
        onCount={onCommentCount}
        onExpired={onExpired}
      />
    </div>
  );
}
