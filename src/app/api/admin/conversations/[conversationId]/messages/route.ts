import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const conversationIdSchema = z.string().uuid();
const messageSchema = z.object({ body: z.string().trim().min(1).max(3000) });

async function getConversation(conversationId: string) {
  const context = await requireOperationsContext();
  const admin = createSupabaseAdminClient();
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("company_id", context.companyId)
    .single();
  if (conversationError || !conversation) throw new AppError("No encontramos esta conversación.", 404);
  return { context, admin };
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    assertSameOrigin(request);
    const { conversationId: rawConversationId } = await params;
    const conversationId = conversationIdSchema.parse(rawConversationId);
    const input = messageSchema.parse(await request.json());
    const { context, admin } = await getConversation(conversationId);
    const now = new Date().toISOString();
    const { data: message, error: messageError } = await admin.from("messages").insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      direction: "outbound",
      sender_type: "user",
      body: input.body,
      sent_at: now,
      delivery_status: "sent",
    }).select("id").single();
    if (messageError) throw messageError;
    const { error: conversationError } = await admin.from("conversations").update({ last_message_at: now }).eq("id", conversationId).eq("company_id", context.companyId);
    if (conversationError) throw conversationError;
    return Response.json({ id: message.id, sentAt: now });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId: rawConversationId } = await params;
    const conversationId = conversationIdSchema.parse(rawConversationId);
    const { context, admin } = await getConversation(conversationId);

    const { data: messages, error: messagesError } = await admin
      .from("messages")
      .select("id, body, content_type, direction, delivery_status, sender_type, sent_at")
      .eq("company_id", context.companyId)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(300);
    if (messagesError) throw messagesError;

    return Response.json({
      messages: (messages ?? []).map((message) => ({
        id: message.id,
        body: message.body ?? (message.content_type === "text" ? "" : "Contenido multimedia"),
        contentType: message.content_type,
        direction: message.direction,
        deliveryStatus: message.delivery_status,
        senderType: message.sender_type,
        sentAt: message.sent_at,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
