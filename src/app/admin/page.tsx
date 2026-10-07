import { AdminDashboard } from "@/components/admin-dashboard";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function DashboardPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());

  return <AdminDashboard data={data} />;
}
