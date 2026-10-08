import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({ action: z.literal("merchant_arrived") });

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const { action } = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const [orderResult, shiftResult] = await Promise.all([
      admin.from("orders").select("status, driver_id").eq("id", orderId).eq("company_id", context.companyId).single(),
      admin.from("driver_shifts").select("id").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
    ]);
    const order = orderResult.data;
    if (orderResult.error || !order || order.driver_id !== context.driver.id) throw new AppError("No puedes actualizar este pedido.", 403);
    if (!shiftResult.data) throw new AppError("No tienes una jornada abierta.");
    if (action !== "merchant_arrived" || order.status !== "to_merchant") throw new AppError("Este paso ya fue registrado o no corresponde al pedido.");
    const { error: orderUpdateError } = await admin.from("orders").update({ status: "picking_up" }).eq("id", orderId).eq("company_id", context.companyId).eq("status", "to_merchant");
    if (orderUpdateError) throw orderUpdateError;
    const { error: eventError } = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: orderId,
      from_status: "to_merchant",
      to_status: "picking_up",
      actor_user_id: context.userId,
      actor_type: "driver",
      note: "Motorizado llegó al comercio.",
    });
    if (eventError) throw eventError;
    return Response.json({ status: "picking_up", message: "Llegada registrada. Confirma la compra antes de continuar." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
