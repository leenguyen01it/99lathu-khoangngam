"use server";

import { saveGiftLetter, saveGiftLetterByToken } from "@/server/cards";

export interface GiftFormState {
  ok: boolean;
  error?: string;
}

export async function submitGift(_prev: GiftFormState, formData: FormData): Promise<GiftFormState> {
  const token = String(formData.get("token") ?? "");
  const common = {
    from: String(formData.get("from") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const result = token
    ? await saveGiftLetterByToken({ token, ...common })
    : await saveGiftLetter({ uid: String(formData.get("uid") ?? ""), ...common });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
