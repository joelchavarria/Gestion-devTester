import { createHmac, timingSafeEqual } from "node:crypto";
import { persistIncomingWhatsAppMessages } from "@/lib/server/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const companyId = z.string().uuid();
const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("channel.status"),
    companyId,
    connectionStatus: z.enum(["disconnected", "pending", "connected", "error"]),
    phoneNumber: z.string().nullable(),
  }),
  z.object({
    type: z.literal("message.received"),
    companyId,
    message: z.object({
      messageId: z.string().min(1).max(256),
      from: z.string().regex(/^\d{6,20}$/),
      timestamp: z.string().datetime(),
      type: z.string().min(1).max(32),
      text: z.string().max(4096).optional(),
      customerName: z.string().max(160).optional(),
    }),
  }),
]);

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSignature(body: string, request: NextRequest) {
  const secret = process.env.WHATSAPP_GATEWAY_WEBHOOK_SECRET;
  const timestamp = request.headers.get("x-tudelivery-timestamp");
  const received = request.headers.get("x-tudelivery-signature");
  if (!secret || secret.startsWith("replace_with") || !timestamp || !received) return false;
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() / 1000 - parsedTimestamp) > 300) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  return safeEqual(received, expected);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request)) return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  try {
    const event = eventSchema.parse(JSON.parse(rawBody));
    const admin = createSupabaseAdminClient();
    const { data: account, error: accountError } = await admin.from("whatsapp_accounts")
      .select("company_id")
      .eq("company_id", event.companyId)
      .eq("provider", "qr_gateway")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) return NextResponse.json({ error: "Canal no registrado." }, { status: 404 });

    if (event.type === "channel.status") {
      const { error } = await admin.from("whatsapp_accounts").update({
        connection_status: event.connectionStatus,
        phone_number: event.phoneNumber,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("company_id", event.companyId).eq("provider", "qr_gateway");
      if (error) throw error;
      return NextResponse.json({ received: true });
    }

    const persisted = await persistIncomingWhatsAppMessages([{
      ...event.message,
      timestamp: new Date(event.message.timestamp),
      raw: event.message,
    }], event.companyId);
    return NextResponse.json({ received: true, persisted });
  } catch (error) {
    console.error("QR gateway webhook error", error);
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }
}
