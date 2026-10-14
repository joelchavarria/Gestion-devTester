import { DriverManager } from "@/components/driver-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getDriversPageData } from "@/lib/server/operations";

export default async function DriversPage() {
  const drivers = await getDriversPageData(await requireOperationsPageContext());
  return <><PageHeader title="Motorizados" description="Gestiona sus accesos, turnos, vehículos, combustible y desempeño." /><DriverManager drivers={drivers} /></>;
}
