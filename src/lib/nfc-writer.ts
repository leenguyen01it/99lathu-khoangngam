export type NfcRecord = { recordType: string; data?: DataView };
export type NfcReading = { serialNumber: string; message: { records: NfcRecord[] } };
export interface NfcReader extends EventTarget {
  scan(options: { signal: AbortSignal }): Promise<void>;
  write(message: { records: { recordType: "url"; data: string }[] }, options: { signal: AbortSignal; overwrite: boolean }): Promise<void>;
}
export type NfcReaderConstructor = new () => NfcReader;
export type NfcStage = "checking" | "writing" | "verifying";

export function nfcUrlFromReading(reading: NfcReading): string | null {
  const records = reading.message.records.filter((record) => record.recordType !== "empty");
  if (records.length !== 1 || records[0]?.recordType !== "url" || !records[0].data) return null;
  return new TextDecoder().decode(records[0].data);
}

function nextReading(reader: NfcReader, signal: AbortSignal): Promise<NfcReading> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      reader.removeEventListener("reading", onRead);
      reader.removeEventListener("readingerror", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onRead = (event: Event) => { cleanup(); resolve(event as unknown as NfcReading); };
    const onError = () => { cleanup(); reject(new Error("Không đọc được chip. Giữ thẻ sát vùng NFC và thử lại.")); };
    const onAbort = () => { cleanup(); reject(signal.reason ?? new DOMException("Đã hủy", "AbortError")); };
    reader.addEventListener("reading", onRead);
    reader.addEventListener("readingerror", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

/** Inspect before writing, then require a fresh read of the same tag. Never navigate to its URL. */
export async function writeAndVerifyNfc(
  Reader: NfcReaderConstructor,
  url: string,
  signal: AbortSignal,
  onStage: (stage: NfcStage) => void,
): Promise<{ url: string; serialNumber: string }> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();
  const timer = setTimeout(() => controller.abort(new Error("Hết thời gian chờ thẻ. Bấm Ghi NFC để thử lại.")), 60_000);
  const reader = new Reader();
  try {
    onStage("checking");
    // Subscribe before starting the scan so a tag already in range is captured.
    const firstRead = nextReading(reader, controller.signal);
    void firstRead.catch(() => {});
    await reader.scan({ signal: controller.signal });
    const before = await firstRead;
    const existingUrl = nfcUrlFromReading(before);
    if (existingUrl === url) return { url: existingUrl, serialNumber: before.serialNumber };
    if (before.message.records.some((record) => record.recordType !== "empty")) {
      throw new Error("Chip đang chứa dữ liệu khác QR vừa quét. Không ghi đè; hãy kiểm tra lại đúng thẻ.");
    }
    onStage("writing");
    // Some factory-formatted tags contain an empty NDEF record, which also needs replacing.
    await reader.write({ records: [{ recordType: "url", data: url }] }, { signal: controller.signal, overwrite: before.message.records.length > 0 });
    const verifiedRead = nextReading(reader, controller.signal);
    onStage("verifying");
    const after = await verifiedRead;
    if (before.serialNumber && after.serialNumber && before.serialNumber !== after.serialNumber) {
      throw new Error("Bạn vừa chạm một chip khác. Chưa xác nhận hoàn tất; hãy quét và kiểm tra lại đúng thẻ.");
    }
    const actualUrl = nfcUrlFromReading(after);
    if (actualUrl !== url) throw new Error("URL trong chip chưa khớp với QR. Chưa xác nhận hoàn tất; hãy thử lại.");
    return { url: actualUrl, serialNumber: after.serialNumber || before.serialNumber };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    controller.abort();
  }
}
