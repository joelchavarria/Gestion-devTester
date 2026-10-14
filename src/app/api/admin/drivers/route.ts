import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOwnerContext, AppError } from "@/lib/server/context";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().trim().min(3).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, "El usuario debe tener entre 3 y 32 caracteres y usar solo letras, números, punto, guion o guion bajo."),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(24),
  licenseNumber: z.string().trim().min(3).max(80),
  password: z.string().regex(/^\d{6,12}$/, "La clave debe tener entre 6 y 12 números."),
  identityDocument: z.string().trim().max(80).optional(),
  emergencyContact: z.string().trim().max(120).optional(),
  vehicleId: z.string().uuid(),
});

export async function POST(request: Request) {
  let invitedUserId: string | null = null;
  let cleanupAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOwnerContext();
    const admin = createSupabaseAdminClient();
    cleanupAdmin = admin;
    const { data: usersResult, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const usernameTaken = usersResult.users.some((user) => String(user.user_metadata?.username ?? "").toLowerCase() === input.username);
    if (usernameTaken) throw new AppError("Ese nombre de usuario ya está ocupado. Elige otro.", 409);
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
    const { data: actorResult, error: actorError } = await admin.auth.admin.getUserById(context.userId);
    if (actorError) throw actorError;
    if (actorResult.user?.email?.trim().toLocaleLowerCase() === input.email.toLocaleLowerCase()) {
      throw new AppError("Usa un correo diferente al del administrador. El motorizado necesita su propia cuenta para entrar a la PWA.", 409);
    }
    // This public bridge consumes Supabase's invite hash before /driver's auth guard runs.
    const redirectTo = new URL("/auth/accept-invite", request.url).toString();
    const { data: invitation, error: invitationError } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: {
        full_name: input.fullName,
        phone: input.phone,
        identity_document: input.identityDocument || null,
        username: input.username,
      },
      redirectTo,
    });
    if (invitationError) {
      const message = invitationError.message.toLocaleLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        throw new AppError("Ese correo ya tiene una cuenta. Usa otro correo del motorizado o un alias de prueba como joelchavarria308+driver@gmail.com.", 409);
      }
      throw new AppError(`No se pudo enviar la invitación: ${invitationError.message}`, 502);
    }
    if (!invitation.user) throw new AppError("Supabase no devolvió la cuenta invitada. Intenta nuevamente.", 502);

    invitedUserId = invitation.user.id;
    const userId = invitedUserId;
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password: input.password });
    if (passwordError) throw new AppError(`No se pudo guardar la contraseña inicial: ${passwordError.message}`, 502);
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
    if (invitedUserId && cleanupAdmin) {
      await cleanupAdmin.auth.admin.deleteUser(invitedUserId).catch(() => undefined);
    }
    return apiErrorResponse(error);
  }
}
