import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const conversationIdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId: rawConversationId } = await params;
    const conversationId = conversationIdSchema.parse(rawConversationId);
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("company_id", context.companyId)
      .single();
    if (conversationError || !conversation) throw new AppError("No encontramos esta conversación.", 404);

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
