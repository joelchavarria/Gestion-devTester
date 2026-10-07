import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({ action: z.enum(["merchant_arrived", "purchase_completed"]) });

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const { action } = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const [orderResult, shiftResult] = await Promise.all([
      admin.from("orders").select("status, driver_id, product_amount").eq("id", orderId).eq("company_id", context.companyId).single(),
      admin.from("driver_shifts").select("id").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
    ]);
    const order = orderResult.data;
    if (orderResult.error || !order || order.driver_id !== context.driver.id) throw new AppError("No puedes actualizar este pedido.", 403);
    if (!shiftResult.data) throw new AppError("No tienes una jornada abierta.");
    const expectedStatus = action === "merchant_arrived" ? "to_merchant" : "picking_up";
    const nextStatus: "picking_up" | "to_customer" = action === "merchant_arrived" ? "picking_up" : "to_customer";
    if (order.status !== expectedStatus) throw new AppError("Este paso ya fue registrado o no corresponde al pedido.");
    const update = action === "purchase_completed"
      ? { status: nextStatus, purchase_completed_at: new Date().toISOString() }
      : { status: nextStatus };
    const { error: orderUpdateError } = await admin.from("orders").update(update).eq("id", orderId).eq("company_id", context.companyId);
    if (orderUpdateError) throw orderUpdateError;
    const { error: eventError } = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: orderId,
      from_status: order.status,
      to_status: nextStatus,
      actor_user_id: context.userId,
      actor_type: "driver",
      note: action === "merchant_arrived" ? "Motorizado llegó al comercio." : "Compra confirmada; motorizado va rumbo al cliente.",
    });
    if (eventError) throw eventError;
    if (action === "purchase_completed" && order.product_amount > 0) {
      const { error: cashError } = await admin.from("cash_drawer_transactions").insert({
        company_id: context.companyId,
        shift_id: shiftResult.data.id,
        driver_id: context.driver.id,
        order_id: orderId,
        kind: "purchase",
        amount: order.product_amount,
        direction: "out",
        notes: "Compra registrada al confirmar retiro.",
      });
      if (cashError) throw cashError;
    }
    return Response.json({ status: nextStatus });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
