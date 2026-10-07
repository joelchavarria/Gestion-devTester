import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyDeliveryOtp } from "@/lib/server/otp";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({ otp: z.string().trim().regex(/^\d{6}$/, "El código OTP debe tener seis dígitos.") });

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const { otp } = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const [orderResult, shiftResult] = await Promise.all([
      admin.from("orders").select("*").eq("id", orderId).eq("company_id", context.companyId).single(),
      admin.from("driver_shifts").select("id").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
    ]);
    const order = orderResult.data;
    if (orderResult.error || !order || order.driver_id !== context.driver.id || order.status !== "to_customer") {
      throw new AppError("Este pedido no está listo para completarse.");
    }
    if (!shiftResult.data) throw new AppError("No tienes una jornada abierta.");
    if (!order.delivery_otp_expires_at || new Date(order.delivery_otp_expires_at).getTime() < Date.now()) throw new AppError("El código OTP expiró. Solicita uno nuevo a operaciones.");
    if (!verifyDeliveryOtp(otp, order.delivery_otp_hash)) throw new AppError("El código OTP no es válido.");
    const now = new Date().toISOString();
    const [orderUpdate, proofInsert, eventInsert, driverUpdate] = await Promise.all([
      admin.from("orders").update({ status: "delivered", delivered_at: now, delivery_otp_verified_at: now }).eq("id", orderId).eq("company_id", context.companyId),
      admin.from("delivery_proofs").upsert({ company_id: context.companyId, order_id: orderId, proof_type: "otp", recorded_by: context.userId, recorded_at: now }, { onConflict: "order_id" }),
      admin.from("order_status_events").insert({ company_id: context.companyId, order_id: orderId, from_status: "to_customer", to_status: "delivered", actor_user_id: context.userId, actor_type: "driver", note: "Entrega completada con OTP validado." }),
      admin.from("driver_profiles").update({ is_available: true }).eq("id", context.driver.id),
    ]);
    if (orderUpdate.error) throw orderUpdate.error;
    if (proofInsert.error) throw proofInsert.error;
    if (eventInsert.error) throw eventInsert.error;
    if (driverUpdate.error) throw driverUpdate.error;
    if (order.amount_received && order.amount_received > 0) {
      const cashRows = [
        { company_id: context.companyId, shift_id: shiftResult.data.id, driver_id: context.driver.id, order_id: orderId, kind: "customer_payment", amount: order.amount_received, direction: "in", notes: "Cobro recibido del cliente" },
        ...(order.change_due > 0 ? [{ company_id: context.companyId, shift_id: shiftResult.data.id, driver_id: context.driver.id, order_id: orderId, kind: "change_given", amount: order.change_due, direction: "out", notes: "Vuelto entregado al cliente" }] : []),
      ];
      const { error: cashError } = await admin.from("cash_drawer_transactions").insert(cashRows);
      if (cashError) throw cashError;
    }
    return Response.json({ status: "delivered" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
