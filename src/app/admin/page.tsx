import { AdminDashboard } from "@/components/admin-dashboard";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function DashboardPage() {
  const data = await getAdminBootstrap(await requireOperationsPageContext());

  return <AdminDashboard data={data} />;
}
