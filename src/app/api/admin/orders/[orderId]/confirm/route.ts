import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  customerConfirmed: z.literal(true),
  transferValidated: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const { data: order, error } = await admin.from("orders").select("status, payment_method, transfer_status")
      .eq("id", orderId).eq("company_id", context.companyId).single();
    if (error || !order) throw new AppError("No encontramos este pedido.", 404);
    if (order.status !== "awaiting_confirmation" && order.status !== "new") throw new AppError("Este pedido ya fue confirmado o procesado.");
    if (order.payment_method === "bank_transfer" && !input.transferValidated) {
      throw new AppError("Valida manualmente la transferencia antes de confirmar y asignar este pedido.");
    }
    const update = order.payment_method === "bank_transfer"
      ? { status: "pending_assignment" as const, transfer_status: "validated" as const, transfer_validated_by: context.userId, transfer_validated_at: new Date().toISOString() }
      : { status: "pending_assignment" as const };
    const { data: updatedOrder, error: updateError } = await admin
      .from("orders")
      .update(update)
      .eq("id", orderId)
      .eq("company_id", context.companyId)
      .in("status", ["awaiting_confirmation", "new"])
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedOrder) throw new AppError("El pedido cambió de estado. Actualiza la página antes de continuar.", 409);
    const warnings: string[] = [];
    const { error: eventError } = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: orderId,
      from_status: order.status,
      to_status: "pending_assignment",
      actor_user_id: context.userId,
      actor_type: context.role,
      note: order.payment_method === "bank_transfer" ? "Cliente confirmado y transferencia validada manualmente." : "Cliente confirmó el pedido.",
    });
    if (eventError) warnings.push("No se pudo registrar el evento de auditoría.");
    return Response.json({ status: "pending_assignment", warnings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
