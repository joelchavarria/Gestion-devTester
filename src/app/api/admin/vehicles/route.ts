import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(3).max(32).optional(),
  plate: z.string().trim().min(3).max(32),
  make: z.string().trim().min(2).max(64),
  model: z.string().trim().min(1).max(64),
  modelYear: z.coerce.number().int().min(1990).max(2100).optional(),
  vehicleType: z.enum(["motorcycle", "car", "van", "bicycle"]).default("motorcycle"),
  color: z.string().trim().max(40).optional(),
  fuelType: z.string().trim().min(3).max(64).default("gasolina_regular"),
  odometer: z.coerce.number().int().min(0).max(2_000_000),
  fuelLevel: z.coerce.number().int().min(0).max(100).default(0),
  circulationNumber: z.string().trim().max(80).optional(),
  insurancePolicy: z.string().trim().max(80).optional(),
  insuranceExpiresAt: z.string().date().optional(),
});

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reading"),
    vehicleId: z.string().uuid(),
    odometer: z.coerce.number().int().min(0).max(2_000_000),
    fuelLevel: z.coerce.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal("status"),
    vehicleId: z.string().uuid(),
    status: z.enum(["active", "damaged", "inactive"]),
  }),
]);

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const [{ data: vehicles, error: vehicleError }, { data: shifts, error: shiftError }, { data: settings, error: settingsError }] = await Promise.all([
      admin.from("vehicles").select("id, code, plate, make, model, model_year, color, fuel_type, current_odometer_km, fuel_level_percent, status, next_maintenance_km, documents").eq("company_id", context.companyId).order("code"),
      admin.from("driver_shifts").select("vehicle_id").eq("company_id", context.companyId).is("ended_at", null),
      admin.from("company_settings").select("maintenance_interval_km").eq("company_id", context.companyId).single(),
    ]);
    if (vehicleError) throw vehicleError;
    if (shiftError) throw shiftError;
    if (settingsError) throw settingsError;
    const occupied = new Set((shifts ?? []).map((shift) => shift.vehicle_id));
    return Response.json({
      maintenanceIntervalKm: settings.maintenance_interval_km,
      vehicles: (vehicles ?? []).map((vehicle) => ({
        id: vehicle.id,
        code: vehicle.code,
        plate: vehicle.plate,
        label: `${vehicle.make} ${vehicle.model}${vehicle.model_year ? ` · ${vehicle.model_year}` : ""}`,
        odometer: vehicle.current_odometer_km,
        fuelLevel: vehicle.fuel_level_percent ?? 0,
        status: vehicle.status,
        nextMaintenanceAt: vehicle.next_maintenance_km,
        remainingKm: vehicle.next_maintenance_km === null ? null : vehicle.next_maintenance_km - vehicle.current_odometer_km,
        occupied: occupied.has(vehicle.id),
        documents: vehicle.documents,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

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
      color: input.color || null,
      fuel_type: input.fuelType,
      current_odometer_km: input.odometer,
      fuel_level_percent: input.fuelLevel,
      next_maintenance_km: input.odometer + settingsResult.data.maintenance_interval_km,
      documents: {
        vehicle_type: input.vehicleType,
        circulation_number: input.circulationNumber || null,
        insurance_policy: input.insurancePolicy || null,
        insurance_expires_at: input.insuranceExpiresAt || null,
      },
    }).select("id").single();
    if (error) throw error;
    const { error: maintenanceError } = await admin.from("maintenance_records").insert({
      company_id: context.companyId,
      vehicle_id: vehicle.id,
      kind: "Cambio de aceite",
      status: "planned",
      due_at_km: input.odometer + settingsResult.data.maintenance_interval_km,
      notes: `Mantenimiento preventivo cada ${settingsResult.data.maintenance_interval_km.toLocaleString("es-NI")} km`,
    });
    if (maintenanceError) throw maintenanceError;
    return Response.json({ id: vehicle.id, message: "Vehículo registrado y listo para asignar a una jornada." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const input = updateSchema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("id, current_odometer_km, status")
      .eq("id", input.vehicleId).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle) throw new AppError("No encontramos este vehículo.", 404);

    if (input.action === "reading") {
      const { data: openShift, error: shiftError } = await admin.from("driver_shifts").select("id")
        .eq("company_id", context.companyId).eq("vehicle_id", vehicle.id).is("ended_at", null).maybeSingle();
      if (shiftError) throw shiftError;
      if (openShift) throw new AppError("Registra kilometraje y combustible desde la jornada activa del motorizado.");
      if (input.odometer < vehicle.current_odometer_km) throw new AppError("El kilometraje no puede ser menor al último registro.");
      const { error } = await admin.from("vehicles").update({
        current_odometer_km: input.odometer,
        fuel_level_percent: input.fuelLevel,
        updated_at: new Date().toISOString(),
      }).eq("id", vehicle.id).eq("company_id", context.companyId);
      if (error) throw error;
      return Response.json({ message: "Kilometraje y nivel de tanque actualizados." });
    }

    const { data: openShift, error: shiftError } = await admin.from("driver_shifts").select("id")
      .eq("company_id", context.companyId).eq("vehicle_id", vehicle.id).is("ended_at", null).maybeSingle();
    if (shiftError) throw shiftError;
    if (openShift) throw new AppError("Cierra la jornada activa antes de cambiar el estado del vehículo.");
    const { error } = await admin.from("vehicles").update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", vehicle.id).eq("company_id", context.companyId);
    if (error) throw error;
    return Response.json({ message: input.status === "damaged" ? "Vehículo marcado como dañado y bloqueado para nuevas jornadas." : "Estado del vehículo actualizado." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
