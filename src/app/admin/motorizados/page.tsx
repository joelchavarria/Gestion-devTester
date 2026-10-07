import { DriverManager } from "@/components/driver-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function DriversPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());
  return <><PageHeader title="Motorizados" description="Gestiona sus accesos, turnos, vehículos, combustible y desempeño." /><DriverManager drivers={data.drivers} /></>;
}
