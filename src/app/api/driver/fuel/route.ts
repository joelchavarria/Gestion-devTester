import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  liters: z.coerce.number().positive().max(200),
  amount: z.coerce.number().min(0).max(100000),
  odometer: z.coerce.number().int().min(0).max(2_000_000),
  fuelLevelAfter: z.coerce.number().int().min(0).max(100),
  stationName: z.string().trim().max(160).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const { data: shift, error: shiftError } = await admin.from("driver_shifts").select("*")
      .eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).single();
    if (shiftError || !shift) throw new AppError("Inicia una jornada antes de registrar combustible.");
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("*")
      .eq("id", shift.vehicle_id).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle) throw new AppError("No encontramos el vehículo de tu jornada.", 404);
    if (input.odometer < vehicle.current_odometer_km || input.odometer < shift.start_odometer_km) {
      throw new AppError("El kilometraje debe ser igual o mayor al último registro del vehículo.");
    }
    const { error: logError } = await admin.from("fuel_logs").insert({
      company_id: context.companyId,
      shift_id: shift.id,
      driver_id: context.driver.id,
      vehicle_id: vehicle.id,
      odometer_km: input.odometer,
      liters: input.liters,
      amount: input.amount,
      fuel_level_before: vehicle.fuel_level_percent,
      fuel_level_after: input.fuelLevelAfter,
      station_name: input.stationName || null,
    });
    if (logError) throw logError;
    const { error: vehicleUpdateError } = await admin.from("vehicles").update({ current_odometer_km: input.odometer, fuel_level_percent: input.fuelLevelAfter }).eq("id", vehicle.id);
    if (vehicleUpdateError) throw vehicleUpdateError;
    return Response.json({ message: "Combustible registrado." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
