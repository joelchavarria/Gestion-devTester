import { OrdersManager } from "@/components/orders-manager";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function OrdersPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());

  return <OrdersManager data={data} />;
}
