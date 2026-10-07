"use client";

import { site } from "@/lib/site";

// Tia nắng quanh nửa mặt trời: 9 tia, toả đều ở nửa trên.
const RAYS = Array.from({ length: 9 }, (_, i) => {
  const angle = Math.PI + (i * Math.PI) / 8;
  const point = (radius: number) => ({
    x: 60 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  });
  return { from: point(33), to: point(i % 2 === 0 ? 43 : 39) };
});

/** Biểu tượng trên bìa: logo Khoảng Ngẫm vẽ lớn, thêm tia nắng. */
function Emblem() {
  return (
    <svg width="132" height="88" viewBox="0 0 120 80" fill="none" strokeLinecap="round" aria-hidden>
      <g stroke="url(#foil)" strokeWidth="1.8">
        {RAYS.map((ray, i) => (
          <path key={i} d={`M${ray.from.x} ${ray.from.y}L${ray.to.x} ${ray.to.y}`} />
        ))}
        <path d="M34 50A26 26 0 0 1 86 50" strokeWidth="2.2" />
        <path d="M12 50H108" strokeWidth="2.2" />
      </g>
      <g stroke="#bcd3bd" strokeWidth="1.8" opacity="0.85">
        <path d="M32 59H88" />
        <path d="M44 67H76" />
        <path d="M53 75H67" />
      </g>
      <defs>
        <linearGradient id="foil" x1="0" y1="0" x2="120" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7e6bd" />
          <stop offset="0.45" stopColor="#ecc98a" />
          <stop offset="0.7" stopColor="#c9a560" />
          <stop offset="1" stopColor="#f3dcaa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Bìa sách: vải xanh, khung và chữ nhũ vàng, có gáy sách bên trái.
 * Tên sách lấy từ site.product; nếu tên mở đầu bằng một con số thì con số được in lớn.
 */
export function BookCover({ onOpened, staticCover = false }: { onOpened?: () => void; staticCover?: boolean }) {
  const match = /^(\d+)\s+(.+)$/.exec(site.product);
  const numeral = match?.[1];
  const title = match?.[2] ?? site.product;

  return (
    <div
      className={`book__cover ${staticCover ? "book__cover--static" : ""}`}
      aria-hidden
      onAnimationEnd={(event) => {
        if (!staticCover && event.target === event.currentTarget) onOpened?.();
      }}
    >
      <div className="book__spine" />
      <div className="book__frame">
        <span className="book__corner book__corner--tl" />
        <span className="book__corner book__corner--tr" />
        <span className="book__corner book__corner--bl" />
        <span className="book__corner book__corner--br" />
      </div>
      <div className="book__sheen" />

      <div className="relative flex flex-col items-center">
        <Emblem />
        {numeral ? <p className="book__foil mt-1 font-serif text-[64px] leading-none">{numeral}</p> : null}
        <p
          className={
            numeral
              ? "mt-2 max-w-[220px] text-[14px] font-semibold uppercase tracking-[0.2em] text-paper"
              : "book__foil mt-3 max-w-[230px] font-serif text-[28px] leading-tight"
          }
        >
          {title}
        </p>
        <div className="mt-4 flex items-center gap-2 text-gold/80">
          <span className="h-px w-8 bg-current" />
          <span className="h-1.5 w-1.5 rotate-45 bg-current" />
          <span className="h-px w-8 bg-current" />
        </div>
        <p className="mt-3 font-serif text-[15px] italic text-sage">{site.tagline}</p>
      </div>

      <p className="book__foil absolute bottom-7 text-[11px] font-semibold uppercase tracking-[0.34em]">
        {site.name}
      </p>
    </div>
  );
}
