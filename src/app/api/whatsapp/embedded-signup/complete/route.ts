import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { encryptWhatsAppSecret } from "@/lib/whatsapp/secrets";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(8),
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().min(1),
  phoneNumber: z.string().trim().max(24).optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const graphVersion = process.env.META_GRAPH_API_VERSION;
    if (!appId || !appSecret || !graphVersion) throw new Error("Falta la configuración privada de Meta para terminar la conexión.");

    const context = await requireOwnerContext();
    const supabase = createSupabaseAdminClient();

    const { data: existingAccount, error: existingAccountError } = await supabase
      .from("whatsapp_accounts")
      .select("company_id")
      .eq("phone_number_id", input.phoneNumberId)
      .neq("company_id", context.companyId)
      .maybeSingle();
    if (existingAccountError) throw existingAccountError;
    if (existingAccount) throw new AppError("Este número de WhatsApp ya está conectado a otra empresa.", 409);

    const exchangeUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    exchangeUrl.searchParams.set("client_id", appId);
    exchangeUrl.searchParams.set("client_secret", appSecret);
    exchangeUrl.searchParams.set("code", input.code);
    const exchangeResponse = await fetch(exchangeUrl, { cache: "no-store" });
    const exchangePayload = await exchangeResponse.json() as { access_token?: string; error?: { message?: string } };
    if (!exchangeResponse.ok || !exchangePayload.access_token) throw new Error(exchangePayload.error?.message ?? "Meta no entregó un token de conexión.");

    const authorization = { Authorization: `Bearer ${exchangePayload.access_token}` };
    const subscriptionResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${input.businessAccountId}/subscribed_apps`, {
      method: "POST",
      headers: authorization,
      cache: "no-store",
    });
    const subscriptionPayload = await subscriptionResponse.json() as { success?: boolean; error?: { message?: string } };
    if (!subscriptionResponse.ok || !subscriptionPayload.success) {
      throw new Error(subscriptionPayload.error?.message ?? "Meta no permitió suscribir este número al webhook de la plataforma.");
    }

    const phoneResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${input.phoneNumberId}?fields=display_phone_number`, {
      headers: authorization,
      cache: "no-store",
    });
    const phonePayload = await phoneResponse.json() as { display_phone_number?: string };
    const connectedPhone = phoneResponse.ok ? phonePayload.display_phone_number : undefined;

    const { error: updateError } = await supabase.from("whatsapp_accounts").upsert({
      company_id: context.companyId,
      provider: "meta_cloud",
      phone_number: connectedPhone || input.phoneNumber || null,
      phone_number_id: input.phoneNumberId,
      business_account_id: input.businessAccountId,
      connection_status: "connected",
      encrypted_access_token: encryptWhatsAppSecret(exchangePayload.access_token),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "company_id" });
    if (updateError) throw updateError;

    return NextResponse.json({ connected: true, phoneNumberId: input.phoneNumberId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
