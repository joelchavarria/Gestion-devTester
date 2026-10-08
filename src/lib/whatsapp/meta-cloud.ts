import type { IncomingWhatsAppMessage, SendTextMessageInput, SendTextMessageResult, WhatsAppProvider, WhatsAppProviderConfig } from "@/lib/whatsapp/types";

type MetaWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly graphVersion: string | undefined;

  constructor(config: WhatsAppProviderConfig = {}) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.graphVersion = config.graphVersion ?? process.env.META_GRAPH_API_VERSION;
  }

  private assertConfigured() {
    if (!this.accessToken || !this.phoneNumberId || !this.graphVersion) {
      throw new Error("No hay una cuenta de WhatsApp conectada para esta empresa.");
    }
  }

  async sendText(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    this.assertConfigured();
    const response = await fetch(`https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: input.to.replace(/\D/g, ""), type: "text", text: { preview_url: input.previewUrl ?? false, body: input.body } }),
    });
    const payload = await response.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!response.ok || !payload.messages?.[0]?.id) throw new Error(payload.error?.message ?? "Meta rechazó el envío del mensaje.");
    return { providerMessageId: payload.messages[0].id, acceptedAt: new Date() };
  }

  parseIncoming(payload: unknown): IncomingWhatsAppMessage[] {
    const event = payload as MetaWebhook;
    return (event.entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => {
      const value = change.value;
      return (value?.messages ?? []).map((message) => ({
        messageId: message.id,
        from: message.from,
        timestamp: new Date(Number(message.timestamp) * 1000),
        type: message.type,
        text: message.text?.body,
        phoneNumberId: value?.metadata?.phone_number_id,
        customerName: value?.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name,
        raw: message,
      }));
    }));
  }
}
