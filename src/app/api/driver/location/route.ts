import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireDriverContext, AppError } from "@/lib/server/context";
import { decodeGooglePolyline, distanceToPolylineM, isValidGeoPoint } from "@/lib/geo";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().uuid(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(10_000).optional(),
  accuracyM: z.coerce.number().min(0).max(10_000).optional(),
  speedKmh: z.coerce.number().min(0).max(400).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  capturedAt: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const point = { lat: input.latitude, lng: input.longitude };
    if (!isValidGeoPoint(point)) throw new AppError("La ubicación enviada no es válida.");

    const context = await requireDriverContext();
    const admin = createSupabaseAdminClient();
    const { data: order, error: orderError } = await admin.from("orders").select("id")
      .eq("id", input.orderId).eq("company_id", context.companyId).eq("driver_id", context.driver.id).in("status", ["to_merchant", "picking_up", "to_customer"]).maybeSingle();
    if (orderError || !order) throw new AppError("La ubicación solo se comparte durante un pedido aceptado.", 403);

    const { error: locationError } = await admin.from("gps_locations").insert({
      company_id: context.companyId,
      driver_id: context.driver.id,
      order_id: input.orderId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_m: input.accuracyM ?? input.accuracy ?? null,
      speed_kmh: input.speedKmh ?? null,
      heading: input.heading ?? null,
      captured_at: input.capturedAt ?? new Date().toISOString(),
    });
    if (locationError) throw locationError;

    const [{ data: route, error: routeError }, { data: settings, error: settingsError }] = await Promise.all([
      admin.from("order_routes").select("encoded_polyline").eq("company_id", context.companyId).eq("order_id", order.id).maybeSingle(),
      admin.from("company_settings").select("route_deviation_threshold_m").eq("company_id", context.companyId).single(),
    ]);
    if (routeError) throw routeError;
    if (settingsError) throw settingsError;

    const thresholdM = settings.route_deviation_threshold_m;
    const distanceM = route?.encoded_polyline ? distanceToPolylineM(point, decodeGooglePolyline(route.encoded_polyline)) : null;
    const deviated = distanceM !== null && distanceM > thresholdM;
    let alertCreated = false;

    if (deviated) {
      const { data: recentAlert, error: recentAlertError } = await admin.from("route_alerts")
        .select("id, created_at")
        .eq("company_id", context.companyId)
        .eq("order_id", order.id)
        .eq("driver_id", context.driver.id)
        .eq("kind", "route_deviation")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentAlertError) throw recentAlertError;
      const recentEnough = recentAlert && Date.now() - new Date(recentAlert.created_at).getTime() < 10 * 60 * 1000;
      if (!recentEnough) {
        const roundedDistance = Math.round(distanceM ?? 0);
        const { error: alertError } = await admin.from("route_alerts").insert({
          company_id: context.companyId,
          order_id: order.id,
          driver_id: context.driver.id,
          kind: "route_deviation",
          threshold_m: thresholdM,
          distance_m: roundedDistance,
        });
        if (alertError) throw alertError;
        const { error: notificationError } = await admin.from("notifications").insert({
          company_id: context.companyId,
          channel: "in_app",
          kind: "route_deviation",
          title: "Desvío de ruta detectado",
          body: `El motorizado está a ${roundedDistance} m de la ruta sugerida.`,
          payload: { orderId: order.id, driverId: context.driver.id, distanceM: roundedDistance, thresholdM },
        });
        if (notificationError) throw notificationError;
        alertCreated = true;
      }
    }

    return Response.json({ recorded: true, orderId: order.id, distanceM, thresholdM, deviated, alertCreated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
