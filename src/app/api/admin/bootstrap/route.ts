import { apiErrorResponse, requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export async function GET() {
  try {
    const context = await requireOperationsContext();
    return Response.json(await getAdminBootstrap(context));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
