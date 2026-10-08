import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOperationsContext } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  orderNumber: z.string().trim().min(3).max(80).optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(4).max(2000),
  priority: z.enum(["low", "normal", "medium", "high", "critical"]).default("normal"),
});

function incidentNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  return `INC-${date}-${randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    let order: { id: string; driver_id: string | null } | null = null;

    if (input.orderNumber) {
      const { data, error } = await admin.from("orders").select("id, driver_id").eq("company_id", context.companyId).eq("order_number", input.orderNumber).maybeSingle();
      if (error) throw error;
      if (!data) throw new AppError("No encontramos un pedido de esta empresa con ese código.", 404);
      order = data;
    }

    const { data: incident, error: incidentError } = await admin.from("incidents").insert({
      company_id: context.companyId,
      incident_number: incidentNumber(),
      order_id: order?.id ?? null,
      driver_id: order?.driver_id ?? null,
      title: input.title,
      description: input.description,
      priority: input.priority,
      reported_by: context.userId,
    }).select("id").single();
    if (incidentError) throw incidentError;

    const { error: eventError } = await admin.from("incident_events").insert({ company_id: context.companyId, incident_id: incident.id, actor_id: context.userId, body: "Incidencia registrada desde el panel administrativo." });
    if (eventError) throw eventError;

    const { error: notificationError } = await admin.from("notifications").insert({
      company_id: context.companyId,
      channel: "in_app",
      kind: "incident_reported",
      title: `Nueva incidencia: ${input.title}`,
      body: input.description,
      payload: { incidentId: incident.id, orderId: order?.id ?? null, driverId: order?.driver_id ?? null, priority: input.priority },
    });
    if (notificationError) throw notificationError;

    return Response.json({ id: incident.id, message: "Incidencia creada y enviada a operaciones." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
