import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("driver_profiles").select("assigned_vehicle_id").limit(1);
  const databaseReady = !error;

  return NextResponse.json({
    ok: databaseReady,
    service: "devtesters-delivery",
    dependencies: { database: databaseReady ? "ready" : "unavailable" },
    timestamp: new Date().toISOString(),
  }, { status: databaseReady ? 200 : 503 });
}
