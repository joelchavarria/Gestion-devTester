import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  endOdometer: z.coerce.number().int().min(0).max(2_000_000),
  fuelLevel: z.coerce.number().int().min(0).max(100),
  closingCash: z.coerce.number().min(0).max(100000).default(0),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const { data: shift, error: shiftError } = await admin.from("driver_shifts").select("*")
      .eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).single();
    if (shiftError || !shift) throw new AppError("No tienes una jornada abierta.");
    if (input.endOdometer < shift.start_odometer_km) throw new AppError("El kilometraje final no puede ser menor al inicial.");
    const { data: activeOrders, error: ordersError } = await admin.from("orders").select("id")
      .eq("company_id", context.companyId).eq("driver_id", context.driver.id).in("status", ["assigned", "to_merchant", "picking_up", "to_customer"]);
    if (ordersError) throw ordersError;
    if ((activeOrders ?? []).length > 0) throw new AppError("Finaliza o reporta el pedido activo antes de cerrar tu jornada.");
    const { error: closeError } = await admin.from("driver_shifts").update({
      status: "closed",
      ended_at: new Date().toISOString(),
      end_odometer_km: input.endOdometer,
      fuel_level_end: input.fuelLevel,
      closing_cash: input.closingCash,
      notes: input.notes || null,
    }).eq("id", shift.id);
    if (closeError) throw closeError;
    const [vehicleUpdate, driverUpdate, cashResult] = await Promise.all([
      admin.from("vehicles").update({ current_odometer_km: input.endOdometer, fuel_level_percent: input.fuelLevel }).eq("id", shift.vehicle_id),
      admin.from("driver_profiles").update({ is_available: false }).eq("id", context.driver.id),
      input.closingCash > 0
        ? admin.from("cash_drawer_transactions").insert({ company_id: context.companyId, shift_id: shift.id, driver_id: context.driver.id, kind: "closeout", amount: input.closingCash, direction: "out", notes: "Cierre de caja de jornada" })
        : Promise.resolve({ error: null }),
    ]);
    if (vehicleUpdate.error) throw vehicleUpdate.error;
    if (driverUpdate.error) throw driverUpdate.error;
    if (cashResult.error) throw cashResult.error;
    return Response.json({ message: "Jornada cerrada correctamente." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
