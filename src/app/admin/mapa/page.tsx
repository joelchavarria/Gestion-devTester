import { LiveMapClient } from "@/components/live-map-client";
import { PageHeader } from "@/components/ui";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function LiveMapPage() {
  const bootstrap = await getAdminBootstrap(await requireOperationsContext());

  return <><PageHeader title="Mapa en vivo" description="Sigue pedidos activos y recibe alertas cuando una ruta necesita atención." actions={<span className="live-status"><span className="pulse" /> Actualización en tiempo real</span>} /><LiveMapClient bootstrap={bootstrap} /></>;
}
