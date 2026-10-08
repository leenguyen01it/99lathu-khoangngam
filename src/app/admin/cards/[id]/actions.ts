"use server";

import { revalidatePath } from "next/cache";
import { requireWriteAdmin } from "@/lib/admin";
import { resetCardActivation } from "@/server/cards";

export async function resetActivation(id: string, formData: FormData) {
  const actor = await requireWriteAdmin();
  if (formData.get("confirm") !== "yes") return;
  await resetCardActivation(id, actor);
  revalidatePath("/admin", "layout");
  revalidatePath("/uid/[hash]", "page");
}
