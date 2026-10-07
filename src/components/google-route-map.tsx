"use client";

import { MapPin, NavigationArrow, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { GeoPoint } from "@/lib/geo";

type MapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: { center: GeoPoint; zoom: number; disableDefaultUI?: boolean; zoomControl?: boolean }) => GoogleMap;
    Marker: new (options: { map: GoogleMap; position: GeoPoint; title?: string; label?: string; icon?: unknown }) => GoogleMarker;
    DirectionsService: new () => DirectionsService;
    DirectionsRenderer: new (options: { map: GoogleMap; suppressMarkers?: boolean; polylineOptions?: { strokeColor: string; strokeOpacity: number; strokeWeight: number } }) => DirectionsRenderer;
    LatLngBounds: new () => GoogleBounds;
    TravelMode: { DRIVING: string };
  };
};

type GoogleMap = { fitBounds(bounds: GoogleBounds): void; panTo(point: GeoPoint): void };
type GoogleMarker = { setPosition(point: GeoPoint): void; setMap(map: GoogleMap | null): void };
type GoogleBounds = { extend(point: GeoPoint): void };
type DirectionsService = { route(request: { origin: GeoPoint | string; destination: GeoPoint | string; travelMode: string }, callback: (result: DirectionsResult | null, status: string) => void): void };
type DirectionsRenderer = { setDirections(result: DirectionsResult): void; setMap(map: GoogleMap | null): void };
type DirectionsResult = {
  routes: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{ distance?: { value?: number }; duration?: { value?: number }; start_location?: GeoPoint; end_location?: GeoPoint }>;
  }>;
};

type RouteReady = {
  origin: GeoPoint;
  destination: GeoPoint;
  encodedPolyline: string;
  distanceM: number | null;
  durationS: number | null;
};

type Props = {
  origin: GeoPoint | string;
  destination: GeoPoint | string;
  currentPosition?: GeoPoint | null;
  routeKey?: string;
  className?: string;
  onRouteReady?: (route: RouteReady) => void;
};

let mapsPromise: Promise<MapsApi> | null = null;

function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps solo está disponible en el navegador."));
  if (window.googleMapsApi) return Promise.resolve(window.googleMapsApi);
  if (mapsPromise) return mapsPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."));

  mapsPromise = new Promise<MapsApi>((resolve, reject) => {
    const existing = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => window.googleMapsApi ? resolve(window.googleMapsApi) : reject(new Error("Google Maps no se pudo inicializar.")));
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps.")));
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google) {
        reject(new Error("Google Maps no se pudo inicializar."));
        return;
      }
      window.googleMapsApi = window.google as unknown as MapsApi;
      resolve(window.googleMapsApi);
    };
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function GoogleRouteMap({ origin, destination, currentPosition, routeKey, className, onRouteReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const rendererRef = useRef<DirectionsRenderer | null>(null);
  const currentMarkerRef = useRef<GoogleMarker | null>(null);
  const currentPositionRef = useRef<GeoPoint | null>(currentPosition ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);
    loadGoogleMaps().then((api) => {
      if (cancelled || !containerRef.current) return;
      const map = new api.maps.Map(containerRef.current, {
        center: typeof origin === "string" ? { lat: 12.1328, lng: -86.2504 } : origin,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;
      if (currentPositionRef.current) {
        currentMarkerRef.current = new api.maps.Marker({ map, position: currentPositionRef.current, title: "Ubicación del motorizado" });
      }
      rendererRef.current = new api.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#0a8f57", strokeOpacity: 0.9, strokeWeight: 5 },
      });
      const service = new api.maps.DirectionsService();
      service.route({ origin, destination, travelMode: api.maps.TravelMode.DRIVING }, (result, status) => {
        if (cancelled) return;
        if (status !== "OK" || !result?.routes[0]) {
          setLoading(false);
          setError("Google Maps no pudo calcular esta ruta.");
          return;
        }
        rendererRef.current?.setDirections(result);
        const route = result.routes[0];
        const leg = route.legs?.[0];
        const routeOrigin = leg?.start_location ?? (typeof origin === "string" ? null : origin);
        const routeDestination = leg?.end_location ?? (typeof destination === "string" ? null : destination);
        if (routeOrigin && routeDestination && route.overview_polyline?.points) {
          onRouteReady?.({
            origin: routeOrigin,
            destination: routeDestination,
            encodedPolyline: route.overview_polyline.points,
            distanceM: leg?.distance?.value ?? null,
            durationS: leg?.duration?.value ?? null,
          });
        }
        const bounds = new api.maps.LatLngBounds();
        if (routeOrigin) bounds.extend(routeOrigin);
        if (routeDestination) bounds.extend(routeDestination);
        map.fitBounds(bounds);
        setLoading(false);
      });
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setLoading(false);
        setError(reason instanceof Error ? reason.message : "No se pudo cargar Google Maps.");
      }
    });
    return () => { cancelled = true; };
  }, [destination, onRouteReady, origin, routeKey]);

  useEffect(() => {
    currentPositionRef.current = currentPosition ?? null;
    if (!mapRef.current || !currentPosition || !window.googleMapsApi) return;
    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new window.googleMapsApi.maps.Marker({ map: mapRef.current, position: currentPosition, title: "Ubicación del motorizado" });
    } else {
      currentMarkerRef.current.setPosition(currentPosition);
    }
  }, [currentPosition]);

  return <div className={className ? `google-map-shell ${className}` : "google-map-shell"}>
    <div className="google-map-canvas" ref={containerRef} aria-label="Mapa de Google Maps con ruta activa" />
    {loading ? <div className="google-map-status"><NavigationArrow size={18} /> Calculando ruta…</div> : null}
    {error ? <div className="google-map-status google-map-error"><WarningCircle size={18} /> {error}</div> : null}
    <div className="google-map-attribution"><MapPin size={13} /> Google Maps · Ruta en automóvil</div>
  </div>;
}

declare global {
  interface Window {
    google?: unknown;
    googleMapsApi?: MapsApi;
  }
}
