import { getWhatsAppProvider } from "@/lib/whatsapp";
import { verifyMetaSignature } from "@/lib/whatsapp/verify-signature";
import { persistIncomingWhatsAppMessages } from "@/lib/server/whatsapp";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_WHATSAPP_VERIFY_TOKEN && challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (process.env.WHATSAPP_PROVIDER === "meta" && !verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  try {
    const messages = getWhatsAppProvider().parseIncoming(JSON.parse(rawBody));
    const persisted = await persistIncomingWhatsAppMessages(messages);
    return NextResponse.json({ received: true, messageCount: messages.length, persisted });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
