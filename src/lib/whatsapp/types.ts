export type IncomingWhatsAppMessage = {
  messageId: string;
  from: string;
  timestamp: Date;
  type: string;
  text?: string;
  /** Phone-number id that received the message; used to resolve its tenant. */
  phoneNumberId?: string;
  /** Customer name exposed by Meta's webhook, when available. */
  customerName?: string;
  raw: unknown;
};

export type SendTextMessageInput = {
  to: string;
  body: string;
  previewUrl?: boolean;
};

export type WhatsAppProviderConfig = {
  accessToken?: string;
  phoneNumberId?: string;
  graphVersion?: string;
};

export type SendTextMessageResult = {
  providerMessageId: string;
  acceptedAt: Date;
};

export interface WhatsAppProvider {
  sendText(input: SendTextMessageInput): Promise<SendTextMessageResult>;
  parseIncoming(payload: unknown): IncomingWhatsAppMessage[];
}
