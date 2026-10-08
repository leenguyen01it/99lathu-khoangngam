import { getAdminActor } from "@/lib/admin";
import { NfcCardError, recordNfcVerification, resolveNfcCard } from "@/server/nfc-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor || actor.role === "support") return Response.json({ error: "Bạn không có quyền ghi thẻ NFC." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string" || body.url.length > 2048) throw new NfcCardError("URL không hợp lệ.");
    const input = body as Record<string, unknown>;
    const batchId = typeof input.batchId === "string" && input.batchId ? input.batchId : undefined;
    if (input.operation === "resolve") return Response.json({ card: await resolveNfcCard(body.url, batchId) });
    if (input.operation === "verify" && typeof input.cardId === "string" && typeof input.serialNumber === "string") {
      return Response.json(await recordNfcVerification(actor, { cardId: input.cardId, url: body.url, serialNumber: input.serialNumber, batchId }));
    }
    throw new NfcCardError("Yêu cầu không hợp lệ.");
  } catch (error) {
    if (error instanceof NfcCardError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
    console.error("NFC admin request failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Không thể lưu hoặc tra cứu thẻ. Vui lòng thử lại." }, { status: 500 });
  }
}
