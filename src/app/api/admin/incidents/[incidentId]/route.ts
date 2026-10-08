import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOperationsContext } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["open", "in_review"]),
  note: z.string().trim().min(3).max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    assertSameOrigin(request);
    const { incidentId } = await params;
    z.string().uuid().parse(incidentId);
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const { data: incident, error: incidentError } = await admin.from("incidents").select("id, status").eq("id", incidentId).eq("company_id", context.companyId).single();
    if (incidentError || !incident) throw new AppError("No encontramos esta incidencia.", 404);
    if (incident.status === "resolved") throw new AppError("Una incidencia resuelta no puede cambiar de estado.", 409);

    const { error: updateError } = await admin.from("incidents").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", incidentId).eq("company_id", context.companyId);
    if (updateError) throw updateError;
    const label = input.status === "in_review" ? "Incidencia pasada a revisión." : "Incidencia reabierta.";
    const { error: eventError } = await admin.from("incident_events").insert({ company_id: context.companyId, incident_id: incidentId, actor_id: context.userId, body: input.note ? `${label} ${input.note}` : label });
    if (eventError) throw eventError;
    return Response.json({ message: label });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
