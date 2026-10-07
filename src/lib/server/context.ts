import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export class AppError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export type CompanyContext = {
  userId: string;
  companyId: string;
  role: AppRole;
};

const operationsRoles: AppRole[] = ["owner", "admin", "supervisor", "operator"];
const ownerRoles: AppRole[] = ["owner", "admin"];

export async function requireCompanyContext(allowedRoles?: AppRole[]): Promise<CompanyContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new AppError("Tu sesión expiró. Inicia sesión nuevamente.", 401);

  const admin = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new AppError("Tu cuenta todavía no pertenece a una empresa.", 403);
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new AppError("No tienes permiso para realizar esta operación.", 403);
  }

  return { userId: user.id, companyId: membership.company_id, role: membership.role };
}

export function requireOperationsContext() {
  return requireCompanyContext(operationsRoles);
}

export function requireOwnerContext() {
  return requireCompanyContext(ownerRoles);
}

export async function requireDriverContext() {
  const context = await requireCompanyContext(["driver"]);
  const admin = createSupabaseAdminClient();
  const { data: driver, error } = await admin
    .from("driver_profiles")
    .select("*")
    .eq("company_id", context.companyId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw error;
  if (!driver) throw new AppError("No encontramos un perfil de motorizado para esta cuenta.", 403);
  return { ...context, driver };
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Operational API error", error);
  return Response.json({ error: "No fue posible completar la operación. Intenta nuevamente." }, { status: 500 });
}

/** Basic same-origin protection for cookie-authenticated API mutations. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("Origen de solicitud inválido.", 403);
  }
  if (originHost !== host) throw new AppError("Solicitud bloqueada por seguridad.", 403);
}
