"use client";

import { useEffect, useState } from "react";
import { GiftBook } from "@/components/GiftBook";
import { HeartIcon, LetterReactions } from "@/components/LetterReactions";
import { Locked } from "@/components/Locked";
import { ReadingShell } from "@/components/ReadingShell";
import { Shell } from "@/components/Shell";
import { SocialFooter } from "@/components/SocialFooter";
import { TrialPurchase } from "@/components/TrialPurchase";
import type { Letter } from "@/lib/letters";
import { PEN_NAME_MAX } from "@/lib/pen-names";
import type { WordTiming } from "@/lib/sentences";
import { themeLabel } from "@/lib/site";
import { markTrialRead } from "@/app/doc-thu/actions";
import type { PenName, Reactions } from "@/server/reactions";
import type { CardExperienceSettings, ReadingStyle } from "@/server/scans";
import { changeBrowserReminder, changeDailyLimit, changeExperienceSettings, changePenName, changeVoiceSpeed, markGiftSeen, openAnotherLetter, rememberViewedLetter, setHeart } from "./actions";

interface Props {
  token?: string;
  expiresAt?: string;
  letters: Letter[]; // các lá đã mở, lá mới nhất đứng đầu
  audio: Record<number, WordTiming[]>; // mốc thời gian từng chữ của những lá đã có giọng đọc
  total: number;
  dailyLimit?: number;
  voiceSpeed?: number;
  autoPlayAudio?: boolean;
  readingStyle?: ReadingStyle;
  pageSound?: boolean;
  resumeReading?: boolean;
  lastViewedN?: number | null;
  reminderTime?: string | null;
  vapidPublicKey?: string | null;
  penName?: PenName | null;
  openedToday?: number;
  canOpenToday?: boolean;
  reactions?: Reactions; // tim và số cảm nghĩ của các lá đang hiện
  gift?: { from: string | null; message: string } | null;
  showGiftFirst?: boolean;
}

type View = { kind: "gift" } | { kind: "letter"; n: number } | { kind: "box" } | { kind: "settings" };

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function ViewerClient({ token, expiresAt, letters, audio, total, dailyLimit = 1, voiceSpeed = 1.3, autoPlayAudio = false, readingStyle = "box", pageSound = true, resumeReading = true, lastViewedN = null, reminderTime = null, vapidPublicKey = null, penName = null, openedToday = 0, canOpenToday = true, reactions, gift, showGiftFirst }: Props) {
  const todayN = letters[0]?.n ?? 1;
  // Không có token là trang đọc thử: cả bộ mở sẵn nên bắt đầu từ lá số 1 rồi lật tới.
  const trial = !token;
  const [locked, setLocked] = useState(false);
  const [openingToday, setOpeningToday] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [limit, setLimit] = useState(dailyLimit);
  const [chosenLimit, setChosenLimit] = useState(dailyLimit);
  const [savingLimit, setSavingLimit] = useState(false);
  const [speed, setSpeed] = useState(voiceSpeed);
  const [chosenSpeed, setChosenSpeed] = useState(voiceSpeed);
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [experience, setExperience] = useState<CardExperienceSettings>({ autoPlayAudio, readingStyle, pageSound, resumeReading });
  const [savingExperience, setSavingExperience] = useState(false);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [reminder, setReminder] = useState<string | null>(reminderTime);
  const [reminderDraft, setReminderDraft] = useState(reminderTime ?? "07:00");
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [me, setMe] = useState(penName);
  const [nameDraft, setNameDraft] = useState(penName?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [openingNext, setOpeningNext] = useState(false);
  const [paceError, setPaceError] = useState<string | null>(null);
  const resumeN = resumeReading && lastViewedN && letters.some((letter) => letter.n === lastViewedN) ? lastViewedN : todayN;
  const [view, setView] = useState<View>(showGiftFirst ? { kind: "gift" } : { kind: "letter", n: trial ? 1 : resumeN });
  const [returnView, setReturnView] = useState<View>(view);
  const [settingsReturnView, setSettingsReturnView] = useState<View>(view);
  // Màn mở phong thư chỉ chạy một lần, ở màn hình đầu tiên sau khi chạm thẻ.
  // Xem lại thư trong hộp thư thì hiện ngay.
  const [firstScreen, setFirstScreen] = useState(true);
  // Vừa lật trang tới một lá thì cuốn sách đứng yên, không mờ dần vào như khi mở từ hộp thư
  const [turned, setTurned] = useState(false);
  const go = (next: View, byTurning = false) => {
    setFirstScreen(false);
    setTurned(byTurning);
    setView(next);
    // Ghi lại người đọc thử đã lật tới lá nào; lỗi ghi không được làm hỏng việc đọc.
    if (trial && next.kind === "letter") markTrialRead(next.n).catch(() => {});
    if (token && next.kind === "letter") rememberViewedLetter(token, next.n).catch(() => {});
  };
  const openBox = () => {
    setReturnView(view);
    setPaceError(null);
    go({ kind: "box" });
  };
  const openSettings = () => {
    setSettingsReturnView(view);
    setChosenLimit(limit);
    setChosenSpeed(speed);
    setNameDraft(me?.name ?? "");
    setPaceError(null);
    setNameError(null);
    setExperienceError(null);
    setReminderError(null);
    go({ kind: "settings" });
  };

  const [hearts, setHearts] = useState(() => new Set(reactions?.hearted));
  const [heartCounts, setHeartCounts] = useState(reactions?.heartCounts ?? {});
  const [commentCounts, setCommentCounts] = useState(reactions?.commentCounts ?? {});
  const [onlyHearted, setOnlyHearted] = useState(false);
  const remainingToday = canOpenToday ? Math.max(0, Math.min(limit - openedToday, total - todayN)) : 0;
  const saveLimit = async () => {
    if (!token || savingLimit) return;
    setSavingLimit(true);
    setPaceError(null);
    try {
      if (!await changeDailyLimit(token, chosenLimit)) {
        setLocked(true);
        return;
      }
      setLimit(chosenLimit);
      window.location.reload();
    } catch {
      setPaceError("Chưa lưu được nhịp đọc. Bạn thử lại nhé.");
    } finally {
      setSavingLimit(false);
    }
  };
  const saveSpeed = async () => {
    if (!token || savingSpeed) return;
    setSavingSpeed(true);
    setPaceError(null);
    try {
      if (!await changeVoiceSpeed(token, chosenSpeed)) {
        setLocked(true);
        return;
      }
      setSpeed(chosenSpeed);
    } catch {
      setPaceError("Chưa lưu được tốc độ nghe. Bạn thử lại nhé.");
    } finally {
      setSavingSpeed(false);
    }
  };
  const saveExperience = async (patch: Partial<CardExperienceSettings>) => {
    if (!token || savingExperience) return;
    const previous = experience;
    const next = { ...previous, ...patch };
    setExperience(next);
    setSavingExperience(true);
    setExperienceError(null);
    try {
      if (!await changeExperienceSettings(token, next)) {
        setLocked(true);
        return;
      }
    } catch {
      setExperience(previous);
      setExperienceError("Chưa lưu được cài đặt đọc. Bạn thử lại nhé.");
    } finally {
      setSavingExperience(false);
    }
  };
  const saveReminder = async (nextTime: string | null) => {
    if (!token || savingReminder) return;
    setSavingReminder(true);
    setReminderError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !vapidPublicKey) {
        setReminderError("Trình duyệt này chưa hỗ trợ thông báo nhắc đọc.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (!nextTime) {
        if (!await changeBrowserReminder(token, null, null)) {
          setLocked(true);
          return;
        }
        const current = await registration.pushManager.getSubscription();
        await current?.unsubscribe();
        setReminder(null);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setReminderError("Bạn cần cho phép thông báo trong trình duyệt để bật lời nhắc.");
        return;
      }
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(vapidPublicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("invalid subscription");
      if (!await changeBrowserReminder(token, nextTime, {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      })) {
        setLocked(true);
        return;
      }
      setReminder(nextTime);
      setReminderDraft(nextTime);
    } catch {
      setReminderError("Chưa bật được lời nhắc trên thiết bị này. Bạn thử lại nhé.");
    } finally {
      setSavingReminder(false);
    }
  };
  const saveName = async (name: string | null) => {
    if (!token || savingName) return;
    setSavingName(true);
    setNameError(null);
    try {
      const result = await changePenName(token, name);
      if (result.ok) {
        setMe(result.me);
        setNameDraft(result.me.name);
      } else if (result.reason === "expired") setLocked(true);
      else if (result.reason === "invalid") setNameError(`Tên dài 2 đến ${PEN_NAME_MAX} ký tự, chỉ gồm chữ, số và dấu cách.`);
      else setNameError("Bạn đã hết lượt đổi tên.");
    } catch {
      setNameError("Chưa lưu được bút danh. Bạn thử lại nhé.");
    } finally {
      setSavingName(false);
    }
  };
  const openNext = async () => {
    if (!token || openingNext) return;
    setOpeningNext(true);
    setPaceError(null);
    try {
      const result = await openAnotherLetter(token);
      if (result.ok) {
        window.location.reload();
        return;
      }
      if (result.reason === "expired") setLocked(true);
      else if (result.reason === "stale") window.location.reload();
      else setPaceError("Hôm nay bạn đã mở hết số lá được chọn. Hẹn gặp bạn ngày mai nhé.");
    } catch {
      setPaceError("Chưa mở được lá tiếp theo. Bạn thử lại nhé.");
    } finally {
      setOpeningNext(false);
    }
  };
  // Đổi ngay trên màn hình rồi mới ghi; ghi không được thì trả lại như cũ.
  const toggleHeart = async (letterId: string) => {
    const on = !hearts.has(letterId);
    const apply = (value: boolean) => {
      setHearts((current) => {
        const next = new Set(current);
        if (value) next.add(letterId);
        else next.delete(letterId);
        return next;
      });
      setHeartCounts((current) => ({ ...current, [letterId]: Math.max(0, (current[letterId] ?? 0) + (value ? 1 : -1)) }));
    };
    apply(on);
    try {
      if (await setHeart(token ?? null, letterId, on)) return;
      // Với thẻ thật là phiên chạm thẻ đã hết hạn. Bản đọc thử thì chỉ không ghi được, vẫn đọc tiếp.
      if (token) setLocked(true);
      else apply(!on);
    } catch {
      apply(!on);
    }
  };

  // Khoá trang đúng lúc phiên hết hạn, kể cả khi tab vừa được mở lại sau một lúc.
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    const check = () => {
      if (Date.now() >= deadline) setLocked(true);
    };
    check();
    const timer = setTimeout(() => setLocked(true), Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [expiresAt]);

  if (locked) return <Locked />;

  if (view.kind === "gift" && gift) {
    return (
      <Shell>
        <GiftBook message={gift.message} from={gift.from} withCover={firstScreen} continuing={openingToday} onContinue={async () => {
          setOpeningToday(true);
          setGiftError(null);
          try {
            if (!token || !await markGiftSeen(token)) {
              setLocked(true);
              return;
            }
            go({ kind: "letter", n: todayN }, true);
          } catch {
            setGiftError("Chưa thể mở thư hôm nay. Bạn thử lại nhé.");
          } finally {
            setOpeningToday(false);
          }
        }} />
        {giftError ? <p role="alert" className="mt-4 text-center text-[14px] text-rose">{giftError}</p> : null}
      </Shell>
    );
  }

  if (view.kind === "settings" && token) {
    const choice = (active: boolean) => `flex h-10 flex-1 items-center justify-center rounded-lg border text-[14px] transition ${active ? "border-gold bg-gold/15 text-gold" : "border-sage/30 text-paper hover:border-gold/60"}`;
    return <Shell>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => go(settingsReturnView)} aria-label="Quay lại lá thư" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage/35 text-paper transition hover:border-gold hover:text-gold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1 className="text-[24px] font-bold">Cài đặt thẻ</h1>
      </div>
      <p className="mt-1 text-[14px] text-sage">Những lựa chọn này đi cùng tấm thẻ của bạn.</p>

      <section className="mt-6 rounded-xl border border-sage/25 p-4" aria-labelledby="pace-heading">
        <h2 id="pace-heading" className="text-[16px] font-semibold">Nhịp đọc của tôi</h2>
        <p className="mt-1 text-[13px] text-sage">Chọn số lá tối đa có thể mở mỗi ngày. Mặc định là 1 lá.</p>
        <div className="mt-4 flex gap-2" role="group" aria-label="Số lá mỗi ngày">
          {[1, 2, 3, 4, 5].map((number) => <button key={number} type="button" aria-pressed={chosenLimit === number} onClick={() => setChosenLimit(number)} className={choice(chosenLimit === number)}>{number}</button>)}
        </div>
        {chosenLimit !== limit ? <button type="button" disabled={savingLimit} onClick={saveLimit} className="mt-3 rounded-lg border border-gold px-4 py-2 text-[14px] text-gold disabled:opacity-50">{savingLimit ? "Đang lưu..." : "Lưu nhịp đọc"}</button> : null}
      </section>

      <section className="mt-4 rounded-xl border border-sage/25 p-4" aria-labelledby="speed-heading">
        <h2 id="speed-heading" className="text-[16px] font-semibold">Tốc độ nghe</h2>
        <p className="mt-1 text-[13px] text-sage">Áp dụng cho giọng đọc của mọi lá thư.</p>
        <div className="mt-4 flex gap-2" role="group" aria-label="Tốc độ nghe">
          {[1, 1.2, 1.3, 1.4].map((number) => <button key={number} type="button" aria-pressed={chosenSpeed === number} onClick={() => setChosenSpeed(number)} className={choice(chosenSpeed === number)}>{String(number).replace(".", ",")}×</button>)}
        </div>
        {chosenSpeed !== speed ? <button type="button" disabled={savingSpeed} onClick={saveSpeed} className="mt-3 rounded-lg border border-gold px-4 py-2 text-[14px] text-gold disabled:opacity-50">{savingSpeed ? "Đang lưu..." : "Lưu tốc độ nghe"}</button> : null}
      </section>

      <section className="mt-4 rounded-xl border border-sage/25 p-4" aria-labelledby="experience-heading">
        <h2 id="experience-heading" className="text-[16px] font-semibold">Trải nghiệm đọc</h2>
        <div className="mt-4 divide-y divide-sage/15">
          {[
            { key: "autoPlayAudio" as const, label: "Tự động phát giọng đọc", description: "Một số trình duyệt có thể yêu cầu bạn chạm vào loa lần đầu." },
            { key: "pageSound" as const, label: "Âm thanh lật trang", description: "Phát tiếng giấy nhẹ mỗi khi bạn lật thư." },
            { key: "resumeReading" as const, label: "Tiếp tục từ lần đọc trước", description: "Lần quét sau mở lại lá bạn xem gần nhất." },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-paper">{item.label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-sage">{item.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={experience[item.key]}
                aria-label={item.label}
                disabled={savingExperience}
                onClick={() => void saveExperience({ [item.key]: !experience[item.key] })}
                className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${experience[item.key] ? "border-gold bg-gold/25" : "border-sage/35 bg-deep/30"}`}
              >
                <span className={`absolute top-1 h-[18px] w-[18px] rounded-full transition-all ${experience[item.key] ? "left-6 bg-gold" : "left-1 bg-sage"}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-sage/15 pt-4">
          <p className="text-[14px] text-paper">Theo dõi lời đọc</p>
          <p className="mt-0.5 text-[12px] text-sage">Chọn cách chữ thay đổi khi giọng đọc đang phát.</p>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Kiểu theo dõi lời đọc">
            {([
              ["ink", "Mực dần"],
              ["box", "Từng từ"],
              ["off", "Tắt"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={savingExperience}
                aria-pressed={experience.readingStyle === value}
                onClick={() => void saveExperience({ readingStyle: value })}
                className={`h-10 rounded-lg border px-2 text-[13px] transition disabled:opacity-50 ${experience.readingStyle === value ? "border-gold bg-gold/15 text-gold" : "border-sage/30 text-paper hover:border-gold/60"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {experienceError ? <p role="alert" className="mt-3 text-[13px] text-rose">{experienceError}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-sage/25 p-4" aria-labelledby="reminder-heading">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="reminder-heading" className="text-[16px] font-semibold">Nhắc tôi đọc thư</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-sage">Gửi thông báo trình duyệt mỗi ngày theo giờ Việt Nam.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(reminder)}
            aria-label="Nhắc tôi đọc thư"
            disabled={savingReminder}
            onClick={() => void saveReminder(reminder ? null : reminderDraft)}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${reminder ? "border-gold bg-gold/25" : "border-sage/35 bg-deep/30"}`}
          >
            <span className={`absolute top-1 h-[18px] w-[18px] rounded-full transition-all ${reminder ? "left-6 bg-gold" : "left-1 bg-sage"}`} />
          </button>
        </div>
        <p className="mt-4 rounded-lg border border-sage/20 px-3 py-2 text-[13px] text-paper">Nhắc lúc 07:00 mỗi ngày</p>
        <p className="mt-2 text-[11px] leading-relaxed text-sage/80">Bạn cần bật một lần để trình duyệt xin quyền thông báo. Trên iPhone/iPad, trang cần được thêm vào Màn hình chính.</p>
        {reminderError ? <p role="alert" className="mt-3 text-[13px] text-rose">{reminderError}</p> : null}
      </section>

      <section className="mb-6 mt-4 rounded-xl border border-sage/25 p-4" aria-labelledby="name-heading">
        <h2 id="name-heading" className="text-[16px] font-semibold">Bút danh cảm nghĩ</h2>
        <p className="mt-1 text-[13px] text-sage">Tên hiện bên cạnh cảm nghĩ bạn viết, kể cả những cảm nghĩ trước đây.</p>
        <p className="mt-3 text-[14px]">Đang dùng: <span className="font-semibold text-gold">{me?.name ?? "Một người đọc"}</span></p>
        {me && me.changesLeft > 0 ? <>
          <p className="mt-1 text-[12px] text-sage">Còn {me.changesLeft} lần đổi tên.</p>
          <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void saveName(nameDraft); }}>
            <label htmlFor="settings-pen-name" className="block text-[13px] text-sage">Tên bạn muốn dùng</label>
            <input id="settings-pen-name" className="field mt-2" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={PEN_NAME_MAX} autoComplete="nickname" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" disabled={savingName || nameDraft.trim() === me.name || nameDraft.trim().length < 2} className="rounded-lg border border-gold px-4 py-2 text-[14px] text-gold disabled:opacity-50">{savingName ? "Đang lưu..." : "Lưu bút danh"}</button>
              <button type="button" disabled={savingName} onClick={() => saveName(null)} className="rounded-lg border border-sage/35 px-4 py-2 text-[14px] text-paper disabled:opacity-50">Tên ngẫu nhiên khác</button>
            </div>
          </form>
        </> : <p className="mt-1 text-[12px] text-sage">Bạn đã dùng hết lượt đổi tên.</p>}
        {nameError ? <p role="alert" className="mt-3 text-[13px] text-rose">{nameError}</p> : null}
      </section>
      {paceError ? <p role="alert" className="mb-5 text-[13px] text-rose">{paceError}</p> : null}
    </Shell>;
  }

  if (view.kind === "box") {
    const filtering = onlyHearted && hearts.size > 0;
    const boxLetters = (trial ? letters.slice().reverse() : letters).filter((letter) => !filtering || hearts.has(letter.id));
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go(returnView)} aria-label="Quay lại" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage/35 text-paper transition hover:border-gold hover:text-gold">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h1 className="min-w-0 flex-1 text-[24px] font-bold">Hộp thư của bạn</h1>
        </div>
        <p className="mt-1 text-[14px] text-sage">
          {trial ? `${total} lá đọc thử, đọc lá nào trước cũng được.` : `Đã mở ${letters.length} trên ${total} lá.`}
        </p>
        {token ? <div className="mt-5 rounded-xl border border-sage/25 p-4">
          <p className="text-[14px] text-paper">Nhịp đọc: <span className="font-semibold text-gold">{limit} lá/ngày</span></p>
          <p className="mt-1 text-[13px] text-sage">{canOpenToday ? `Hôm nay còn ${remainingToday} lá có thể mở.` : "Chạm lại thẻ để bắt đầu ngày mới."}</p>
          {remainingToday > 0 ? <button type="button" disabled={openingNext} onClick={openNext} className="mt-4 rounded-lg bg-gold px-4 py-2.5 text-[14px] font-semibold text-deep disabled:opacity-50">{openingNext ? "Đang mở..." : "Đọc thêm một lá"}</button> : null}
          {paceError ? <p role="alert" className="mt-3 text-[13px] text-rose">{paceError}</p> : null}
        </div> : null}
        {hearts.size > 0 ? (
          <button
            type="button"
            aria-pressed={filtering}
            onClick={() => setOnlyHearted(!filtering)}
            className={`mt-4 flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] transition ${
              filtering ? "border-rose/70 text-rose" : "border-sage/35 text-sage hover:border-gold hover:text-gold"
            }`}
          >
            <HeartIcon filled={filtering} size={15} />
            {filtering ? "Xem tất cả lá đã mở" : `Chỉ xem ${hearts.size} lá đã thả tim`}
          </button>
        ) : null}
        <ul className="mt-5 flex flex-col gap-2.5">
          {gift && !filtering ? (
            <li>
              <button
                className="w-full rounded-xl border border-gold/50 px-4 py-3 text-left"
                onClick={() => go({ kind: "gift" })}
              >
                <span className="block text-[12px] uppercase tracking-wider text-gold">Lời mở đầu</span>
                <span className="block text-[15px]">
                  {gift.from ? `Lá thư từ ${gift.from}` : "Lá thư gửi riêng cho bạn"}
                </span>
              </button>
            </li>
          ) : null}
          {boxLetters.map((letter) => (
            <li key={letter.n}>
              <button
                className="w-full rounded-xl border border-sage/25 px-4 py-3 text-left transition hover:border-sage/60"
                onClick={() => go({ kind: "letter", n: letter.n })}
              >
                <span className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-sage">
                  Lá số {letter.n} · {themeLabel(letter.theme)}
                  {hearts.has(letter.id) ? <span className="text-rose"><HeartIcon filled size={13} /></span> : null}
                </span>
                <span className="block truncate text-[15px]">{letter.text}</span>
              </button>
            </li>
          ))}
        </ul>
        {!token ? <><TrialPurchase /><SocialFooter /></> : null}
      </Shell>
    );
  }

  const n = view.kind === "letter" ? view.n : todayN;
  const letter = letters.find((item) => item.n === n) ?? letters[0];
  if (!letter) return <Locked />;
  const isToday = letter.n === todayN;
  const toPaper = (item: Letter) => ({
    eyebrow: themeLabel(item.theme),
    title: `Lá thư số ${item.n}`,
    text: item.text,
    page: item.n,
  });
  const paper = toPaper(letter);
  // Hai lá liền kề đã mở, để lật trang qua lại như trong sách
  const previous = letters.find((item) => item.n === letter.n - 1);
  const next = letters.find((item) => item.n === letter.n + 1);

  const timings = audio[letter.n];

  return (
    <ReadingShell
      key={letter.n}
      letterId={letter.id}
      token={token}
      paper={paper}
      audio={timings ? { src: token ? `/v/${token}/audio/${letter.n}` : `/doc-thu/audio/${letter.n}`, words: timings } : null}
      voiceSpeed={speed}
      autoPlayAudio={experience.autoPlayAudio}
      readingStyle={experience.readingStyle}
      pageSound={experience.pageSound}
      opening={firstScreen}
      settled={turned}
      previous={previous ? toPaper(previous) : null}
      next={next ? toPaper(next) : null}
      onTurn={(direction) => go({ kind: "letter", n: letter.n + direction }, true)}
      actionBefore={
        <>
        {token || letters.length > 1 || gift ? (
          <button
            type="button"
            onClick={openBox}
            aria-label="Xem hộp thư"
            title="Xem hộp thư"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage/35 text-paper transition hover:border-gold hover:text-gold"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 6.5h16v11H4z" />
              <path d="m4.5 7 7.5 6 7.5-6" />
            </svg>
          </button>
        ) : null}
        {token ? <button type="button" onClick={openSettings} aria-label="Cài đặt thẻ" title="Cài đặt thẻ" className="flex h-10 w-10 items-center justify-center rounded-full border border-sage/35 text-paper transition hover:border-gold hover:text-gold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="M19.4 13.8a1.8 1.8 0 0 0 0-3.6l-.9-.2-.5-1.1.5-.8a1.8 1.8 0 0 0-2.5-2.5l-.8.5-1.1-.5-.2-.9a1.8 1.8 0 0 0-3.6 0l-.2.9-1.1.5-.8-.5a1.8 1.8 0 0 0-2.5 2.5l.5.8-.5 1.1-.9.2a1.8 1.8 0 0 0 0 3.6l.9.2.5 1.1-.5.8a1.8 1.8 0 0 0 2.5 2.5l.8-.5 1.1.5.2.9a1.8 1.8 0 0 0 3.6 0l.2-.9 1.1-.5.8.5a1.8 1.8 0 0 0 2.5-2.5l-.5-.8.5-1.1.9-.2Z" /></svg>
        </button> : null}
        </>
      }
    >
      {reactions ? (
        <LetterReactions
          letterId={letter.id}
          letterN={letter.n}
          hearted={hearts.has(letter.id)}
          heartCount={heartCounts[letter.id] ?? 0}
          commentCount={commentCounts[letter.id] ?? 0}
          token={token ?? null}
          onToggleHeart={() => toggleHeart(letter.id)}
          onCommentCount={(delta) => setCommentCounts((current) => ({ ...current, [letter.id]: Math.max(0, (current[letter.id] ?? 0) + delta) }))}
          onExpired={() => {
            if (token) setLocked(true);
          }}
        />
      ) : null}
      {isToday && todayN >= total ? (
        <p className="mt-6 text-center text-[14px] leading-relaxed text-sage">
          {trial
            ? `Bạn đã đọc hết ${total} lá đọc thử. 99 lá trong thẻ là những lá khác hẳn, bạn chưa đọc lá nào.`
            : "Bạn đã mở hết các lá thư. Cảm ơn bạn đã ghé mỗi ngày."}
        </p>
      ) : null}
      {token && isToday && remainingToday > 0 ? (
        <div className="mt-6 text-center">
          <p className="mb-3 text-[13px] text-sage">Hôm nay bạn còn {remainingToday} lá có thể mở.</p>
          <button type="button" disabled={openingNext} onClick={openNext} className="rounded-lg bg-gold px-5 py-2.5 text-[14px] font-semibold text-deep disabled:opacity-50">{openingNext ? "Đang mở..." : "Đọc thêm một lá"}</button>
          {paceError ? <p role="alert" className="mt-3 text-[13px] text-rose">{paceError}</p> : null}
        </div>
      ) : null}
      {!token ?<><TrialPurchase /><SocialFooter /></> : null}
    </ReadingShell>
  );
}
