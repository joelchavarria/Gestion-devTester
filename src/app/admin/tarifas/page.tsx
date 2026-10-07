import { TariffManager } from "@/components/tariff-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function TariffsPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());
  return <><PageHeader title="Tarifas" description="Configura precios por zona y las reglas de cobro de cada servicio." /><TariffManager data={data} /></>;
}
