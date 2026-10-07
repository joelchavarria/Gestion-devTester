import { MetaCloudWhatsAppProvider } from "@/lib/whatsapp/meta-cloud";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mock";
import type { WhatsAppProvider, WhatsAppProviderConfig } from "@/lib/whatsapp/types";

export function getWhatsAppProvider(config?: WhatsAppProviderConfig): WhatsAppProvider {
  return process.env.WHATSAPP_PROVIDER === "meta" ? new MetaCloudWhatsAppProvider(config) : new MockWhatsAppProvider();
}
