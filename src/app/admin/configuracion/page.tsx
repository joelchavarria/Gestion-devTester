import { SettingsCenter } from "@/components/settings-center";
import { PageHeader } from "@/components/ui";
import { requireOwnerContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function SettingsPage() {
  const data = await getAdminBootstrap(await requireOwnerContext());
  return <><PageHeader title="Configuración" description="Administra los ajustes de tu empresa y operación." /><SettingsCenter data={data} /></>;
}
