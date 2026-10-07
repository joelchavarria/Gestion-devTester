import { apiErrorResponse, requireOwnerContext } from "@/lib/server/context";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Solo propietarios y administradores pueden abrir el flujo que vincula un número.
    await requireOwnerContext();
    const appId = process.env.META_APP_ID;
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
    const graphVersion = process.env.META_GRAPH_API_VERSION;
    if (!appId || !configId || !graphVersion) {
      return NextResponse.json({ enabled: false, error: "Configura META_APP_ID, META_EMBEDDED_SIGNUP_CONFIG_ID y META_GRAPH_API_VERSION para activar la conexión oficial de Meta." });
    }
    // appId/configId son identificadores públicos requeridos por el SDK; ningún secreto sale de esta ruta.
    return NextResponse.json({ enabled: true, appId, configId, graphVersion });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
