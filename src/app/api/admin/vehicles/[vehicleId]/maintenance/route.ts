import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const baseSchema = z.object({
  kind: z.string().trim().min(2).max(120),
  dueAtKm: z.coerce.number().int().min(0).max(2_000_000).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  supplier: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
const schema = z.discriminatedUnion("action", [
  baseSchema.extend({ action: z.literal("schedule") }),
  baseSchema.extend({ action: z.literal("start") }),
  z.object({ action: z.literal("complete"), recordId: z.string().uuid(), odometer: z.coerce.number().int().min(0).max(2_000_000), cost: z.coerce.number().min(0).max(1_000_000), supplier: z.string().trim().max(160).nullable().optional(), notes: z.string().trim().max(1000).nullable().optional() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const { vehicleId } = await params;
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("id, status, current_odometer_km").eq("id", vehicleId).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle) throw new AppError("No encontramos este vehículo.", 404);

    if (input.action === "complete") {
      if (input.odometer < vehicle.current_odometer_km) throw new AppError("El kilometraje final no puede ser menor al último registrado.");
      const { data: settings, error: settingsError } = await admin.from("company_settings").select("maintenance_interval_km").eq("company_id", context.companyId).single();
      if (settingsError || !settings) throw new AppError("No encontramos la regla de mantenimiento.");
      const { error: recordError } = await admin.from("maintenance_records").update({ status: "completed", completed_at: new Date().toISOString(), odometer_km: input.odometer, cost: input.cost, supplier: input.supplier || null, notes: input.notes || null, approved_by: context.userId, updated_at: new Date().toISOString() }).eq("id", input.recordId).eq("vehicle_id", vehicleId).eq("company_id", context.companyId).in("status", ["planned", "in_progress"]);
      if (recordError) throw recordError;
      const { error: vehicleUpdateError } = await admin.from("vehicles").update({ status: "active", current_odometer_km: input.odometer, next_maintenance_km: input.odometer + settings.maintenance_interval_km, updated_at: new Date().toISOString() }).eq("id", vehicleId);
      if (vehicleUpdateError) throw vehicleUpdateError;
      return Response.json({ message: "Mantenimiento completado; el vehículo vuelve a estar disponible." });
    }

    if (input.action === "start") {
      const { data: openShift, error: shiftError } = await admin.from("driver_shifts").select("id").eq("vehicle_id", vehicleId).is("ended_at", null).maybeSingle();
      if (shiftError) throw shiftError;
      if (openShift) throw new AppError("Cierra la jornada activa antes de enviar este vehículo a mantenimiento.");
    }
    const dueAtKm = input.dueAtKm ?? vehicle.current_odometer_km;
    const { data: record, error: recordError } = await admin.from("maintenance_records").insert({ company_id: context.companyId, vehicle_id: vehicleId, kind: input.kind, status: input.action === "start" ? "in_progress" : "planned", due_at_km: dueAtKm, due_date: input.dueDate || null, supplier: input.supplier || null, notes: input.notes || null, approved_by: input.action === "start" ? context.userId : null }).select("id").single();
    if (recordError) throw recordError;
    if (input.action === "start") {
      const { data: openShift, error: shiftError } = await admin.from("driver_shifts").select("id").eq("vehicle_id", vehicleId).is("ended_at", null).maybeSingle();
      if (shiftError) throw shiftError;
      if (openShift) throw new AppError("Cierra la jornada activa antes de enviar este vehículo a mantenimiento.");
      const { error: vehicleUpdateError } = await admin.from("vehicles").update({ status: "in_maintenance", updated_at: new Date().toISOString() }).eq("id", vehicleId);
      if (vehicleUpdateError) throw vehicleUpdateError;
    }
    return Response.json({ id: record.id, message: input.action === "start" ? "Vehículo enviado a mantenimiento." : "Mantenimiento programado." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
