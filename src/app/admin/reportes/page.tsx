import { ReportsManager } from "@/components/reports-manager";
import { requireOwnerContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function ReportsPage() {
  const data = await getAdminBootstrap(await requireOwnerContext());
  return <ReportsManager data={data} />;
}
