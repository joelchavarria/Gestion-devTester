import { apiErrorResponse, requireOwnerContext } from "@/lib/server/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Solo propietarios y administradores pueden abrir el flujo que vincula un número.
    const context = await requireOwnerContext();
    const supabase = createSupabaseAdminClient();
    const { data: account, error: accountError } = await supabase
      .from("whatsapp_accounts")
      .select("connection_status, phone_number")
      .eq("company_id", context.companyId)
      .maybeSingle();
    if (accountError) throw accountError;
    const appId = process.env.META_APP_ID;
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
    const graphVersion = process.env.META_GRAPH_API_VERSION;
    if (!appId || !configId || !graphVersion) {
      return NextResponse.json({
        enabled: false,
        accountStatus: account?.connection_status ?? "disconnected",
        phoneNumber: account?.phone_number ?? null,
        error: "La conexión oficial de Meta todavía no está habilitada por el equipo de la plataforma.",
      });
    }
    // appId/configId son identificadores públicos requeridos por el SDK; ningún secreto sale de esta ruta.
    return NextResponse.json({
      enabled: true,
      appId,
      configId,
      graphVersion,
      accountStatus: account?.connection_status ?? "disconnected",
      phoneNumber: account?.phone_number ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
