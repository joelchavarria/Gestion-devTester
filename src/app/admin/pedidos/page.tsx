import { OrdersManager } from "@/components/orders-manager";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function OrdersPage() {
  const data = await getAdminBootstrap(await requireOperationsPageContext(), "orders");

  return <OrdersManager data={data} />;
}
