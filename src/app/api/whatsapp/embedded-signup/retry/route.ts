import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { provisionWhatsAppAccount } from "@/lib/server/whatsapp-provisioning";
import { decryptWhatsAppSecret } from "@/lib/whatsapp/secrets";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const graphVersion = process.env.META_GRAPH_API_VERSION;
    if (!graphVersion) throw new AppError("La plataforma todavía no tiene configurada la versión de Meta.", 503);

    const supabase = createSupabaseAdminClient();
    const { data: account, error } = await supabase
      .from("whatsapp_accounts")
      .select("business_account_id, phone_number_id, encrypted_access_token, encrypted_registration_pin")
      .eq("company_id", context.companyId)
      .maybeSingle();
    if (error) throw error;
    if (!account?.business_account_id || !account.phone_number_id || !account.encrypted_access_token || !account.encrypted_registration_pin) {
      throw new AppError("La conexión no llegó a guardar todos los datos. Vuelve a abrir el flujo de Meta.", 409);
    }

    const provisioned = await provisionWhatsAppAccount({
      accessToken: decryptWhatsAppSecret(account.encrypted_access_token),
      businessAccountId: account.business_account_id,
      phoneNumberId: account.phone_number_id,
      graphVersion,
      registrationPin: decryptWhatsAppSecret(account.encrypted_registration_pin),
    });
    const { error: updateError } = await supabase.from("whatsapp_accounts").update({
      phone_number: provisioned.phoneNumber,
      connection_status: "connected",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("company_id", context.companyId);
    if (updateError) throw updateError;

    return NextResponse.json({ connected: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
