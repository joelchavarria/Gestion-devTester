import { AdminShell } from "@/components/app-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperationsPageContext } from "@/lib/server/context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireOperationsPageContext();
  const admin = createSupabaseAdminClient();
  const [{ data: company, error: companyError }, { data: whatsapp, error: whatsappError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("companies").select("display_name").eq("id", context.companyId).single(),
    admin.from("whatsapp_accounts").select("connection_status").eq("company_id", context.companyId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle(),
  ]);
  if (companyError || !company) throw new Error("No fue posible cargar tu empresa.");
  if (whatsappError) throw whatsappError;
  if (profileError) throw profileError;
  const fullName = profile?.full_name?.trim() || "Administrador";
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const role = context.role === "owner" ? "Propietario" : context.role === "admin" ? "Administrador" : context.role === "supervisor" ? "Supervisor" : "Operador";
  return <AdminShell companyName={company.display_name} whatsappConnected={whatsapp?.connection_status === "connected"} profile={{ name: fullName, role, initials }}>{children}</AdminShell>;
}
