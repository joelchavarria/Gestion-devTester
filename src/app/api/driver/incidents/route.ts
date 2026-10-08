import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(4).max(2000),
  priority: z.enum(["low", "normal", "medium", "high", "critical"]).default("normal"),
});

function incidentNumber() {
  return `INC-${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "")}-${randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    if (input.orderId) {
      const { data: order, error } = await admin.from("orders").select("id").eq("id", input.orderId).eq("company_id", context.companyId).eq("driver_id", context.driver.id).maybeSingle();
      if (error || !order) throw new AppError("No puedes reportar una incidencia sobre este pedido.", 403);
    }
    const { data: incident, error: incidentError } = await admin.from("incidents").insert({
      company_id: context.companyId,
      incident_number: incidentNumber(),
      order_id: input.orderId ?? null,
      driver_id: context.driver.id,
      title: input.title,
      description: input.description,
      priority: input.priority,
      reported_by: context.userId,
    }).select("id").single();
    if (incidentError) throw incidentError;
    const { error: eventError } = await admin.from("incident_events").insert({ company_id: context.companyId, incident_id: incident.id, actor_id: context.userId, body: "Incidencia reportada desde la PWA del motorizado." });
    if (eventError) throw eventError;
    const { error: notificationError } = await admin.from("notifications").insert({
      company_id: context.companyId,
      channel: "in_app",
      kind: "incident_reported",
      title: `Nueva incidencia: ${input.title}`,
      body: input.description,
      payload: { incidentId: incident.id, orderId: input.orderId ?? null, driverId: context.driver.id, priority: input.priority },
    });
    if (notificationError) throw notificationError;
    return Response.json({ id: incident.id, message: "Incidencia enviada a operaciones." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
