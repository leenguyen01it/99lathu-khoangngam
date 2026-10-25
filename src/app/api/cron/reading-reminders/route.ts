import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function vietnamNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "web_push_not_configured" }, { status: 503 });
  }
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@khoangngam.com", publicKey, privateKey);

  const now = vietnamNow();
  const cards = await prisma.card.findMany({
    where: {
      reminderTime: "20:00",
      NOT: { reminderLastSentDay: now.day },
      OR: [{ lastOpenedDay: null }, { lastOpenedDay: { not: now.day } }],
      pushSubscriptions: { some: {} },
    },
    select: { id: true, pushSubscriptions: true },
  });
  let sent = 0;
  for (const card of cards) {
    let delivered = false;
    for (const subscription of card.pushSubscriptions) {
      try {
        await webPush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({
            title: "Một khoảng ngẫm cho hôm nay",
            body: "Lá thư hôm nay đang chờ bạn. Chạm thẻ và dành ít phút cho mình nhé.",
            url: site.url,
          }),
          { TTL: 60 * 60 * 6 },
        );
        delivered = true;
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        }
      }
    }
    if (delivered) {
      await prisma.card.update({ where: { id: card.id }, data: { reminderLastSentDay: now.day } });
    }
  }
  return NextResponse.json({ cards: cards.length, sent, at: `${now.day} ${now.time}` });
}
