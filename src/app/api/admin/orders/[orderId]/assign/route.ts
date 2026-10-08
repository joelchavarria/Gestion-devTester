import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createDeliveryOtp } from "@/lib/server/otp";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({ driverId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const [orderResult, driverResult, shiftResult] = await Promise.all([
      admin.from("orders").select("status, payment_method, transfer_status").eq("id", orderId).eq("company_id", context.companyId).single(),
      admin.from("driver_profiles").select("id, user_id, invite_status, is_available").eq("id", input.driverId).eq("company_id", context.companyId).single(),
      admin.from("driver_shifts").select("vehicle_id").eq("driver_id", input.driverId).eq("company_id", context.companyId).is("ended_at", null).maybeSingle(),
    ]);
    if (orderResult.error || !orderResult.data) throw new AppError("No encontramos este pedido.", 404);
    if (driverResult.error || !driverResult.data) throw new AppError("No encontramos este motorizado.", 404);
    const order = orderResult.data;
    const driver = driverResult.data;
    if (order.status !== "pending_assignment") throw new AppError("El pedido debe estar confirmado antes de asignarlo.");
    if (order.payment_method === "bank_transfer" && order.transfer_status !== "validated") throw new AppError("Primero valida la transferencia del cliente.");
    if (driver.invite_status !== "activated" || !driver.is_available || !shiftResult.data) throw new AppError("El motorizado debe tener una cuenta activada y una jornada abierta.");
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").select("status, current_odometer_km, next_maintenance_km")
      .eq("id", shiftResult.data.vehicle_id).eq("company_id", context.companyId).single();
    if (vehicleError || !vehicle || vehicle.status !== "active" || (vehicle.next_maintenance_km !== null && vehicle.current_odometer_km >= vehicle.next_maintenance_km)) {
      throw new AppError("El vehículo asignado no está disponible o requiere mantenimiento.");
    }
    const { data: activeOrders, error: activeOrdersError } = await admin.from("orders").select("id")
      .eq("company_id", context.companyId).eq("driver_id", input.driverId).in("status", ["assigned", "to_merchant", "picking_up", "to_customer"]);
    if (activeOrdersError) throw activeOrdersError;
    if ((activeOrders ?? []).length > 0) throw new AppError("Este motorizado ya tiene un pedido activo.");

    const otp = createDeliveryOtp();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const { error: unassignError } = await admin.from("order_assignments").update({ unassigned_at: new Date().toISOString() })
      .eq("order_id", orderId).eq("company_id", context.companyId).is("unassigned_at", null);
    if (unassignError) throw unassignError;
    const { error: orderError } = await admin.from("orders").update({
      status: "assigned",
      driver_id: input.driverId,
      assigned_at: new Date().toISOString(),
      delivery_otp_hash: otp.hash,
      delivery_otp_expires_at: expiresAt,
      delivery_otp_verified_at: null,
    }).eq("id", orderId).eq("company_id", context.companyId);
    if (orderError) throw orderError;
    const { error: assignmentError } = await admin.from("order_assignments").insert({
      company_id: context.companyId,
      order_id: orderId,
      driver_id: input.driverId,
      assigned_by: context.userId,
    });
    if (assignmentError) throw assignmentError;
    const { error: eventError } = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: orderId,
      from_status: order.status,
      to_status: "assigned",
      actor_user_id: context.userId,
      actor_type: context.role,
      note: "Pedido enviado a la PWA del motorizado. Espera su aceptación.",
    });
    if (eventError) throw eventError;
    const { error: notificationError } = await admin.from("notifications").insert({
      company_id: context.companyId,
      user_id: driver.user_id,
      channel: "in_app",
      kind: "order_assigned",
      title: "Tienes un pedido para aceptar",
      body: "Abre la PWA y confirma si puedes atenderlo.",
      payload: { orderId },
    });
    if (notificationError) throw notificationError;
    return Response.json({ otpCode: otp.code, expiresAt });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
