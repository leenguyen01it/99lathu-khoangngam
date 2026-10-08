"use client";

import { useState } from "react";

export function CopyLinkButton({ value, iconOnly = false }: { value: string; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = failed ? "Không sao chép được, vui lòng thử lại" : copied ? "Đã sao chép" : "Sao chép link";
  return (
    <button
      type="button"
      className={iconOnly ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sage hover:bg-sage/10 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" : "btn-ghost shrink-0"}
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setFailed(false);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
          setFailed(true);
        }
      }}
    >
      {iconOnly ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {failed ? <path d="m6 6 12 12M6 18 18 6" /> : copied ? <path d="m5 12 4 4L19 6" /> : <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>}
        </svg>
      ) : label}
      <span className="sr-only" role="status">{copied ? "Đã sao chép" : failed ? "Không sao chép được, vui lòng thử lại" : ""}</span>
    </button>
  );
}
