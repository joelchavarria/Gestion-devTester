import { DriverApp } from "@/components/driver-app";
import { requireDriverContext } from "@/lib/server/context";
import { getDriverBootstrap } from "@/lib/server/operations";

export default async function DriverPage() {
  const data = await getDriverBootstrap(await requireDriverContext());
  return <DriverApp data={data} />;
}
