import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const [shiftResult, assignmentResult, orderResult] = await Promise.all([
      admin.from("driver_shifts").select("id").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
      admin.from("order_assignments").select("id").eq("company_id", context.companyId).eq("order_id", orderId).eq("driver_id", context.driver.id).is("unassigned_at", null).is("rejected_at", null).is("accepted_at", null).maybeSingle(),
      admin.from("orders").select("status, driver_id").eq("id", orderId).eq("company_id", context.companyId).single(),
    ]);
    if (!shiftResult.data) throw new AppError("Inicia tu jornada antes de aceptar un pedido.");
    if (assignmentResult.error || !assignmentResult.data) throw new AppError("Este pedido ya no está disponible para ti.", 404);
    if (orderResult.error || !orderResult.data || orderResult.data.driver_id !== context.driver.id || orderResult.data.status !== "assigned") {
      throw new AppError("Este pedido ya fue actualizado por operaciones.");
    }
    const acceptedAt = new Date().toISOString();
    const [assignmentUpdate, orderUpdate, driverUpdate, eventInsert] = await Promise.all([
      admin.from("order_assignments").update({ accepted_at: acceptedAt }).eq("id", assignmentResult.data.id),
      admin.from("orders").update({ status: "to_merchant" }).eq("id", orderId).eq("company_id", context.companyId),
      admin.from("driver_profiles").update({ is_available: false }).eq("id", context.driver.id),
      admin.from("order_status_events").insert({ company_id: context.companyId, order_id: orderId, from_status: "assigned", to_status: "to_merchant", actor_user_id: context.userId, actor_type: "driver", note: "Motorizado aceptó el pedido desde su PWA." }),
    ]);
    if (assignmentUpdate.error) throw assignmentUpdate.error;
    if (orderUpdate.error) throw orderUpdate.error;
    if (driverUpdate.error) throw driverUpdate.error;
    if (eventInsert.error) throw eventInsert.error;
    return Response.json({ status: "to_merchant", message: "Servicio aceptado. Iniciamos el seguimiento hacia el comercio." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
