import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(3).max(32).optional(),
  plate: z.string().trim().min(3).max(32),
  make: z.string().trim().min(2).max(64),
  model: z.string().trim().min(1).max(64),
  modelYear: z.coerce.number().int().min(1990).max(2100).optional(),
  fuelType: z.string().trim().min(3).max(64).default("gasolina_regular"),
  odometer: z.coerce.number().int().min(0).max(2_000_000),
  fuelLevel: z.coerce.number().int().min(0).max(100).default(0),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const [settingsResult, vehicleCountResult] = await Promise.all([
      admin.from("company_settings").select("maintenance_interval_km").eq("company_id", context.companyId).single(),
      admin.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", context.companyId),
    ]);
    if (settingsResult.error) throw settingsResult.error;
    if (vehicleCountResult.error) throw vehicleCountResult.error;
    const code = input.code?.toUpperCase() || `MOTO-${String((vehicleCountResult.count ?? 0) + 1).padStart(3, "0")}`;
    const { data: vehicle, error } = await admin.from("vehicles").insert({
      company_id: context.companyId,
      code,
      plate: input.plate.toUpperCase(),
      make: input.make,
      model: input.model,
      model_year: input.modelYear ?? null,
      fuel_type: input.fuelType,
      current_odometer_km: input.odometer,
      fuel_level_percent: input.fuelLevel,
      next_maintenance_km: input.odometer + settingsResult.data.maintenance_interval_km,
    }).select("id").single();
    if (error) throw error;
    return Response.json({ id: vehicle.id, message: "Vehículo registrado y listo para asignar a una jornada." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
