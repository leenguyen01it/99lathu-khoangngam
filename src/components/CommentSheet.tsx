"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { changePenName, deleteComment, loadComments, sendComment } from "@/app/v/[token]/actions";
import { COMMENT_MAX, TOTAL_LETTERS } from "@/lib/letters";
import { PEN_NAME_MAX, penToneColor } from "@/lib/pen-names";
import type { LetterCommentView, PenName } from "@/server/reactions";

function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// Thẻ thật thì cho biết người viết đang ở lá số mấy; người đọc thử không có tiến độ.
const progress = (readerN: number) => (readerN >= TOTAL_LETTERS ? `đã đọc hết ${TOTAL_LETTERS} lá` : `lá số ${readerN}`);

const isLong = (text: string) => text.length > 260 || text.split("\n").length > 6;

function Avatar({ name, tone }: { name: string; tone: number }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-[15px] font-semibold text-ink"
      style={{ backgroundColor: penToneColor(tone) }}
    >
      {[...name][0]?.toUpperCase()}
    </span>
  );
}

function Comment({ item, fresh, onRemove }: { item: LetterCommentView; fresh: boolean; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false); // đã bấm Xoá, đang chờ xác nhận
  const long = isLong(item.text);
  return (
    <li className={`flex gap-3 py-3.5 ${fresh ? "letter-in" : ""}`}>
      <Avatar name={item.name} tone={item.tone} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[12px] text-sage/80">
          <span className={`text-[14px] font-semibold ${item.mine ? "text-gold" : "text-paper"}`}>{item.name}</span>
          {item.mine ? <span>(bạn)</span> : null}
          {item.readerN !== null ? (
            <>
              <span aria-hidden>·</span>
              <span>{progress(item.readerN)}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <time dateTime={item.at}>{ago(item.at)}</time>
        </p>
        <p className={`mt-1 whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-paper ${long && !expanded ? "line-clamp-6" : ""}`}>
          {item.text}
        </p>
        {long || item.mine ? (
          <p className="mt-1 flex gap-4 text-[13px]">
            {long ? (
              <button type="button" onClick={() => setExpanded(!expanded)} className="text-gold">
                {expanded ? "Thu gọn" : "Xem thêm"}
              </button>
            ) : null}
            {item.mine && !confirming ? (
              <button type="button" onClick={() => setConfirming(true)} className="text-sage/80 underline-offset-2 hover:text-rose hover:underline">
                Xoá
              </button>
            ) : null}
            {item.mine && confirming ? (
              <span className="flex flex-wrap items-center gap-x-3 text-sage/80">
                <span>Xoá cảm nghĩ này?</span>
                <button type="button" onClick={onRemove} className="font-semibold text-rose underline-offset-2 hover:underline">
                  Xoá
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="underline-offset-2 hover:text-paper hover:underline">
                  Giữ lại
                </button>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Bảng cảm nghĩ trượt từ dưới lên, phủ lên lá thư: danh sách cuộn ở giữa, ô viết ghim ở đáy.
 * Mới nhất đứng đầu; cuộn tới cuối thì tự tải thêm một trang cũ hơn.
 *
 * Bảng luôn được giữ lại khi đóng, để mở lại không phải tải từ đầu.
 * Phiên chạm thẻ chỉ dài 10 phút, nên chữ đang viết dở được giữ trên máy
 * để lần chạm sau mở lại lá này vẫn còn.
 *
 * `onExpired` được gọi khi máy chủ không nhận ra người đang xem. Với thẻ thật thì trang cha khoá lại;
 * với bản đọc thử (`token` là null) trang vẫn mở, nên ở đây vẫn phải báo lỗi.
 */
export function CommentSheet({
  open,
  onClose,
  token,
  letterId,
  letterN,
  count,
  onCount,
  onExpired,
}: {
  open: boolean;
  onClose: () => void;
  token: string | null;
  letterId: string;
  letterN: number;
  count: number;
  onCount: (delta: number) => void;
  onExpired: () => void;
}) {
  const draftKey = `kn_comment:${letterId}`;
  const [items, setItems] = useState<LetterCommentView[] | null>(null); // null: chưa tải trang đầu
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [me, setMe] = useState<PenName | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null); // null: không ở chế độ đổi tên
  const [renaming, setRenaming] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  // Bàn phím ảo che mất bao nhiêu ở đáy màn hình, để nâng bảng lên trên nó
  const [keyboard, setKeyboard] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setDraft(localStorage.getItem(draftKey) ?? "");
    } catch {}
  }, [draftKey]);

  const keep = (text: string) => {
    setDraft(text);
    try {
      if (text) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch {}
  };

  // Ô viết cao dần theo chữ, tối đa chừng năm dòng
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = "auto";
    // scrollHeight không tính viền. Thiếu phần đó thì ô thấp hơn chữ vài điểm ảnh và hiện thanh cuộn
    // (trên Windows là hai mũi tên lên xuống ở cuối ô).
    const full = field.scrollHeight + field.offsetHeight - field.clientHeight;
    field.style.height = `${Math.min(full, 132)}px`;
    field.style.overflowY = full > 132 ? "auto" : "hidden";
  }, [draft, open]);

  const load = async (after?: string) => {
    if (loading) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const page = await loadComments(token, letterId, after);
      if (!page) {
        onExpired();
        setLoadFailed(true);
        return;
      }
      // Cảm nghĩ vừa gửi đã nằm sẵn ở đầu danh sách, không thêm lần nữa
      setItems((current) => {
        const known = new Set((current ?? []).map((item) => item.id));
        return [...(current ?? []), ...page.items.filter((item) => !known.has(item.id))];
      });
      setNext(page.next);
      setMe(page.me);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Tải trang đầu khi mở bảng lần đầu
  useEffect(() => {
    if (open && items === null) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cuộn tới cuối danh sách thì tải trang cũ hơn
  useEffect(() => {
    const target = sentinel.current;
    if (!open || !next || loading || loadFailed || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void load(next);
      },
      { root: list.current, rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, next, loading, loadFailed]);

  // Khi bảng mở: khoá cuộn trang phía sau, Esc để đóng, và né bàn phím ảo
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const viewport = window.visualViewport;
    const onViewport = () => {
      if (viewport) setKeyboard(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    onViewport();
    document.addEventListener("keydown", onKey);
    viewport?.addEventListener("resize", onViewport);
    viewport?.addEventListener("scroll", onViewport);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      viewport?.removeEventListener("resize", onViewport);
      viewport?.removeEventListener("scroll", onViewport);
      setKeyboard(0);
      setDrag(0);
    };
  }, [open, onClose]);

  const send = async () => {
    if (sending || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendComment(token, letterId, draft);
      if (result.ok) {
        setItems((current) => [result.comment, ...(current ?? [])]);
        setFreshId(result.comment.id);
        onCount(1);
        keep("");
        list.current?.scrollTo({ top: 0 });
      } else if (result.reason === "expired") {
        onExpired();
        setError("Chưa gửi được. Bạn thử lại nhé.");
      } else if (result.reason === "limit") {
        setError("Hôm nay bạn đã viết khá nhiều rồi. Mai bạn viết tiếp nhé.");
      }
    } catch {
      setError("Chưa gửi được. Bạn thử lại nhé.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      if (!await deleteComment(token, id)) {
        onExpired();
        setError("Chưa xoá được. Bạn thử lại nhé.");
        return;
      }
      setItems((current) => (current ?? []).filter((item) => item.id !== id));
      onCount(-1);
    } catch {
      setError("Chưa xoá được. Bạn thử lại nhé.");
    }
  };

  // Đổi sang tên tự gõ, hoặc bốc một bút danh ngẫu nhiên khác nếu truyền null
  const rename = async (name: string | null) => {
    if (renaming) return;
    setRenaming(true);
    setNameError(null);
    try {
      const result = await changePenName(token, name);
      if (result.ok) {
        setMe(result.me);
        setItems((current) => (current ?? []).map((item) => (item.mine ? { ...item, name: result.me.name } : item)));
        setNameDraft(null);
      } else if (result.reason === "expired") {
        onExpired();
        setNameError("Chưa đổi được tên. Bạn thử lại nhé.");
      } else if (result.reason === "invalid") {
        setNameError(`Tên dài 2 tới ${PEN_NAME_MAX} ký tự, chỉ gồm chữ, số và dấu cách.`);
      } else {
        setNameError("Bạn đã hết lượt đổi tên.");
      }
    } catch {
      setNameError("Chưa đổi được tên. Bạn thử lại nhé.");
    } finally {
      setRenaming(false);
    }
  };

  if (!open) return null;

  const title = count > 0 ? `${count} cảm nghĩ về lá số ${letterN}` : `Cảm nghĩ về lá số ${letterN}`;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng" onClick={onClose} className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-black/55" />
      <div
        className="sheet-panel absolute inset-x-0 mx-auto flex w-full max-w-md flex-col rounded-t-3xl border-t border-sage/25 bg-ink shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
        style={{
          bottom: keyboard,
          height: `min(75dvh, calc(100dvh - ${keyboard}px - 24px))`,
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragStart.current === null ? "transform 0.2s ease-out" : undefined,
        }}
      >
        {/* Kéo phần đầu bảng xuống để đóng */}
        <div
          className="shrink-0 touch-none px-5 pb-3 pt-2.5"
          onTouchStart={(event) => {
            dragStart.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(event) => {
            if (dragStart.current === null) return;
            setDrag(Math.max(0, (event.touches[0]?.clientY ?? 0) - dragStart.current));
          }}
          onTouchEnd={() => {
            dragStart.current = null;
            if (drag > 90) onClose();
            else setDrag(0);
          }}
        >
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-sage/35" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <h2 className="font-serif text-[17px] text-paper">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-8 w-8 items-center justify-center rounded-full text-sage transition hover:text-gold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-sage/15 px-5">
          {items?.length ? (
            <ul className="divide-y divide-sage/15">
              {items.map((item) => (
                <Comment key={item.id} item={item} fresh={item.id === freshId} onRemove={() => remove(item.id)} />
              ))}
            </ul>
          ) : items && !loading && !loadFailed ? (
            <p className="px-4 py-10 text-center font-serif text-[15px] leading-relaxed text-sage">
              Chưa ai viết gì dưới lá này.
              <br />
              Bạn mở lời nhé.
            </p>
          ) : null}
          {loading ? <p className="py-4 text-center text-[13px] text-sage">Đang tải</p> : null}
          {loadFailed ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <p role="alert" className="text-[13px] text-rose">Chưa tải được. Bạn thử lại nhé.</p>
              <button type="button" onClick={() => load(next ?? undefined)} className="btn-ghost px-4 py-1.5 text-[13px]">
                Tải lại
              </button>
            </div>
          ) : null}
          <div ref={sentinel} aria-hidden className="h-px" />
        </div>

        <div className="shrink-0 border-t border-sage/15 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {error ? <p role="alert" className="mb-2 text-[13px] text-rose">{error}</p> : null}
          {me && nameDraft === null ? (
            <p className="mb-2 flex flex-wrap items-center gap-x-2 px-1 text-[12px] text-sage/80">
              <span>
                Bạn viết dưới tên <span className="font-semibold text-gold">{me.name}</span>
              </span>
              {me.changesLeft > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setNameError(null);
                    setNameDraft("");
                  }}
                  className="underline underline-offset-2 hover:text-gold"
                >
                  Đổi tên
                </button>
              ) : null}
            </p>
          ) : null}
          {me && nameDraft !== null ? (
            <form
              className="mb-3 rounded-2xl border border-sage/20 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void rename(nameDraft);
              }}
            >
              <label className="block text-[12px] text-sage/80" htmlFor="pen-name">
                Tên hiện bên cạnh cảm nghĩ của bạn (còn {me.changesLeft} lần đổi)
              </label>
              <input
                id="pen-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={PEN_NAME_MAX}
                autoFocus
                autoComplete="nickname"
                placeholder="Tên của bạn"
                className="field mt-1.5 !py-2"
              />
              {nameError ? <p role="alert" className="mt-1.5 text-[13px] text-rose">{nameError}</p> : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={renaming || nameDraft.trim().length < 2} className="btn px-4 py-1.5 text-[13px]">
                  {renaming ? "Đang lưu" : "Lưu tên"}
                </button>
                <button type="button" onClick={() => rename(null)} disabled={renaming} className="btn-ghost px-4 py-1.5 text-[13px]">
                  Tên ngẫu nhiên khác
                </button>
                <button type="button" onClick={() => setNameDraft(null)} className="ml-auto text-[13px] text-sage hover:text-paper">
                  Thôi
                </button>
              </div>
            </form>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              ref={input}
              value={draft}
              onChange={(event) => keep(event.target.value)}
              maxLength={COMMENT_MAX}
              rows={1}
              placeholder="Chia sẻ cảm nghĩ của bạn về lá thư này"
              aria-label="Cảm nghĩ của bạn"
              className="field resize-none !rounded-3xl !py-2.5 leading-relaxed"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label={sending ? "Đang gửi" : "Gửi"}
              title="Gửi"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition hover:brightness-105 ${sending ? "" : "disabled:opacity-40"}`}
            >
              {sending ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="animate-spin" aria-hidden>
                  <circle cx="12" cy="12" r="8.5" opacity="0.25" />
                  <path d="M20.5 12A8.5 8.5 0 0 0 12 3.5" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              )}
            </button>
          </div>
          {draft.length > COMMENT_MAX - 100 ? (
            <p className="mt-1.5 text-right text-[12px] tabular-nums text-sage/70">{draft.length}/{COMMENT_MAX}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
