import { IncidentsManager } from "@/components/incidents-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function IncidentsPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());
  return <><PageHeader title="Incidencias" description="Gestiona problemas que requieren atención y deja un historial de resolución." /><IncidentsManager incidents={data.incidents} /></>;
}
