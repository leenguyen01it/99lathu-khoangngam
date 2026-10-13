import type { AdminActor } from "@/lib/admin";
import { dayKey } from "@/lib/day";
import { COMMENT_MAX, getLetterById } from "@/lib/letters";
import { PEN_NAME_CHANGES, cleanPenName, penTone, randomPenName } from "@/lib/pen-names";
import { prisma } from "@/lib/prisma";
import { resolveOpenedLetter, resolveScanToken } from "./scans";
import type { ShareCount } from "./shares";

// Tim và cảm nghĩ dưới lá thư.
// Với thẻ thật, cả hai gắn với thẻ chứ không theo điện thoại: chạm thẻ ở máy nào cũng thấy lại.
// Với bản đọc thử, chúng gắn với mã ẩn danh trong cookie kn_reader của trình duyệt.
// Hai bên không lẫn nhau: thẻ chỉ thao tác trên 99 lá chính, người đọc thử chỉ trên bộ đọc thử.

export const COMMENT_PAGE = 10;
/** Số cảm nghĩ một người gửi được trong 24 giờ. Người đọc thử ẩn danh nên được ít hơn. */
const COMMENTS_PER_DAY = { card: 20, reader: 5 };

/** Người đang xem trang, theo thứ họ mang tới: mã phiên chạm thẻ, hoặc mã người đọc thử. */
export type Viewer = { token: string } | { readerId: string };
/** Người đứng tên một lượt tim hay một cảm nghĩ. Dùng thẳng làm điều kiện và dữ liệu cho Prisma. */
export type Writer = { cardId: string } | { readerId: string };

const isCard = (writer: Writer): writer is { cardId: string } => "cardId" in writer;

/**
 * Xác định ai đang thao tác. Nếu truyền `letterId` thì lá đó phải là lá người này được đọc:
 * lá chính đã mở trên thẻ, hoặc một lá đọc thử. Trả null nếu phiên chạm thẻ hết hạn hoặc lá không hợp lệ.
 */
async function writerFor(viewer: Viewer, letterId?: string): Promise<Writer | null> {
  if ("token" in viewer) {
    const cardId = letterId ? await resolveOpenedLetter(viewer.token, letterId) : (await resolveScanToken(viewer.token))?.cardId;
    return cardId ? { cardId } : null;
  }
  if (letterId && !getLetterById(letterId)?.trial) return null;
  // Dòng người đọc thử thường đã có từ lúc mở trang; tạo nếu chưa, vì tim và cảm nghĩ trỏ về nó.
  const today = dayKey();
  await prisma.trialReader.upsert({
    where: { id: viewer.readerId },
    create: { id: viewer.readerId, startedOn: today, lastDay: today },
    update: {},
  });
  return { readerId: viewer.readerId };
}

/** Thả hoặc bỏ tim một lá thư. Trả false nếu không xác định được người thao tác. */
export async function setLetterHeart(viewer: Viewer, letterId: string, on: boolean): Promise<boolean> {
  const writer = await writerFor(viewer, letterId);
  if (!writer) return false;
  const key = { ...writer, letterId };
  if (on) await prisma.letterHeart.createMany({ data: [key], skipDuplicates: true });
  else await prisma.letterHeart.deleteMany({ where: key });
  return true;
}

export interface PenName {
  name: string;
  changesLeft: number; // còn được đổi tên mấy lần
}

const penFields = { penName: true, penNameChanges: true } as const;

/** Tên của một người trong phần cảm nghĩ; chưa có thì hệ thống đặt sẵn một bút danh. */
async function penNameOf(writer: Writer): Promise<PenName> {
  const fresh = { penName: randomPenName() };
  let row: { penName: string | null; penNameChanges: number };
  if (isCard(writer)) {
    await prisma.card.updateMany({ where: { id: writer.cardId, penName: null }, data: fresh });
    row = await prisma.card.findUniqueOrThrow({ where: { id: writer.cardId }, select: penFields });
  } else {
    await prisma.trialReader.updateMany({ where: { id: writer.readerId, penName: null }, data: fresh });
    row = await prisma.trialReader.findUniqueOrThrow({ where: { id: writer.readerId }, select: penFields });
  }
  return { name: row.penName ?? "Một người đọc", changesLeft: Math.max(0, PEN_NAME_CHANGES - row.penNameChanges) };
}

export type SetPenNameResult = { ok: true; me: PenName } | { ok: false; reason: "expired" | "invalid" | "limit" };

/**
 * Đổi tên thành tên người dùng tự gõ, hoặc một bút danh ngẫu nhiên khác nếu `input` là null.
 * Mọi cảm nghĩ cũ của người đó hiện theo tên mới.
 */
export async function setPenName(viewer: Viewer, input: string | null): Promise<SetPenNameResult> {
  const writer = await writerFor(viewer);
  if (!writer) return { ok: false, reason: "expired" };
  const name = input === null ? randomPenName() : cleanPenName(input);
  if (!name) return { ok: false, reason: "invalid" };
  const stillAllowed = { penNameChanges: { lt: PEN_NAME_CHANGES } };
  const data = { penName: name, penNameChanges: { increment: 1 } };
  const updated = isCard(writer)
    ? await prisma.card.updateMany({ where: { id: writer.cardId, ...stillAllowed }, data })
    : await prisma.trialReader.updateMany({ where: { id: writer.readerId, ...stillAllowed }, data });
  if (!updated.count) return { ok: false, reason: "limit" };
  return { ok: true, me: await penNameOf(writer) };
}

/** Quản trị viên thay một tên không phù hợp bằng một bút danh ngẫu nhiên. Tên cũ được giữ trong nhật ký quản trị. */
export async function resetPenName(writer: Writer, actor: AdminActor): Promise<void> {
  if (actor.role !== "owner" && actor.role !== "manager") throw new Error("Không có quyền đặt lại tên.");
  const penName = randomPenName();
  await prisma.$transaction(async (tx) => {
    const previous = isCard(writer)
      ? await tx.card.findUnique({ where: { id: writer.cardId }, select: { penName: true } })
      : await tx.trialReader.findUnique({ where: { id: writer.readerId }, select: { penName: true } });
    if (!previous?.penName) return;
    if (isCard(writer)) await tx.card.update({ where: { id: writer.cardId }, data: { penName } });
    else await tx.trialReader.update({ where: { id: writer.readerId }, data: { penName } });
    await tx.adminAuditLog.create({ data: {
      adminUserId: actor.id, action: "reset_pen_name",
      entityType: isCard(writer) ? "card" : "trial_reader", entityId: isCard(writer) ? writer.cardId : writer.readerId,
      metadataJson: JSON.stringify({ from: previous.penName, to: penName }), ipHash: actor.ipHash,
    } });
  });
}

export interface LetterCommentView {
  id: string;
  text: string;
  at: string; // thời điểm gửi, dạng ISO
  mine: boolean; // do chính người đang xem gửi
  name: string; // tên của người gửi
  tone: number; // số màu vòng tròn đại diện, cố định theo người gửi
  readerN: number | null; // lá mới nhất thẻ đó đã mở; null với người đọc thử
}

const withAuthor = {
  card: { select: { currentN: true, penName: true } },
  reader: { select: { penName: true } },
} as const;

interface CommentRow {
  id: string;
  cardId: string | null;
  readerId: string | null;
  text: string;
  createdAt: Date;
  card: { currentN: number; penName: string | null } | null;
  reader: { penName: string | null } | null;
}

const toView = (row: CommentRow, writer: Writer): LetterCommentView => ({
  id: row.id,
  text: row.text,
  at: row.createdAt.toISOString(),
  mine: isCard(writer) ? row.cardId === writer.cardId : row.readerId === writer.readerId,
  name: (row.card ?? row.reader)?.penName ?? "Một người đọc",
  tone: penTone(row.cardId ?? row.readerId ?? row.id),
  readerN: row.card?.currentN ?? null,
});

export type AddCommentResult =
  | { ok: true; comment: LetterCommentView }
  | { ok: false; reason: "expired" | "empty" | "limit" };

/** Gửi một cảm nghĩ dưới lá thư. */
export async function addLetterComment(viewer: Viewer, letterId: string, input: string): Promise<AddCommentResult> {
  const writer = await writerFor(viewer, letterId);
  if (!writer) return { ok: false, reason: "expired" };
  const text = input.trim().slice(0, COMMENT_MAX);
  if (!text) return { ok: false, reason: "empty" };
  const recent = await prisma.letterComment.count({ where: { ...writer, createdAt: { gt: new Date(Date.now() - 86_400_000) } } });
  if (recent >= COMMENTS_PER_DAY[isCard(writer) ? "card" : "reader"]) return { ok: false, reason: "limit" };
  await penNameOf(writer);
  const row = await prisma.letterComment.create({ data: { ...writer, letterId, text }, include: withAuthor });
  return { ok: true, comment: toView(row, writer) };
}

/** Một người xoá cảm nghĩ của chính mình. Trả false nếu không xác định được người thao tác. */
export async function deleteOwnComment(viewer: Viewer, commentId: string): Promise<boolean> {
  const writer = await writerFor(viewer);
  if (!writer) return false;
  await prisma.letterComment.deleteMany({ where: { id: commentId, ...writer } });
  return true;
}

export interface CommentPage {
  items: LetterCommentView[];
  next: string | null; // id cảm nghĩ cuối trang, truyền lại để lấy trang kế
  me: PenName; // tên của người đang xem
}

/**
 * Một trang cảm nghĩ của lá thư, mới nhất đứng đầu.
 * Trả null nếu không xác định được người xem hoặc họ không được đọc lá này.
 */
export async function listLetterComments(viewer: Viewer, letterId: string, after?: string): Promise<CommentPage | null> {
  const writer = await writerFor(viewer, letterId);
  if (!writer) return null;
  const me = await penNameOf(writer);
  const rows = await prisma.letterComment.findMany({
    where: { letterId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: COMMENT_PAGE + 1,
    include: withAuthor,
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  });
  const items = rows.slice(0, COMMENT_PAGE).map((row) => toView(row, writer));
  return { items, next: rows.length > COMMENT_PAGE ? items.at(-1)?.id ?? null : null, me };
}

export interface Reactions {
  hearted: string[]; // id những lá người đang xem đã thả tim
  heartCounts: Record<string, number>; // tổng lượt tim của mọi người, theo id lá thư
  commentCounts: Record<string, number>; // tổng số cảm nghĩ, theo id lá thư
}

/** Tim của người đang xem (nếu biết là ai), kèm tổng lượt tim và số cảm nghĩ của những lá đang hiện. */
export async function reactionsFor(writer: Writer | null, letterIds: string[]): Promise<Reactions> {
  const shown = { letterId: { in: letterIds } };
  const [hearts, heartCounts, commentCounts] = await Promise.all([
    writer ? prisma.letterHeart.findMany({ where: writer, select: { letterId: true } }) : [],
    prisma.letterHeart.groupBy({ by: ["letterId"], where: shown, _count: { letterId: true } }),
    prisma.letterComment.groupBy({ by: ["letterId"], where: shown, _count: { letterId: true } }),
  ]);
  const byLetter = (rows: { letterId: string; _count: { letterId: number } }[]) =>
    Object.fromEntries(rows.map((row) => [row.letterId, row._count.letterId]));
  return {
    hearted: hearts.map((row) => row.letterId),
    heartCounts: byLetter(heartCounts),
    commentCounts: byLetter(commentCounts),
  };
}

const letterTitle = (letterId: string) => {
  const found = getLetterById(letterId);
  if (!found) return letterId;
  return found.trial ? `Lá đọc thử số ${found.letter.n}` : `Lá thư số ${found.letter.n}`;
};

const ranked = (rows: { letterId: string; _count: { letterId: number } }[]): ShareCount[] =>
  rows.map((row) => ({
    letterId: row.letterId,
    count: row._count.letterId,
    title: letterTitle(row.letterId),
    excerpt: getLetterById(row.letterId)?.letter.text.slice(0, 70) ?? "",
  }));

/** Những lá thư được thả tim nhiều nhất. */
export async function topHeartedLetters(limit = 10): Promise<ShareCount[]> {
  const rows = await prisma.letterHeart.groupBy({
    by: ["letterId"],
    _count: { letterId: true },
    orderBy: { _count: { letterId: "desc" } },
    take: limit,
  });
  return ranked(rows);
}

/** Những lá thư có nhiều cảm nghĩ nhất. */
export async function topCommentedLetters(limit = 10): Promise<ShareCount[]> {
  const rows = await prisma.letterComment.groupBy({
    by: ["letterId"],
    _count: { letterId: true },
    orderBy: { _count: { letterId: "desc" } },
    take: limit,
  });
  return ranked(rows);
}

/** Tổng số tim, hoặc số tim của riêng một thẻ nếu truyền cardId. */
export async function countHearts(cardId?: string): Promise<number> {
  return prisma.letterHeart.count({ where: cardId ? { cardId } : undefined });
}

/** Tổng số cảm nghĩ, hoặc số cảm nghĩ của riêng một thẻ nếu truyền cardId. */
export async function countComments(cardId?: string): Promise<number> {
  return prisma.letterComment.count({ where: cardId ? { cardId } : undefined });
}

export interface AdminComment {
  id: string;
  text: string;
  createdAt: Date;
  letterTitle: string;
  penName: string | null;
  card: { id: string; uid: string } | null; // null: do người đọc thử gửi
  readerId: string | null;
}

/** Cảm nghĩ cho trang quản trị, mới nhất đứng đầu. */
export async function listCommentsForAdmin(page: number, size: number): Promise<{ total: number; items: AdminComment[] }> {
  const [total, rows] = await Promise.all([
    prisma.letterComment.count(),
    prisma.letterComment.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * size,
      take: size,
      include: { card: { select: { id: true, uid: true, penName: true } }, reader: { select: { penName: true } } },
    }),
  ]);
  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.createdAt,
      letterTitle: letterTitle(row.letterId),
      penName: (row.card ?? row.reader)?.penName ?? null,
      card: row.card ? { id: row.card.id, uid: row.card.uid } : null,
      readerId: row.readerId,
    })),
  };
}

/** Quản trị viên gỡ một cảm nghĩ. Nội dung bị gỡ được giữ trong nhật ký quản trị. */
export async function removeComment(id: string, actor: AdminActor): Promise<void> {
  if (actor.role !== "owner" && actor.role !== "manager") throw new Error("Không có quyền gỡ bình luận.");
  await prisma.$transaction(async (tx) => {
    const comment = await tx.letterComment.findUnique({ where: { id } });
    if (!comment) return;
    await tx.letterComment.delete({ where: { id } });
    await tx.adminAuditLog.create({ data: {
      adminUserId: actor.id, action: "remove_comment", entityType: "letter_comment", entityId: id,
      metadataJson: JSON.stringify({ cardId: comment.cardId, readerId: comment.readerId, letterId: comment.letterId, text: comment.text }),
      ipHash: actor.ipHash,
    } });
  });
}
