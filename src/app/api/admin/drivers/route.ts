import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext, AppError } from "@/lib/server/context";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(24),
  licenseNumber: z.string().trim().min(3).max(80),
  identityDocument: z.string().trim().max(80).optional(),
  emergencyContact: z.string().trim().max(120).optional(),
  vehicleId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    const [vehicleResult, assignedResult, shiftResult] = await Promise.all([
      admin.from("vehicles").select("id, status, current_odometer_km, next_maintenance_km").eq("id", input.vehicleId).eq("company_id", context.companyId).maybeSingle(),
      admin.from("driver_profiles").select("id").eq("company_id", context.companyId).eq("assigned_vehicle_id", input.vehicleId).maybeSingle(),
      admin.from("driver_shifts").select("id").eq("company_id", context.companyId).eq("vehicle_id", input.vehicleId).is("ended_at", null).maybeSingle(),
    ]);
    if (vehicleResult.error) throw vehicleResult.error;
    if (!vehicleResult.data) throw new AppError("No encontramos el vehículo seleccionado.", 404);
    if (assignedResult.error) throw assignedResult.error;
    if (shiftResult.error) throw shiftResult.error;
    if (assignedResult.data || shiftResult.data) throw new AppError("Este vehículo ya está asignado a otro motorizado.", 409);
    if (vehicleResult.data.status !== "active") throw new AppError("Selecciona un vehículo operativo.");
    if (vehicleResult.data.next_maintenance_km !== null && vehicleResult.data.current_odometer_km >= vehicleResult.data.next_maintenance_km) {
      throw new AppError("El vehículo seleccionado requiere mantenimiento antes de asignarlo.");
    }
    // This public bridge consumes Supabase's invite hash before /driver's auth guard runs.
    const redirectTo = new URL("/auth/accept-invite", request.url).toString();
    const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: {
        full_name: input.fullName,
        phone: input.phone,
        identity_document: input.identityDocument || null,
      },
      redirectTo,
    });
    if (invitationError || !invitation.user) throw new Error(invitationError?.message ?? "No fue posible preparar la invitación.");

    const userId = invitation.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({ id: userId, full_name: input.fullName, phone: input.phone });
    if (profileError) throw profileError;
    const { data: member, error: memberError } = await admin
      .from("company_members")
      .upsert({ company_id: context.companyId, user_id: userId, role: "driver", is_active: true, invited_by: context.userId }, { onConflict: "company_id,user_id" })
      .select("id")
      .single();
    if (memberError) throw memberError;
    const { error: driverError } = await admin.from("driver_profiles").insert({
      company_id: context.companyId,
      user_id: userId,
      member_id: member.id,
      license_number: input.licenseNumber,
      emergency_contact: input.emergencyContact || null,
      assigned_vehicle_id: input.vehicleId,
      invite_status: "pending",
    });
    if (driverError) throw driverError;
    await admin.from("audit_logs").insert({
      company_id: context.companyId,
      actor_id: context.userId,
      action: "driver.invited",
      entity_type: "driver_profile",
      entity_id: null,
      after_data: { email: input.email, fullName: input.fullName, phone: input.phone, vehicleId: input.vehicleId },
    });
    return NextResponse.json({ message: "Invitación creada y enviada al correo del motorizado." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
