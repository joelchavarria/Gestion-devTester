import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  available: z.boolean(),
  productAmount: z.coerce.number().min(0).max(100_000),
  note: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (!value.available && (!value.note || value.note.length < 4)) {
    context.addIssue({ code: "custom", path: ["note"], message: "Explica por qué el producto no está disponible." });
  }
});

function incidentNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  return `INC-${date}-${randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();

    const [orderResult, shiftResult] = await Promise.all([
      admin.from("orders").select("order_number, status, driver_id, management_fee, delivery_fee, adjustment_amount, amount_received")
        .eq("id", orderId).eq("company_id", context.companyId).single(),
      admin.from("driver_shifts").select("id")
        .eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
    ]);
    const order = orderResult.data;
    if (orderResult.error || !order || order.driver_id !== context.driver.id || order.status !== "picking_up") {
      throw new AppError("Este pedido no está listo para confirmar la compra.");
    }
    if (!shiftResult.data) throw new AppError("No tienes una jornada abierta.");

    if (!input.available) {
      const { data: incident, error: incidentError } = await admin.from("incidents").insert({
        company_id: context.companyId,
        incident_number: incidentNumber(),
        order_id: orderId,
        driver_id: context.driver.id,
        title: "Producto no disponible",
        description: input.note,
        priority: "high",
        reported_by: context.userId,
      }).select("id").single();
      if (incidentError) throw incidentError;
      const [eventResult, notificationResult] = await Promise.all([
        admin.from("incident_events").insert({ company_id: context.companyId, incident_id: incident.id, actor_id: context.userId, body: "Producto reportado como no disponible desde la PWA." }),
        admin.from("notifications").insert({ company_id: context.companyId, channel: "in_app", kind: "product_unavailable", title: `Producto no disponible en ${order.order_number}`, body: input.note || "El motorizado solicita instrucciones.", payload: { incidentId: incident.id, orderId, driverId: context.driver.id } }),
      ]);
      if (eventResult.error) throw eventResult.error;
      if (notificationResult.error) throw notificationResult.error;
      return Response.json({ status: "picking_up", message: "Incidencia enviada. Espera instrucciones de operaciones." }, { status: 201 });
    }

    const newTotal = input.productAmount + order.management_fee + order.delivery_fee + order.adjustment_amount;
    const changeDue = order.amount_received === null ? 0 : Math.max(0, order.amount_received - newTotal);
    const now = new Date().toISOString();
    const orderUpdate = await admin.from("orders").update({
      status: "to_customer",
      product_amount: input.productAmount,
      change_due: changeDue,
      purchase_completed_at: now,
    }).eq("id", orderId).eq("company_id", context.companyId).eq("status", "picking_up");
    if (orderUpdate.error) throw orderUpdate.error;

    const eventResult = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: orderId,
      from_status: "picking_up",
      to_status: "to_customer",
      actor_user_id: context.userId,
      actor_type: "driver",
      note: input.note ? `Compra confirmada por C$${input.productAmount.toFixed(2)}. ${input.note}` : `Compra confirmada por C$${input.productAmount.toFixed(2)}.`,
    });
    if (eventResult.error) throw eventResult.error;

    if (input.productAmount > 0) {
      const cashResult = await admin.from("cash_drawer_transactions").insert({
        company_id: context.companyId,
        shift_id: shiftResult.data.id,
        driver_id: context.driver.id,
        order_id: orderId,
        kind: "purchase",
        amount: input.productAmount,
        direction: "out",
        notes: "Compra confirmada por el motorizado.",
      });
      if (cashResult.error) throw cashResult.error;
    }

    return Response.json({ status: "to_customer", message: "Compra confirmada. Continúa hacia el cliente." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
