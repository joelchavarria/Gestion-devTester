import { TariffManager } from "@/components/tariff-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function TariffsPage() {
  const data = await getAdminBootstrap(await requireOperationsPageContext());
  return <><PageHeader title="Tarifas" description="Configura precios por zona y las reglas de cobro de cada servicio." /><TariffManager data={data} /></>;
}
