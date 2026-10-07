import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext } from "@/lib/server/context";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(24),
  licenseNumber: z.string().trim().min(3).max(80),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    // This public bridge consumes Supabase's invite hash before /driver's auth guard runs.
    const redirectTo = new URL("/auth/accept-invite", request.url).toString();
    const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.fullName, phone: input.phone },
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
      invite_status: "pending",
    });
    if (driverError) throw driverError;
    await admin.from("audit_logs").insert({
      company_id: context.companyId,
      actor_id: context.userId,
      action: "driver.invited",
      entity_type: "driver_profile",
      entity_id: null,
      after_data: { email: input.email, fullName: input.fullName },
    });
    return NextResponse.json({ message: "Invitación creada y enviada al correo del motorizado." }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
