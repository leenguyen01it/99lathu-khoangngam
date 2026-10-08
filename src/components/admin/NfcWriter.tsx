"use client";

import { useEffect, useRef, useState } from "react";
import { writeAndVerifyNfc, type NfcReaderConstructor, type NfcStage } from "@/lib/nfc-writer";
import type { resolveNfcCard } from "@/server/nfc-cards";

type Card = Awaited<ReturnType<typeof resolveNfcCard>>;
type Batch = { id: string; createdAt: string; count: number };
type Phase = "idle" | "camera" | "resolving" | "ready" | NfcStage | "saving" | "done";
type Proof = { cardId: string; url: string; serialNumber: string; batchId?: string };
const stageLabels: Partial<Record<Phase, string>> = {
  camera: "Đưa QR của một thẻ vào camera.",
  resolving: "Đang nhận diện thẻ…",
  checking: "Áp chính thẻ vừa quét vào vùng NFC ở mặt lưng điện thoại. Đang kiểm tra chip…",
  writing: "Đang ghi URL vào chip. Giữ thẻ sát điện thoại; nếu chưa ghi, nhấc ra rồi chạm lại chính thẻ đó.",
  verifying: "Đã ghi. Nhấc thẻ ra rồi chạm lại chính thẻ đó để xác nhận.",
  saving: "QR và chip đã khớp. Đang lưu kết quả…",
  done: "Đã xác nhận chip khớp QR và lưu kết quả. Có thể chuyển sang thẻ tiếp theo.",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function requestApi<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/admin/nfc/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Không thể kết nối hệ thống. Vui lòng thử lại.");
  return data as T;
}

function errorLabel(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "Chưa có quyền camera hoặc NFC. Cho phép quyền truy cập trong Chrome và thử lại.";
    if (error.name === "NotSupportedError" || error.name === "NotFoundError") return "Thiết bị không hỗ trợ thao tác này. Dùng Chrome trên điện thoại Android có NFC, bật NFC và kiểm tra chip có thể ghi.";
    if (error.name === "NotReadableError" || error.name === "NetworkError") return "Không đọc hoặc ghi được chip. Kiểm tra NFC đã bật, chip chưa khóa và giữ đúng vị trí rồi thử lại.";
  }
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}

export function NfcWriter({ batches, initialBatchId, initialProgress }: { batches: Batch[]; initialBatchId: string; initialProgress: Record<string, number> }) {
  const [batchId, setBatchId] = useState(initialBatchId);
  const [progress, setProgress] = useState(initialProgress);
  const [card, setCard] = useState<Card | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [secure, setSecure] = useState(true);
  const [manualUrl, setManualUrl] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraGeneration = useRef(0);
  const cameraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operation = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  function stopCamera() {
    cameraGeneration.current += 1;
    if (cameraTimer.current) clearTimeout(cameraTimer.current);
    cameraTimer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }

  useEffect(() => {
    mounted.current = true;
    setSupported("NDEFReader" in window);
    setSecure(window.isSecureContext);
    const onHidden = () => {
      if (document.hidden) {
        stopCamera();
        operation.current?.abort();
        setPhase((current) => current === "saving" || current === "done" ? current : "idle");
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      mounted.current = false;
      stopCamera();
      operation.current?.abort();
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  const selectedBatch = batches.find((batch) => batch.id === batchId);
  const busy = ["camera", "resolving", "checking", "writing", "verifying", "saving"].includes(phase);
  const completed = batchId ? progress[batchId] ?? 0 : Object.values(progress).reduce((sum, count) => sum + count, 0);

  async function identify(url: string) {
    if (operation.current) return;
    stopCamera();
    const controller = new AbortController();
    operation.current = controller;
    setPhase("resolving");
    setError("");
    setCard(null);
    setProof(null);
    try {
      const result = await requestApi<{ card: Card }>({ operation: "resolve", url, batchId }, controller.signal);
      if (!controller.signal.aborted && mounted.current) { setCard(result.card); setPhase("ready"); }
    } catch (failure) {
      if (!controller.signal.aborted && mounted.current) { setError(errorLabel(failure)); setPhase("idle"); }
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }

  async function startCamera() {
    if (busy || operation.current) return;
    stopCamera();
    const generation = cameraGeneration.current;
    setPhase("camera"); setError(""); setCard(null); setProof(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera cần kết nối HTTPS và quyền truy cập. Bạn cũng có thể dán URL QR bên dưới.");
      const { default: jsQR } = await import("jsqr");
      if (generation !== cameraGeneration.current || !mounted.current) return;
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (generation !== cameraGeneration.current || !mounted.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      const preview = video.current;
      if (!preview) { stopCamera(); return; }
      preview.srcObject = media;
      await preview.play();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Không thể đọc ảnh camera.");
      const scan = () => {
        if (generation !== cameraGeneration.current || !mounted.current) return;
        try {
          if (preview.readyState >= 2 && preview.videoWidth && preview.videoHeight) {
            canvas.width = Math.min(preview.videoWidth, 720);
            canvas.height = Math.round(preview.videoHeight * canvas.width / preview.videoWidth);
            context.drawImage(preview, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(frame.data, frame.width, frame.height);
            if (qr?.data) { void identify(qr.data); return; }
          }
          cameraTimer.current = setTimeout(scan, 180);
        } catch (failure) {
          stopCamera(); setError(errorLabel(failure)); setPhase("idle");
        }
      };
      scan();
    } catch (failure) {
      if (generation === cameraGeneration.current && mounted.current) { stopCamera(); setError(errorLabel(failure)); setPhase("idle"); }
    }
  }

  async function saveProof(value: Proof) {
    setPhase("saving");
    const result = await requestApi<{ card: Card; progress: Record<string, number> }>({ operation: "verify", ...value });
    if (mounted.current) { setCard(result.card); setProgress(result.progress); setProof(null); setPhase("done"); }
  }

  async function writeCard() {
    if (!card || operation.current) return;
    const Reader = (window as unknown as { NDEFReader?: NfcReaderConstructor }).NDEFReader;
    if (!Reader) { setError("Ghi NFC cần Chrome trên điện thoại Android có NFC."); return; }
    const controller = new AbortController();
    operation.current = controller;
    setError("");
    let verified = false;
    try {
      const result = await writeAndVerifyNfc(Reader, card.url, controller.signal, (stage) => { if (mounted.current) setPhase(stage); });
      if (controller.signal.aborted || !mounted.current) return;
      verified = true;
      const value = { cardId: card.id, url: result.url, serialNumber: result.serialNumber, batchId: card.batchId ?? undefined };
      setProof(value);
      await saveProof(value);
    } catch (failure) {
      if (!controller.signal.aborted && mounted.current) {
        setError(verified ? `Chip đã khớp QR nhưng chưa lưu được kết quả: ${errorLabel(failure)}` : errorLabel(failure));
        setPhase("ready");
      }
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }

  function cancel() {
    stopCamera(); operation.current?.abort(); setError(""); setPhase(card ? "ready" : "idle");
  }

  return <div className="mt-6 space-y-4">
    <section className="rounded-2xl border border-sage/25 p-4">
      <label className="block text-[14px] text-sage">Đợt thẻ đang ghi
        <select className="field mt-2" value={batchId} disabled={busy} onChange={(event) => { setBatchId(event.target.value); setCard(null); setProof(null); setError(""); setPhase("idle"); }}>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{dateLabel(batch.createdAt)} · {batch.count} thẻ</option>)}
          <option value="">Tất cả đợt / thẻ cũ</option>
        </select>
      </label>
      <p className="mt-3 text-[20px] font-semibold text-gold">Đã xác nhận {completed}{selectedBatch ? ` / ${selectedBatch.count}` : ""} thẻ</p>
      {selectedBatch ? <progress aria-label="Tiến độ ghi thẻ" className="mt-2 w-full accent-gold" value={completed} max={selectedBatch.count} /> : null}
    </section>

    {!secure ? <p role="alert" className="rounded-xl border border-rose/30 p-4 text-[14px] text-rose">Mở trang qua HTTPS để dùng camera và NFC.</p> : null}
    {supported === false ? <p className="rounded-xl border border-sage/25 p-4 text-[14px] text-sage">Thiết bị này có thể tra cứu QR. Để ghi chip, hãy mở trang bằng Chrome trên điện thoại Android có NFC và bật NFC.</p> : null}

    <section className="rounded-2xl border border-sage/25 p-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy || !secure} onClick={() => void startCamera()}>{phase === "done" ? "Quét thẻ tiếp theo" : "Quét QR trên thẻ"}</button>
        {busy && phase !== "saving" ? <button type="button" className="btn-ghost" onClick={cancel}>Hủy</button> : null}
      </div>
      <video ref={video} muted playsInline className={`mt-4 aspect-video w-full rounded-xl bg-black object-cover ${phase === "camera" ? "" : "hidden"}`} />
      <details className="mt-4 text-[14px] text-sage">
        <summary className="cursor-pointer">Nhập URL QR nếu camera không dùng được</summary>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void identify(manualUrl); }}>
          <input type="url" className="field min-w-0 flex-1" placeholder="Dán URL nguyên gốc trong QR" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} required disabled={busy} aria-label="URL trong QR" />
          <button className="btn-ghost" disabled={busy}>Nhận diện</button>
        </form>
        <p className="mt-2 text-[12px]">Chỉ lấy nội dung QR, không mở link để tránh kích hoạt thẻ.</p>
      </details>
    </section>

    {card ? <section className="rounded-2xl border border-gold/30 p-5">
      <p className="text-[26px] font-bold text-gold">{card.number ?? "Thẻ cũ"}</p>
      <p className="mt-1 text-[14px] text-sage">{card.batchCreatedAt ? `Đợt ${dateLabel(card.batchCreatedAt)} · ${card.batchCount} thẻ` : "Thẻ được tạo trước tính năng chia đợt"}</p>
      {card.verifiedAt ? <p className="mt-2 text-[14px] text-sage">Đã xác nhận trước đó: {dateLabel(card.verifiedAt)}. Kiểm tra lại không làm tăng số thẻ đã hoàn tất.</p> : null}
      <p className="mt-2 text-[14px] text-gold">{card.activated ? "Thẻ này đã được kích hoạt." : "Thẻ chưa kích hoạt."} <a href={`/admin/cards/${card.id}`} className="underline">Kiểm tra chi tiết{card.activated ? " và đặt lại trước khi giao" : ""}</a></p>
      <p className="mt-3 break-all font-mono text-[12px] text-sage">{card.url}</p>
      {phase !== "done" ? <button type="button" className="btn mt-4" disabled={busy || supported !== true || !secure || Boolean(proof)} onClick={() => void writeCard()}>Ghi NFC và kiểm tra</button> : null}
      {proof && phase !== "saving" ? <button type="button" className="btn mt-4" onClick={() => {
        if (operation.current) return;
        const controller = new AbortController(); operation.current = controller; setError("");
        void saveProof(proof).catch((failure) => { if (mounted.current) { setError(errorLabel(failure)); setPhase("ready"); } }).finally(() => { if (operation.current === controller) operation.current = null; });
      }}>Lưu lại kết quả</button> : null}
    </section> : null}

    <p role="status" aria-live="polite" className={`text-[15px] leading-relaxed ${phase === "done" ? "text-gold" : "text-sage"}`}>{stageLabels[phase] ?? ""}</p>
    {error ? <p role="alert" className="rounded-xl border border-rose/30 p-4 text-[14px] text-rose">{error}</p> : null}
    <p className="text-[12px] leading-relaxed text-sage/70">Mỗi lần chỉ đặt một thẻ gần điện thoại. Chip có dữ liệu khác sẽ không bị ghi đè. Trang này không mở lá thư và không khóa chip.</p>
  </div>;
}
