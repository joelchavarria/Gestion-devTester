import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(24),
  message: z.string().trim().min(1).max(3000),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .upsert({ company_id: context.companyId, full_name: input.fullName, phone: input.phone }, { onConflict: "company_id,phone" })
      .select("id")
      .single();
    if (customerError) throw customerError;
    const now = new Date().toISOString();
    const { data: existingConversation, error: existingConversationError } = await admin
      .from("conversations")
      .select("id")
      .eq("company_id", context.companyId)
      .eq("customer_id", customer.id)
      .in("status", ["open", "waiting"])
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (existingConversationError) throw existingConversationError;

    let conversationId = existingConversation?.id;
    if (conversationId) {
      const { error: conversationUpdateError } = await admin
        .from("conversations")
        .update({ status: "open", last_message_at: now })
        .eq("id", conversationId)
        .eq("company_id", context.companyId);
      if (conversationUpdateError) throw conversationUpdateError;
    } else {
      const { data: conversation, error: conversationError } = await admin.from("conversations").insert({
        company_id: context.companyId,
        customer_id: customer.id,
        status: "open",
        last_message_at: now,
      }).select("id").single();
      if (conversationError) throw conversationError;
      conversationId = conversation.id;
    }
    const { error: messageError } = await admin.from("messages").insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      direction: "inbound",
      sender_type: "customer",
      body: input.message,
      sent_at: now,
    });
    if (messageError) throw messageError;
    return Response.json({ id: conversationId, reused: Boolean(existingConversation) }, { status: existingConversation ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
