import { ReportsManager } from "@/components/reports-manager";
import { requireOwnerPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function ReportsPage() {
  const data = await getAdminBootstrap(await requireOwnerPageContext());
  return <ReportsManager data={data} />;
}
