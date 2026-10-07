import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireCompanyContext, AppError } from "@/lib/server/context";
import { isValidGeoPoint } from "@/lib/geo";
import { z } from "zod";

const pointSchema = z.object({ lat: z.number(), lng: z.number() });
const schema = z.object({
  origin: pointSchema,
  destination: pointSchema,
  encodedPolyline: z.string().trim().min(2).max(200_000),
  distanceM: z.number().int().nonnegative().nullable().optional(),
  durationS: z.number().int().nonnegative().nullable().optional(),
});

const operationsRoles = new Set(["owner", "admin", "supervisor", "operator"]);

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    assertSameOrigin(request);
    const { orderId } = await params;
    const body = schema.parse(await request.json());
    if (!isValidGeoPoint(body.origin) || !isValidGeoPoint(body.destination)) throw new AppError("La ruta contiene coordenadas inválidas.");

    const context = await requireCompanyContext();
    const admin = createSupabaseAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, driver_id, status")
      .eq("id", orderId)
      .eq("company_id", context.companyId)
      .single();
    if (orderError || !order) throw new AppError("No encontramos el pedido para guardar la ruta.", 404);

    let driverId = order.driver_id;
    if (context.role === "driver") {
      const { data: driver, error: driverError } = await admin
        .from("driver_profiles")
        .select("id")
        .eq("company_id", context.companyId)
        .eq("user_id", context.userId)
        .single();
      if (driverError || !driver || order.driver_id !== driver.id) throw new AppError("No puedes guardar la ruta de este pedido.", 403);
      driverId = driver.id;
    } else if (!operationsRoles.has(context.role)) {
      throw new AppError("No tienes permiso para guardar rutas.", 403);
    }

    const { error } = await admin.from("order_routes").upsert({
      company_id: context.companyId,
      order_id: orderId,
      driver_id: driverId,
      origin_latitude: body.origin.lat,
      origin_longitude: body.origin.lng,
      destination_latitude: body.destination.lat,
      destination_longitude: body.destination.lng,
      encoded_polyline: body.encodedPolyline,
      distance_m: body.distanceM ?? null,
      duration_s: body.durationS ?? null,
    }, { onConflict: "order_id" });
    if (error) throw error;

    return Response.json({ saved: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
