"use client";

import { GoogleRouteMap } from "@/components/google-route-map";
import { Badge, EmptyState } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminBootstrap, OperationalLocation, OperationalOrder } from "@/lib/operations/types";
import { MapPin, NavigationArrow, Path, WarningCircle } from "@phosphor-icons/react";
import type { RealtimePostgresInsertPayload } from "@supabase/realtime-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type TrackedOrder = Pick<OperationalOrder, "id" | "number" | "customerName" | "address" | "reference" | "merchantName" | "merchantAddress" | "deliveryLatitude" | "deliveryLongitude" | "driverId" | "driverName" | "status">;
type LocationInsert = { id: number; order_id: string | null; driver_id: string; latitude: number; longitude: number; accuracy_m: number | null; speed_kmh: number | null; heading: number | null; captured_at: string };
type AlertInsert = { id: string; order_id: string; driver_id: string; kind: string; threshold_m: number | null; distance_m: number | null; status: string; created_at: string };

export function LiveMapClient({ bootstrap }: { bootstrap: AdminBootstrap }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locations, setLocations] = useState<OperationalLocation[]>(bootstrap?.locations ?? []);
  const [alerts, setAlerts] = useState(bootstrap?.routeAlerts ?? []);
  const [routeSaved, setRouteSaved] = useState(false);

  const activeOrders = useMemo<TrackedOrder[]>(() => {
    return bootstrap.orders.filter((order) => ["assigned", "to_merchant", "picking_up", "to_customer"].includes(order.status));
  }, [bootstrap]);
  const selectedOrder = activeOrders.find((order) => order.id === selectedId) ?? activeOrders[0] ?? null;
  const selectedLocation = selectedOrder ? [...locations].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt)).find((location) => location.orderId === selectedOrder.id) ?? null : null;

  useEffect(() => {
    if (!bootstrap.company.id) return;
    let client;
    try {
      client = createSupabaseBrowserClient();
    } catch {
      return;
    }
    const channel = client.channel(`live-map-${bootstrap.company.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gps_locations", filter: `company_id=eq.${bootstrap.company.id}` }, (payload: RealtimePostgresInsertPayload<LocationInsert>) => {
        const row = payload.new;
        setLocations((current) => [{ id: row.id, orderId: row.order_id, driverId: row.driver_id, latitude: row.latitude, longitude: row.longitude, accuracyM: row.accuracy_m, speedKmh: row.speed_kmh, heading: row.heading, capturedAt: row.captured_at }, ...current.filter((location) => location.id !== row.id)].slice(0, 1000));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "route_alerts", filter: `company_id=eq.${bootstrap.company.id}` }, (payload: RealtimePostgresInsertPayload<AlertInsert>) => {
        const row = payload.new;
        setAlerts((current) => [{ id: row.id, orderId: row.order_id, driverId: row.driver_id, kind: row.kind, thresholdM: row.threshold_m, distanceM: row.distance_m, status: row.status, createdAt: row.created_at }, ...current]);
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [bootstrap.company.id]);

  const saveRoute = useCallback((route: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; encodedPolyline: string; distanceM: number | null; durationS: number | null }) => {
    if (!selectedOrder) return;
    fetch(`/api/routes/${selectedOrder.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(route) }).then((response) => {
      if (response.ok) setRouteSaved(true);
    }).catch(() => undefined);
  }, [selectedOrder]);

  if (!selectedOrder) {
    return <section className="panel map-empty-state"><EmptyState title="Aún no hay pedidos en ruta" detail="El mapa mostrará la ubicación solo cuando un motorizado acepte un pedido desde su PWA." /></section>;
  }

  const activeAlert = alerts.find((alert) => alert.orderId === selectedOrder.id && alert.status === "open");
  const origin = selectedOrder.merchantAddress || "Catedral de Granada, Nicaragua";
  const destination = selectedOrder.deliveryLatitude !== null && selectedOrder.deliveryLongitude !== null ? { lat: selectedOrder.deliveryLatitude, lng: selectedOrder.deliveryLongitude } : selectedOrder.address;

  return <><section className="live-map-layout"><article className="map-stage map-stage-google"><GoogleRouteMap className="admin-google-map" origin={origin} destination={destination} currentPosition={selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : null} routeKey={selectedOrder.id} onRouteReady={saveRoute} /><div className="map-live-overlay"><span><span className="pulse" /> En vivo</span>{routeSaved ? <small>Ruta guardada</small> : null}</div><div className="map-legend"><span><i className="legend-route" /> Ruta sugerida</span><span><i className="legend-dot" /> Motorizado</span></div></article><aside className="map-side-panel"><div className="panel-heading"><div><h2>Servicios en ruta</h2><p>{activeOrders.length} activos ahora</p></div></div><div className="map-driver-list">{activeOrders.map((order) => <button type="button" key={order.id} className={`map-driver-row map-driver-button ${selectedOrder.id === order.id ? "selected" : ""}`} onClick={() => setSelectedId(order.id)}><span className="location-avatar avatar-0"><NavigationArrow size={18} weight="fill" /></span><span><strong>{order.driverName || "Sin asignar"}</strong><small>{order.number} · {order.status === "to_customer" ? "rumbo a cliente" : "en operación"}</small></span><Badge tone={order.id === selectedOrder.id && selectedLocation ? "green" : "blue"}>{selectedLocation && order.id === selectedOrder.id ? "GPS" : "Activo"}</Badge></button>)}</div>{activeAlert ? <div className="deviation-alert"><WarningCircle size={22} weight="fill" /><div><strong>Desvío de ruta detectado</strong><p>{activeAlert.distanceM ?? "Más de"} m fuera de la ruta sugerida. Umbral configurado: {activeAlert.thresholdM ?? bootstrap?.company.routeDeviationThresholdM ?? 500} m.</p></div></div> : <div className="deviation-alert"><WarningCircle size={22} weight="fill" /><div><strong>Alerta de ruta a {bootstrap?.company.routeDeviationThresholdM ?? 500} m</strong><p>La operación recibirá una alerta cuando un motorizado se aleje más del umbral configurado.</p></div></div>}<button type="button" className="button button-secondary button-full" onClick={() => window.alert("El historial de rutas quedará disponible al cerrar el servicio.")}><Path size={18} /> Ver historial de rutas</button></aside></section><section className="map-selection-meta"><MapPin size={17} weight="fill" /><strong>{selectedOrder.customerName}</strong><span>{selectedOrder.address}</span>{selectedLocation ? <small>Última ubicación: {new Date(selectedLocation.capturedAt).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" })} · precisión {selectedLocation.accuracyM ? `${Math.round(selectedLocation.accuracyM)} m` : "no disponible"}</small> : <small>Esperando la primera ubicación del GPS del motorizado.</small>}</section></>;
}
