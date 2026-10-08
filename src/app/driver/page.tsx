import { DriverApp } from "@/components/driver-app";
import { DriverAccessGate } from "@/components/driver-access-gate";
import { AppError, requireDriverContext } from "@/lib/server/context";
import { getDriverBootstrap } from "@/lib/server/operations";

export default async function DriverPage() {
  let result:
    | { kind: "ready"; data: Awaited<ReturnType<typeof getDriverBootstrap>> }
    | { kind: "denied"; signedIn: boolean };
  try {
    const data = await getDriverBootstrap(await requireDriverContext());
    result = { kind: "ready", data };
  } catch (error) {
    if (error instanceof AppError && (error.status === 401 || error.status === 403)) {
      result = { kind: "denied", signedIn: error.status === 403 };
    } else {
      throw error;
    }
  }

  return result.kind === "ready"
    ? <DriverApp data={result.data} />
    : <DriverAccessGate signedIn={result.signedIn} />;
}
