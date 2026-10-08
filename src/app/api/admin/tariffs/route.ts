import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, AppError, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
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
}).superRefine((input, context) => {
  const names = input.zones.map((zone) => zone.name.toLocaleLowerCase("es"));
  if (new Set(names).size !== names.length) context.addIssue({ code: "custom", path: ["zones"], message: "No puedes guardar dos zonas con el mismo nombre." });
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
    const foreignId = input.zones.find((zone) => zone.id && !currentIds.has(zone.id));
    if (foreignId) throw new AppError("Una de las zonas ya no pertenece a esta empresa. Actualiza la página e inténtalo otra vez.", 409);

    const retainedIds = new Set(input.zones.flatMap((zone) => zone.id ? [zone.id] : []));
    const removeIds = [...currentIds].filter((id) => !retainedIds.has(id));

    const zoneWrites = input.zones.map((zone, index) => {
      const values = { company_id: context.companyId, name: zone.name, delivery_fee: zone.deliveryFee, minimum_fee: zone.minimumFee, is_active: zone.isActive, sort_order: index, updated_at: new Date().toISOString() };
      return zone.id
        ? admin.from("service_zones").update(values).eq("id", zone.id).eq("company_id", context.companyId)
        : admin.from("service_zones").insert(values);
    });
    const zoneResults = await Promise.all(zoneWrites);
    const failedZone = zoneResults.find((result) => result.error);
    if (failedZone?.error) throw failedZone.error;

    if (removeIds.length) {
      const { error } = await admin.from("service_zones").delete().eq("company_id", context.companyId).in("id", removeIds);
      if (error) throw error;
    }

    const { error: settingsError } = await admin.from("company_settings").update({
      base_management_fee: input.baseManagementFee,
      allow_operator_price_override: input.allowOperatorPriceOverride,
      cancellation_after_purchase_rule: input.cancellationAfterPurchaseRule,
      updated_at: new Date().toISOString(),
    }).eq("company_id", context.companyId);
    if (settingsError) throw settingsError;

    const { data: savedZones, error: savedZonesError } = await admin.from("service_zones").select("id, name, delivery_fee, minimum_fee, is_active").eq("company_id", context.companyId).order("sort_order");
    if (savedZonesError) throw savedZonesError;

    await admin.from("audit_logs").insert({ company_id: context.companyId, actor_id: context.userId, action: "tariffs_updated", entity_type: "service_zones", entity_id: context.companyId, after_data: input });
    return Response.json({
      saved: true,
      zones: (savedZones ?? []).map((zone) => ({ id: zone.id, name: zone.name, deliveryFee: Number(zone.delivery_fee), minimumFee: Number(zone.minimum_fee), isActive: zone.is_active })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
