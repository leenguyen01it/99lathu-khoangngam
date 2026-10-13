"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAdmin } from "@/lib/admin";
import { removeComment, resetPenName } from "@/server/reactions";

export async function removeCommentAction(id: string) {
  const actor = await requireWriteAdmin();
  await removeComment(id, actor);
  revalidatePath("/admin", "layout");
}

export async function resetPenNameAction(kind: "card" | "reader", id: string) {
  const actor = await requireWriteAdmin();
  await resetPenName(kind === "card" ? { cardId: id } : { readerId: id }, actor);
  revalidatePath("/admin", "layout");
}
