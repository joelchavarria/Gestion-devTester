import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  reason: z.string().trim().min(3).max(160),
  details: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();

    const [assignmentResult, orderResult] = await Promise.all([
      admin.from("order_assignments").select("id")
        .eq("company_id", context.companyId)
        .eq("order_id", orderId)
        .eq("driver_id", context.driver.id)
        .is("unassigned_at", null)
        .is("accepted_at", null)
        .is("rejected_at", null)
        .maybeSingle(),
      admin.from("orders").select("order_number, status, driver_id")
        .eq("id", orderId)
        .eq("company_id", context.companyId)
        .single(),
    ]);

    if (assignmentResult.error || !assignmentResult.data) throw new AppError("Este pedido ya no está disponible para rechazarlo.", 404);
    if (orderResult.error || !orderResult.data || orderResult.data.driver_id !== context.driver.id || orderResult.data.status !== "assigned") {
      throw new AppError("Este pedido ya fue actualizado por operaciones.");
    }

    const now = new Date().toISOString();
    const reason = input.details ? `${input.reason}: ${input.details}` : input.reason;
    const [assignmentUpdate, orderUpdate, eventInsert, notificationInsert] = await Promise.all([
      admin.from("order_assignments").update({ rejected_at: now, unassigned_at: now, rejection_reason: reason }).eq("id", assignmentResult.data.id),
      admin.from("orders").update({ status: "pending_assignment", driver_id: null, assigned_at: null })
        .eq("id", orderId).eq("company_id", context.companyId).eq("status", "assigned"),
      admin.from("order_status_events").insert({
        company_id: context.companyId,
        order_id: orderId,
        from_status: "assigned",
        to_status: "pending_assignment",
        actor_user_id: context.userId,
        actor_type: "driver",
        note: `Motorizado rechazó la asignación. ${reason}`,
      }),
      admin.from("notifications").insert({
        company_id: context.companyId,
        channel: "in_app",
        kind: "driver_rejected_order",
        title: `Pedido ${orderResult.data.order_number} rechazado`,
        body: reason,
        payload: { orderId, driverId: context.driver.id, reason },
      }),
    ]);

    if (assignmentUpdate.error) throw assignmentUpdate.error;
    if (orderUpdate.error) throw orderUpdate.error;
    if (eventInsert.error) throw eventInsert.error;
    if (notificationInsert.error) throw notificationInsert.error;

    return Response.json({ status: "pending_assignment", message: "Servicio rechazado. Operaciones podrá reasignarlo." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
