import { apiErrorResponse, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { connectGatewaySession, disconnectGatewaySession, getGatewaySessionStatus, type GatewaySessionStatus } from "@/lib/whatsapp/qr-gateway";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

function databaseStatus(status: GatewaySessionStatus["connectionStatus"]) {
  if (status === "connected" || status === "disconnected" || status === "error") return status;
  return "pending";
}

async function persistStatus(companyId: string, status: GatewaySessionStatus) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("whatsapp_accounts").upsert({
    company_id: companyId,
    provider: "qr_gateway",
    connection_status: databaseStatus(status.connectionStatus),
    phone_number: status.phoneNumber,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id" });
  if (error) throw error;
}

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const status = await getGatewaySessionStatus(context.companyId);
    await persistStatus(context.companyId, status);
    return NextResponse.json({ enabled: true, ...status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const status = await connectGatewaySession(context.companyId);
    await persistStatus(context.companyId, status);
    return NextResponse.json({ enabled: true, ...status }, { status: 202 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    await disconnectGatewaySession(context.companyId);
    const status: GatewaySessionStatus = { connectionStatus: "disconnected", phoneNumber: null, qrDataUrl: null, updatedAt: new Date().toISOString() };
    await persistStatus(context.companyId, status);
    return NextResponse.json(status);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
