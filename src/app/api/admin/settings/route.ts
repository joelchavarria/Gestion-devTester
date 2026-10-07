import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa un horario válido.");
const hoursSchema = z.object({ enabled: z.boolean(), from: timeSchema, to: timeSchema });
const businessHoursSchema = z.object({
  monday: hoursSchema,
  tuesday: hoursSchema,
  wednesday: hoursSchema,
  thursday: hoursSchema,
  friday: hoursSchema,
  saturday: hoursSchema,
  sunday: hoursSchema,
});

const schema = z.object({
  displayName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(24).nullable(),
  businessHours: businessHoursSchema,
  maintenanceIntervalKm: z.coerce.number().int().min(100).max(100_000),
  baseManagementFee: z.coerce.number().min(0).max(100_000),
  routeDeviationThresholdM: z.coerce.number().int().min(50).max(10_000),
  otpDeliveryRequired: z.boolean(),
  gpsSharingMode: z.enum(["active_orders_only", "active_shift"]),
  allowOperatorPriceOverride: z.boolean(),
  cancellationAfterPurchaseRule: z.enum(["none", "product_only", "product_management", "product_management_delivery", "manual"]),
  welcomeMessage: z.string().trim().min(1).max(1024),
});

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const [companyResult, settingsResult, whatsappResult] = await Promise.all([
      admin.from("companies").update({ display_name: input.displayName, city: input.city, phone: input.phone || null, updated_at: now }).eq("id", context.companyId),
      admin.from("company_settings").update({
        business_hours: input.businessHours,
        maintenance_interval_km: input.maintenanceIntervalKm,
        base_management_fee: input.baseManagementFee,
        route_deviation_threshold_m: input.routeDeviationThresholdM,
        otp_delivery_required: input.otpDeliveryRequired,
        gps_sharing_mode: input.gpsSharingMode,
        allow_operator_price_override: input.allowOperatorPriceOverride,
        cancellation_after_purchase_rule: input.cancellationAfterPurchaseRule,
        updated_at: now,
      }).eq("company_id", context.companyId),
      admin.from("whatsapp_accounts").update({ welcome_message: input.welcomeMessage, updated_at: now }).eq("company_id", context.companyId),
    ]);
    if (companyResult.error) throw companyResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (whatsappResult.error) throw whatsappResult.error;
    await admin.from("audit_logs").insert({ company_id: context.companyId, actor_id: context.userId, action: "company_settings_updated", entity_type: "company_settings", entity_id: context.companyId, after_data: { ...input, phone: input.phone || null } });
    return Response.json({ saved: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
