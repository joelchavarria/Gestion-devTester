import { VehicleManager } from "@/components/vehicle-manager";
import { PageHeader } from "@/components/ui";
import { requireOperationsPageContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function VehiclesPage() {
  const data = await getAdminBootstrap(await requireOperationsPageContext());
  return <><PageHeader title="Vehículos" description="Controla la flota, kilometraje, combustible y mantenimientos preventivos." /><section className="vehicle-information"><span>Regla general de mantenimiento</span><strong>Cada {data.company.maintenanceIntervalKm.toLocaleString("es-NI")} km</strong><p>El sistema avisa a 500 km y bloquea el inicio de jornada cuando un vehículo ya alcanzó el mantenimiento programado.</p></section><VehicleManager vehicles={data.vehicles} maintenanceRecords={data.maintenanceRecords} /></>;
}
