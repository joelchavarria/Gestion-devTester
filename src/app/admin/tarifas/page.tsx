import { TariffManager } from "@/components/tariff-manager";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function TariffsPage() {
  const data = await getAdminBootstrap(await requireOperationsPageContext(), "tariffs");
  return <TariffManager data={data} />;
}
