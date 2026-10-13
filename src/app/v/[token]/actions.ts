"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { READER_COOKIE, isReaderId } from "@/lib/trial-reader";
import {
  addLetterComment,
  deleteOwnComment,
  listLetterComments,
  setLetterHeart,
  setPenName,
  type AddCommentResult,
  type CommentPage,
  type SetPenNameResult,
  type Viewer,
} from "@/server/reactions";
import { resolveScanToken } from "@/server/scans";

// Tim và cảm nghĩ dùng chung cho thẻ thật và bản đọc thử.
// Có `token` là phiên chạm thẻ; `token` là null thì nhận diện người đọc thử qua cookie.
// Không lọc bot theo user-agent như lúc đếm người đọc thử: bộ lọc đó chặn cả trình duyệt
// trong ứng dụng Zalo, mà người dùng thật ở đó vẫn phải thả tim và viết được.
async function viewerOf(token: string | null): Promise<Viewer | null> {
  if (token) return { token: String(token).slice(0, 600) };
  const readerId = (await cookies()).get(READER_COOKIE)?.value;
  return isReaderId(readerId) ? { readerId } : null;
}

const short = (id: string) => String(id).slice(0, 64);

/** Trả false nếu phiên chạm thẻ đã hết hạn, hoặc không nhận diện được người đọc thử. */
export async function setHeart(token: string | null, letterId: string, on: boolean): Promise<boolean> {
  const viewer = await viewerOf(token);
  return viewer ? setLetterHeart(viewer, short(letterId), Boolean(on)) : false;
}

/** Trả null trong cùng trường hợp setHeart trả false. */
export async function loadComments(token: string | null, letterId: string, after?: string): Promise<CommentPage | null> {
  const viewer = await viewerOf(token);
  return viewer ? listLetterComments(viewer, short(letterId), after ? short(after) : undefined) : null;
}

export async function sendComment(token: string | null, letterId: string, text: string): Promise<AddCommentResult> {
  const viewer = await viewerOf(token);
  return viewer ? addLetterComment(viewer, short(letterId), String(text)) : { ok: false, reason: "expired" };
}

/** Trả false trong cùng trường hợp setHeart trả false. */
export async function deleteComment(token: string | null, commentId: string): Promise<boolean> {
  const viewer = await viewerOf(token);
  return viewer ? deleteOwnComment(viewer, short(commentId)) : false;
}

/** Đổi tên thành `name`, hoặc bốc một bút danh ngẫu nhiên khác nếu `name` là null. */
export async function changePenName(token: string | null, name: string | null): Promise<SetPenNameResult> {
  const viewer = await viewerOf(token);
  if (!viewer) return { ok: false, reason: "expired" };
  return setPenName(viewer, name === null ? null : String(name).slice(0, 100));
}

export async function markGiftSeen(token: string): Promise<boolean> {
  const scan = await resolveScanToken(token);
  if (!scan) return false;
  await prisma.card.updateMany({
    where: { id: scan.cardId, giftSeenAt: null, giftMessage: { not: null } },
    data: { giftSeenAt: new Date() },
  });
  return true;
}
