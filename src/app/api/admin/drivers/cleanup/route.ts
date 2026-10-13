import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ confirm: z.literal("DELETE_ALL_DRIVERS") });

type DriverRecord = { id: string; user_id: string; member_id: string };

async function hasOperationalHistory(admin: ReturnType<typeof createSupabaseAdminClient>, driverId: string) {
  const checks = await Promise.all([
    admin.from("driver_shifts").select("id", { count: "exact", head: true }).eq("driver_id", driverId),
    admin.from("fuel_logs").select("id", { count: "exact", head: true }).eq("driver_id", driverId),
    admin.from("order_assignments").select("id", { count: "exact", head: true }).eq("driver_id", driverId),
    admin.from("cash_drawer_transactions").select("id", { count: "exact", head: true }).eq("driver_id", driverId),
  ]);
  const failed = checks.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return checks.some((result) => (result.count ?? 0) > 0);
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const { data: drivers, error: driversError } = await admin.from("driver_profiles").select("id, user_id, member_id").eq("company_id", context.companyId);
    if (driversError) throw driversError;

    let deleted = 0;
    let disabled = 0;
    const blocked: string[] = [];
    for (const driver of (drivers ?? []) as DriverRecord[]) {
      if (await hasOperationalHistory(admin, driver.id)) {
        const { error: disableError } = await admin.from("driver_profiles").update({ invite_status: "disabled", is_available: false, assigned_vehicle_id: null }).eq("id", driver.id).eq("company_id", context.companyId);
        if (disableError) throw disableError;
        await admin.from("company_members").update({ is_active: false }).eq("id", driver.member_id).eq("company_id", context.companyId);
        blocked.push(driver.id);
        disabled += 1;
        continue;
      }

      const { error: authDeleteError } = await admin.auth.admin.deleteUser(driver.user_id);
      if (authDeleteError) throw authDeleteError;
      deleted += 1;
    }

    await admin.from("audit_logs").insert({
      company_id: context.companyId,
      actor_id: context.userId,
      action: "drivers.cleaned_up",
      entity_type: "driver_profile",
      entity_id: null,
      after_data: { deleted, disabled, blocked },
    });
    return NextResponse.json({ deleted, disabled, total: (drivers ?? []).length, message: disabled ? `${deleted} eliminado(s) y ${disabled} desactivado(s) por tener historial operativo.` : `${deleted} motorizado(s) eliminado(s).` });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Confirma la limpieza para continuar." }, { status: 400 });
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error);
  }
}
