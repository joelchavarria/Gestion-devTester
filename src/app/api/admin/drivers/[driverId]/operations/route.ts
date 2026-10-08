import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start_shift"),
    vehicleId: z.string().uuid(),
    startOdometer: z.coerce.number().int().min(0).max(2_000_000),
    fuelLevel: z.coerce.number().int().min(0).max(100),
    openingCash: z.coerce.number().min(0).max(100_000).default(0),
  }),
  z.object({
    action: z.literal("close_shift"),
    endOdometer: z.coerce.number().int().min(0).max(2_000_000),
    fuelLevel: z.coerce.number().int().min(0).max(100),
    closingCash: z.coerce.number().min(0).max(100_000).default(0),
    notes: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("fuel"),
    liters: z.coerce.number().positive().max(200),
    amount: z.coerce.number().min(0).max(100_000),
    odometer: z.coerce.number().int().min(0).max(2_000_000),
    fuelLevelAfter: z.coerce.number().int().min(0).max(100),
    stationName: z.string().trim().max(160).optional(),
  }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ driverId: string }> }) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const { driverId } = await params;
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const { data: driver, error: driverError } = await admin.from("driver_profiles").select("id, invite_status")
      .eq("id", driverId).eq("company_id", context.companyId).single();
    if (driverError || !driver) throw new AppError("No encontramos este motorizado.", 404);
    if (driver.invite_status === "disabled") throw new AppError("El acceso de este motorizado está deshabilitado.");

    const { data: openShift, error: shiftError } = await admin.from("driver_shifts").select("*")
      .eq("company_id", context.companyId).eq("driver_id", driver.id).is("ended_at", null).maybeSingle();
    if (shiftError) throw shiftError;

    if (input.action === "start_shift") {
      if (openShift) throw new AppError("Este motorizado ya tiene una jornada abierta.");
      if (driver.invite_status !== "activated") throw new AppError("El motorizado debe activar su invitación antes de iniciar una jornada.");
      const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("*")
        .eq("id", input.vehicleId).eq("company_id", context.companyId).single();
      if (vehicleError || !vehicle) throw new AppError("No encontramos el vehículo seleccionado.", 404);
      if (vehicle.status !== "active") throw new AppError("Este vehículo está bloqueado y no puede salir.");
      if (vehicle.next_maintenance_km !== null && vehicle.current_odometer_km >= vehicle.next_maintenance_km) {
        throw new AppError("Salida bloqueada: el vehículo alcanzó el kilometraje de mantenimiento.");
      }
      if (input.startOdometer < vehicle.current_odometer_km) throw new AppError("El kilometraje de salida no puede ser menor al último registrado.");
      const { data: occupied, error: occupiedError } = await admin.from("driver_shifts").select("id")
        .eq("company_id", context.companyId).eq("vehicle_id", vehicle.id).is("ended_at", null).maybeSingle();
      if (occupiedError) throw occupiedError;
      if (occupied) throw new AppError("Este vehículo ya está asignado a otra jornada.");
      const { data: shift, error: createError } = await admin.from("driver_shifts").insert({
        company_id: context.companyId,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        start_odometer_km: input.startOdometer,
        fuel_level_start: input.fuelLevel,
        opening_cash: input.openingCash,
      }).select("id").single();
      if (createError) throw createError;
      const [vehicleUpdate, driverUpdate, cashResult] = await Promise.all([
        admin.from("vehicles").update({ current_odometer_km: input.startOdometer, fuel_level_percent: input.fuelLevel, updated_at: new Date().toISOString() }).eq("id", vehicle.id).eq("company_id", context.companyId),
        admin.from("driver_profiles").update({ is_available: true }).eq("id", driver.id).eq("company_id", context.companyId),
        input.openingCash > 0
          ? admin.from("cash_drawer_transactions").insert({ company_id: context.companyId, shift_id: shift.id, driver_id: driver.id, kind: "opening_float", amount: input.openingCash, direction: "in", notes: "Fondo inicial registrado por administración" })
          : Promise.resolve({ error: null }),
      ]);
      if (vehicleUpdate.error) throw vehicleUpdate.error;
      if (driverUpdate.error) throw driverUpdate.error;
      if (cashResult.error) throw cashResult.error;
      return Response.json({ message: "Salida registrada; el motorizado ya puede recibir pedidos." }, { status: 201 });
    }

    if (!openShift) throw new AppError("Este motorizado no tiene una jornada abierta.");
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("*")
      .eq("id", openShift.vehicle_id).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle) throw new AppError("No encontramos el vehículo de la jornada.", 404);

    if (input.action === "fuel") {
      if (input.odometer < vehicle.current_odometer_km || input.odometer < openShift.start_odometer_km) {
        throw new AppError("El kilometraje de la carga debe ser igual o mayor al último registro.");
      }
      const { error: fuelError } = await admin.from("fuel_logs").insert({
        company_id: context.companyId,
        shift_id: openShift.id,
        driver_id: driver.id,
        vehicle_id: vehicle.id,
        odometer_km: input.odometer,
        liters: input.liters,
        amount: input.amount,
        fuel_level_before: vehicle.fuel_level_percent,
        fuel_level_after: input.fuelLevelAfter,
        station_name: input.stationName || null,
      });
      if (fuelError) throw fuelError;
      const { error: vehicleUpdateError } = await admin.from("vehicles").update({ current_odometer_km: input.odometer, fuel_level_percent: input.fuelLevelAfter, updated_at: new Date().toISOString() })
        .eq("id", vehicle.id).eq("company_id", context.companyId);
      if (vehicleUpdateError) throw vehicleUpdateError;
      return Response.json({ message: "Carga de combustible registrada." }, { status: 201 });
    }

    if (input.endOdometer < openShift.start_odometer_km || input.endOdometer < vehicle.current_odometer_km) {
      throw new AppError("El kilometraje de regreso no puede ser menor al último registro.");
    }
    const { data: activeOrders, error: ordersError } = await admin.from("orders").select("id")
      .eq("company_id", context.companyId).eq("driver_id", driver.id).in("status", ["assigned", "to_merchant", "picking_up", "to_customer"]);
    if (ordersError) throw ordersError;
    if ((activeOrders ?? []).length > 0) throw new AppError("No se puede cerrar la jornada mientras haya pedidos activos.");
    const { error: closeError } = await admin.from("driver_shifts").update({
      status: "closed",
      ended_at: new Date().toISOString(),
      end_odometer_km: input.endOdometer,
      fuel_level_end: input.fuelLevel,
      closing_cash: input.closingCash,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    }).eq("id", openShift.id).eq("company_id", context.companyId);
    if (closeError) throw closeError;
    const [vehicleUpdate, driverUpdate, cashResult] = await Promise.all([
      admin.from("vehicles").update({ current_odometer_km: input.endOdometer, fuel_level_percent: input.fuelLevel, updated_at: new Date().toISOString() }).eq("id", vehicle.id).eq("company_id", context.companyId),
      admin.from("driver_profiles").update({ is_available: false }).eq("id", driver.id).eq("company_id", context.companyId),
      input.closingCash > 0
        ? admin.from("cash_drawer_transactions").insert({ company_id: context.companyId, shift_id: openShift.id, driver_id: driver.id, kind: "closeout", amount: input.closingCash, direction: "out", notes: "Cierre de caja registrado por administración" })
        : Promise.resolve({ error: null }),
    ]);
    if (vehicleUpdate.error) throw vehicleUpdate.error;
    if (driverUpdate.error) throw driverUpdate.error;
    if (cashResult.error) throw cashResult.error;
    const maintenanceDue = vehicle.next_maintenance_km !== null && input.endOdometer >= vehicle.next_maintenance_km;
    return Response.json({
      message: maintenanceDue
        ? "Jornada cerrada. El vehículo quedó bloqueado hasta completar el mantenimiento."
        : "Regreso y cierre de jornada registrados correctamente.",
      maintenanceDue,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
