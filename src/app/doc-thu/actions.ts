"use server";

import { cookies, headers } from "next/headers";
import { READER_COOKIE, isBot, isReaderId } from "@/lib/trial-reader";
import { recordTrialRead } from "@/server/trial";

export async function markTrialRead(n: number): Promise<void> {
  const readerId = (await cookies()).get(READER_COOKIE)?.value;
  if (!isReaderId(readerId) || isBot((await headers()).get("user-agent"))) return;
  await recordTrialRead(readerId, n);
}
