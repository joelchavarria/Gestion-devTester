import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  vehicleId: z.string().uuid(),
  startOdometer: z.coerce.number().int().min(0).max(2_000_000),
  fuelLevel: z.coerce.number().int().min(0).max(100),
  openingCash: z.coerce.number().min(0).max(100000).default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const { data: existingShift, error: existingShiftError } = await admin.from("driver_shifts").select("id")
      .eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle();
    if (existingShiftError) throw existingShiftError;
    if (existingShift) throw new AppError("Ya tienes una jornada abierta. Ciérrala antes de iniciar otra.");
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("*")
      .eq("id", input.vehicleId).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle) throw new AppError("No encontramos el vehículo seleccionado.", 404);
    if (vehicle.status !== "active") throw new AppError("Este vehículo no está habilitado para salir.");
    if (vehicle.next_maintenance_km !== null && vehicle.current_odometer_km >= vehicle.next_maintenance_km) {
      throw new AppError("Este vehículo requiere mantenimiento antes de iniciar jornada.");
    }
    if (input.startOdometer < vehicle.current_odometer_km) {
      throw new AppError("El kilometraje inicial no puede ser menor al último kilometraje registrado.");
    }
    const { data: shift, error: shiftError } = await admin.from("driver_shifts").insert({
      company_id: context.companyId,
      driver_id: context.driver.id,
      vehicle_id: vehicle.id,
      start_odometer_km: input.startOdometer,
      fuel_level_start: input.fuelLevel,
      opening_cash: input.openingCash,
    }).select("id").single();
    if (shiftError) throw shiftError;
    const { error: vehicleUpdateError } = await admin.from("vehicles").update({ current_odometer_km: input.startOdometer, fuel_level_percent: input.fuelLevel }).eq("id", vehicle.id);
    if (vehicleUpdateError) throw vehicleUpdateError;
    const { error: driverUpdateError } = await admin.from("driver_profiles").update({ is_available: true }).eq("id", context.driver.id);
    if (driverUpdateError) throw driverUpdateError;
    if (input.openingCash > 0) {
      const { error: cashError } = await admin.from("cash_drawer_transactions").insert({
        company_id: context.companyId,
        shift_id: shift.id,
        driver_id: context.driver.id,
        kind: "opening_float",
        amount: input.openingCash,
        direction: "in",
        notes: "Fondo inicial de jornada",
      });
      if (cashError) throw cashError;
    }
    return Response.json({ id: shift.id, message: "Jornada iniciada. Ya puedes recibir pedidos." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
