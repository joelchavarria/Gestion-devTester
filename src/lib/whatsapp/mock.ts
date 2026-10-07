import type { IncomingWhatsAppMessage, SendTextMessageInput, SendTextMessageResult, WhatsAppProvider } from "@/lib/whatsapp/types";

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendText(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    if (!input.to || !input.body.trim()) throw new Error("El destinatario y el mensaje son obligatorios.");
    return { providerMessageId: `mock_${crypto.randomUUID()}`, acceptedAt: new Date() };
  }

  parseIncoming(payload: unknown): IncomingWhatsAppMessage[] {
    const event = payload as { messages?: { id: string; from: string; text?: { body?: string }; timestamp?: string }[] };
    return (event.messages ?? []).map((message) => ({
      messageId: message.id,
      from: message.from,
      timestamp: new Date(message.timestamp ? Number(message.timestamp) * 1000 : Date.now()),
      type: "text",
      text: message.text?.body,
      phoneNumberId: "mock",
      raw: message,
    }));
  }
}
