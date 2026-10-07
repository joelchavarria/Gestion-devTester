import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { z } from "zod";

const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  deliveryFee: z.coerce.number().min(0).max(100_000),
  minimumFee: z.coerce.number().min(0).max(100_000).default(0),
  isActive: z.boolean(),
});
const schema = z.object({
  zones: z.array(zoneSchema).min(1).max(50),
  baseManagementFee: z.coerce.number().min(0).max(100_000),
  allowOperatorPriceOverride: z.boolean(),
  cancellationAfterPurchaseRule: z.enum(["none", "product_only", "product_management", "product_management_delivery", "manual"]),
});

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const { data: currentZones, error: currentZonesError } = await admin.from("service_zones").select("id").eq("company_id", context.companyId);
    if (currentZonesError) throw currentZonesError;
    const currentIds = new Set((currentZones ?? []).map((zone) => zone.id));
    const retainedIds = new Set(input.zones.flatMap((zone) => zone.id && currentIds.has(zone.id) ? [zone.id] : []));
    const removeIds = [...currentIds].filter((id) => !retainedIds.has(id));
    if (removeIds.length) {
      const { error } = await admin.from("service_zones").delete().eq("company_id", context.companyId).in("id", removeIds);
      if (error) throw error;
    }

    const updates = input.zones.map((zone, index) => {
      const values = { company_id: context.companyId, name: zone.name, delivery_fee: zone.deliveryFee, minimum_fee: zone.minimumFee, is_active: zone.isActive, sort_order: index, updated_at: new Date().toISOString() };
      return zone.id && currentIds.has(zone.id)
        ? admin.from("service_zones").update(values).eq("id", zone.id).eq("company_id", context.companyId)
        : admin.from("service_zones").insert(values);
    });
    const zoneResults = await Promise.all(updates);
    const failedZone = zoneResults.find((result) => result.error);
    if (failedZone?.error) throw failedZone.error;
    const { error: settingsError } = await admin.from("company_settings").update({
      base_management_fee: input.baseManagementFee,
      allow_operator_price_override: input.allowOperatorPriceOverride,
      cancellation_after_purchase_rule: input.cancellationAfterPurchaseRule,
      updated_at: new Date().toISOString(),
    }).eq("company_id", context.companyId);
    if (settingsError) throw settingsError;
    await admin.from("audit_logs").insert({ company_id: context.companyId, actor_id: context.userId, action: "tariffs_updated", entity_type: "service_zones", entity_id: context.companyId, after_data: input });
    return Response.json({ saved: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
