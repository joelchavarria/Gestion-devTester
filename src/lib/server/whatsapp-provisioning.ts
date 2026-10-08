import { randomInt } from "node:crypto";
import { AppError } from "@/lib/server/context";

type MetaErrorPayload = {
  success?: boolean | string;
  display_phone_number?: string;
  error?: { message?: string; error_user_msg?: string };
};

type ProvisionInput = {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
  graphVersion: string;
  registrationPin: string;
};

function metaMessage(payload: MetaErrorPayload, fallback: string) {
  return payload.error?.error_user_msg ?? payload.error?.message ?? fallback;
}

export function createWhatsAppRegistrationPin() {
  return randomInt(100000, 1000000).toString();
}

/** Completes every server-side step required after Meta Embedded Signup. */
export async function provisionWhatsAppAccount(input: ProvisionInput) {
  const authorization = { Authorization: `Bearer ${input.accessToken}` };

  const phoneResponse = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}?fields=display_phone_number`,
    { headers: authorization, cache: "no-store" },
  );
  const phonePayload = await phoneResponse.json() as MetaErrorPayload;
  if (!phoneResponse.ok) {
    throw new AppError(metaMessage(phonePayload, "Meta no permitió consultar el número seleccionado."), 502);
  }

  const registrationResponse = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}/register`,
    {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: input.registrationPin }),
      cache: "no-store",
    },
  );
  const registrationPayload = await registrationResponse.json() as MetaErrorPayload;
  if (!registrationResponse.ok || (registrationPayload.success !== true && registrationPayload.success !== "true")) {
    throw new AppError(metaMessage(registrationPayload, "Meta no pudo registrar el número en Cloud API."), 502);
  }

  const subscriptionResponse = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.businessAccountId}/subscribed_apps`,
    { method: "POST", headers: authorization, cache: "no-store" },
  );
  const subscriptionPayload = await subscriptionResponse.json() as MetaErrorPayload;
  if (!subscriptionResponse.ok || (subscriptionPayload.success !== true && subscriptionPayload.success !== "true")) {
    throw new AppError(metaMessage(subscriptionPayload, "Meta no pudo suscribir la cuenta al webhook de la plataforma."), 502);
  }

  return { phoneNumber: phonePayload.display_phone_number ?? null };
}
