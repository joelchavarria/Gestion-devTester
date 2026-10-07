import { MetaCloudWhatsAppProvider } from "@/lib/whatsapp/meta-cloud";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mock";
import { decryptWhatsAppSecret } from "@/lib/whatsapp/secrets";
import type { IncomingWhatsAppMessage, WhatsAppProvider } from "@/lib/whatsapp/types";
import { AppError } from "@/lib/server/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AccountRow = {
  company_id: string;
  provider: "meta_cloud" | "mock";
  phone_number_id: string | null;
  encrypted_access_token: string | null;
  connection_status: "disconnected" | "pending" | "connected" | "error";
  welcome_message: string;
};

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function providerForAccount(account: AccountRow): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER !== "meta" || account.provider === "mock") return new MockWhatsAppProvider();
  if (account.connection_status !== "connected" || !account.phone_number_id || !account.encrypted_access_token) {
    throw new AppError("Conecta el número de WhatsApp Business de esta empresa antes de enviar mensajes.", 409);
  }
  const graphVersion = process.env.META_GRAPH_API_VERSION;
  if (!graphVersion) throw new AppError("Falta META_GRAPH_API_VERSION en la configuración del servidor.", 500);
  return new MetaCloudWhatsAppProvider({
    accessToken: decryptWhatsAppSecret(account.encrypted_access_token),
    phoneNumberId: account.phone_number_id,
    graphVersion,
  });
}

async function getAccount(companyId: string): Promise<AccountRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("whatsapp_accounts")
    .select("company_id, provider, phone_number_id, encrypted_access_token, connection_status, welcome_message")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Esta empresa aún no tiene un canal de WhatsApp configurado.", 404);
  return data as AccountRow;
}

export async function getCompanyWhatsAppProvider(companyId: string) {
  return providerForAccount(await getAccount(companyId));
}

/** Writes Meta messages into the correct tenant inbox. Repeated webhooks are idempotent. */
export async function persistIncomingWhatsAppMessages(messages: IncomingWhatsAppMessage[]) {
  const admin = createSupabaseAdminClient();
  let persisted = 0;
  for (const message of messages) {
    if (!message.phoneNumberId) continue;
    const { data: account, error: accountError } = await admin
      .from("whatsapp_accounts")
      .select("company_id, provider, phone_number_id, encrypted_access_token, connection_status, welcome_message")
      .eq("phone_number_id", message.phoneNumberId)
      .eq("connection_status", "connected")
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) continue;

    const accountRow = account as AccountRow;
    const { data: duplicate, error: duplicateError } = await admin
      .from("messages")
      .select("id")
      .eq("company_id", accountRow.company_id)
      .eq("external_id", message.messageId)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) continue;

    const phone = cleanPhone(message.from);
    const name = message.customerName?.trim() || `Cliente ${phone.slice(-4) || "WhatsApp"}`;
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .upsert({ company_id: accountRow.company_id, phone, full_name: name }, { onConflict: "company_id,phone" })
      .select("id")
      .single();
    if (customerError) throw customerError;

    const { data: existingConversation, error: conversationLookupError } = await admin
      .from("conversations")
      .select("id")
      .eq("company_id", accountRow.company_id)
      .eq("customer_id", customer.id)
      .in("status", ["open", "waiting"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conversationLookupError) throw conversationLookupError;
    const isNewConversation = !existingConversation;
    const { data: conversation, error: conversationError } = existingConversation
      ? { data: existingConversation, error: null }
      : await admin.from("conversations").insert({
        company_id: accountRow.company_id,
        customer_id: customer.id,
        whatsapp_conversation_id: message.from,
        status: "open",
        last_message_at: message.timestamp.toISOString(),
      }).select("id").single();
    if (conversationError || !conversation) throw conversationError ?? new Error("No fue posible crear la conversación.");

    const body = message.text?.trim() || `[Mensaje ${message.type}]`;
    const { error: messageError } = await admin.from("messages").insert({
      company_id: accountRow.company_id,
      conversation_id: conversation.id,
      external_id: message.messageId,
      direction: "inbound",
      sender_type: "customer",
      body,
      content_type: message.type,
      delivery_status: "received",
      sent_at: message.timestamp.toISOString(),
    });
    if (messageError) throw messageError;
    const { error: updateError } = await admin.from("conversations")
      .update({ last_message_at: message.timestamp.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", conversation.id);
    if (updateError) throw updateError;
    persisted += 1;

    if (isNewConversation && accountRow.welcome_message.trim()) {
      try {
        const welcome = await providerForAccount(accountRow).sendText({ to: phone, body: accountRow.welcome_message });
        await admin.from("messages").insert({
          company_id: accountRow.company_id,
          conversation_id: conversation.id,
          external_id: welcome.providerMessageId,
          direction: "outbound",
          sender_type: "system",
          body: accountRow.welcome_message,
          content_type: "text",
          delivery_status: "accepted",
          sent_at: welcome.acceptedAt.toISOString(),
        });
      } catch (error) {
        console.error("Could not send WhatsApp welcome message", error);
      }
    }
  }
  return persisted;
}
