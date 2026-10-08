import "server-only";
import type { IncomingWhatsAppMessage, SendTextMessageInput, SendTextMessageResult, WhatsAppProvider } from "@/lib/whatsapp/types";

export type GatewaySessionStatus = {
  connectionStatus: "disconnected" | "connecting" | "pending" | "connected" | "error";
  phoneNumber: string | null;
  qrDataUrl: string | null;
  updatedAt: string;
};

function gatewayConfig() {
  const baseUrl = process.env.WHATSAPP_GATEWAY_URL;
  const token = process.env.WHATSAPP_GATEWAY_TOKEN;
  if (!baseUrl || !token || token.startsWith("replace_with")) {
    throw new Error("El servicio QR de WhatsApp todavía no está configurado en el servidor.");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

async function gatewayRequest<T>(companyId: string, path = "", init?: RequestInit): Promise<T> {
  const { baseUrl, token } = gatewayConfig();
  const response = await fetch(`${baseUrl}/v1/sessions/${encodeURIComponent(companyId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "El servicio QR de WhatsApp no respondió correctamente.");
  return payload;
}

export function getGatewaySessionStatus(companyId: string) {
  return gatewayRequest<GatewaySessionStatus>(companyId);
}

export function connectGatewaySession(companyId: string) {
  return gatewayRequest<GatewaySessionStatus>(companyId, "/connect", { method: "POST" });
}

export function disconnectGatewaySession(companyId: string) {
  return gatewayRequest<{ disconnected: true }>(companyId, "", { method: "DELETE" });
}

export class QrGatewayWhatsAppProvider implements WhatsAppProvider {
  constructor(private readonly companyId: string) {}

  async sendText(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    const result = await gatewayRequest<{ providerMessageId: string; acceptedAt: string }>(this.companyId, "/send", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { providerMessageId: result.providerMessageId, acceptedAt: new Date(result.acceptedAt) };
  }

  parseIncoming(): IncomingWhatsAppMessage[] {
    return [];
  }
}
