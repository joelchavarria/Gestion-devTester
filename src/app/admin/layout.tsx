import { AdminShell } from "@/components/app-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperationsPageContext } from "@/lib/server/context";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireOperationsPageContext();
  const admin = createSupabaseAdminClient();
  const [{ data: company, error: companyError }, { data: whatsapp, error: whatsappError }] = await Promise.all([
    admin.from("companies").select("display_name").eq("id", context.companyId).single(),
    admin.from("whatsapp_accounts").select("connection_status").eq("company_id", context.companyId).maybeSingle(),
  ]);
  if (companyError || !company) throw new Error("No fue posible cargar tu empresa.");
  if (whatsappError) throw whatsappError;
  return <AdminShell companyName={company.display_name} whatsappConnected={whatsapp?.connection_status === "connected"}>{children}</AdminShell>;
}
