import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({ resolution: z.string().trim().min(3).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  try {
    assertSameOrigin(request);
    const { incidentId } = await params;
    const { resolution } = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const { data: incident, error: incidentError } = await admin.from("incidents").select("id, status")
      .eq("id", incidentId).eq("company_id", context.companyId).single();
    if (incidentError || !incident) throw new AppError("No encontramos esta incidencia.", 404);
    if (incident.status === "resolved") throw new AppError("Esta incidencia ya fue resuelta.");
    const now = new Date().toISOString();
    const { error: updateError } = await admin.from("incidents").update({ status: "resolved", resolution, resolved_by: context.userId, resolved_at: now }).eq("id", incidentId);
    if (updateError) throw updateError;
    const { error: eventError } = await admin.from("incident_events").insert({ company_id: context.companyId, incident_id: incidentId, actor_id: context.userId, body: `Incidencia resuelta: ${resolution}` });
    if (eventError) throw eventError;
    return Response.json({ message: "Incidencia resuelta y registrada en el historial." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
