import { apiErrorResponse, assertSameOrigin, requireOperationsContext } from "@/lib/server/context";
import { getCompanyWhatsAppProvider } from "@/lib/server/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4096), previewUrl: z.boolean().optional() });

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requireOperationsContext();
    const input = bodySchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id, customer_id")
      .eq("id", input.conversationId)
      .eq("company_id", context.companyId)
      .single();
    if (conversationError || !conversation) throw new Error("No encontramos esta conversación.");
    const { data: customer, error: customerError } = await admin.from("customers").select("phone").eq("id", conversation.customer_id).eq("company_id", context.companyId).single();
    if (customerError || !customer) throw new Error("No encontramos el teléfono del cliente.");
    const result = await getCompanyWhatsAppProvider(context.companyId).then((provider) => provider.sendText({ to: customer.phone, body: input.body, previewUrl: input.previewUrl }));
    const { error: messageError } = await admin.from("messages").insert({
      company_id: context.companyId,
      conversation_id: conversation.id,
      external_id: result.providerMessageId,
      direction: "outbound",
      sender_type: "user",
      sender_user_id: context.userId,
      body: input.body,
      content_type: "text",
      delivery_status: "accepted",
      sent_at: result.acceptedAt.toISOString(),
    });
    if (messageError) throw messageError;
    const { error: updateError } = await admin.from("conversations").update({ last_message_at: result.acceptedAt.toISOString(), updated_at: result.acceptedAt.toISOString() }).eq("id", conversation.id);
    if (updateError) throw updateError;
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
