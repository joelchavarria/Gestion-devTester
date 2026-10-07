import { apiErrorResponse, requireDriverContext } from "@/lib/server/context";
import { getDriverBootstrap } from "@/lib/server/operations";

export async function GET() {
  try {
    const context = await requireDriverContext();
    return Response.json(await getDriverBootstrap(context));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
