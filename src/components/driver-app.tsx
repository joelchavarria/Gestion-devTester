"use client";

import { GoogleRouteMap } from "@/components/google-route-map";
import { NotificationCenter } from "@/components/notification-center";
import { PwaInstallCard } from "@/components/pwa-install-card";
import { Badge } from "@/components/ui";
import { currency } from "@/lib/format";
import type { GeoPoint } from "@/lib/geo";
import type { DriverBootstrap, OperationalOrder } from "@/lib/operations/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowRight, CheckCircle, ClipboardText, Clock, Coins, GasPump, Gauge, House,
  MapPin, Motorcycle, NavigationArrow, Package, Phone, Plus, ShieldCheck,
  SignOut, Storefront, UserCircle, Wallet, WarningCircle, X, XCircle,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DriverTab = "inicio" | "actividad" | "perfil";
type SheetKind = "shift" | "fuel" | "incident" | "close" | "reject" | null;
type GpsStatus = "inactive" | "requesting" | "active" | "denied";
type ApiResult = { error?: string; message?: string; status?: string };
type SheetFormProps = { close: () => void; saved: boolean; error: string | null; onSave: (data: FormData) => Promise<void> };

export function DriverApp({ data }: { data: DriverBootstrap }) {
  const router = useRouter();
  const [tab, setTab] = useState<DriverTab>("inicio");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GeoPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("inactive");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [deviationM, setDeviationM] = useState<number | null>(null);
  const lastLocationSent = useRef(0);
  const activeOrder = data.activeOrder;
  const pendingOrder = data.pendingOrders[0] ?? null;

  useEffect(() => {
    if (!activeOrder?.id || !("geolocation" in navigator)) return;
    const timer = window.setTimeout(() => setGpsStatus("requesting"), 0);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const current = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsPosition(current);
        setGpsStatus("active");
        setGpsError(null);
        const now = Date.now();
        if (now - lastLocationSent.current < 20_000) return;
        lastLocationSent.current = now;
        void fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: activeOrder.id,
            latitude: current.lat,
            longitude: current.lng,
            accuracyM: position.coords.accuracy,
            speedKmh: position.coords.speed ? position.coords.speed * 3.6 : undefined,
            heading: position.coords.heading ?? undefined,
            capturedAt: new Date(position.timestamp).toISOString(),
          }),
        }).then(async (response) => {
          if (!response.ok) throw new Error();
          const result = await response.json() as { distanceM?: number | null };
          setDeviationM(result.distanceM ?? null);
        }).catch(() => setGpsError("No pudimos compartir tu ubicación en este momento."));
      },
      () => { setGpsStatus("denied"); setGpsError("Activa la ubicación para que operaciones pueda seguir el pedido."); },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => { window.clearTimeout(timer); navigator.geolocation.clearWatch(watchId); };
  }, [activeOrder?.id]);

  async function request(path: string, body?: unknown): Promise<ApiResult> {
    const response = await fetch(path, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const raw = await response.text();
      let payload: ApiResult = {};
      try { payload = raw ? JSON.parse(raw) as ApiResult : {}; } catch { /* Respuesta no JSON. */ }
      throw new Error(payload.error ?? "No fue posible guardar el cambio.");
    }
    if (response.status === 204) return {};
    return await response.json() as ApiResult;
  }

  async function run(action: () => Promise<ApiResult>) {
    setWorking(true); setError(null); setNotice(null);
    try {
      const result = await action();
      setNotice(result.message ?? "Cambio guardado correctamente.");
      setSheet(null);
      if (result.status === "delivered") setOtp("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible completar la operación.");
    } finally { setWorking(false); }
  }

  function openSheet(next: Exclude<SheetKind, null>) { setError(null); setNotice(null); setSheet(next); }
  async function acceptOrder() { if (pendingOrder) await run(() => request(`/api/driver/orders/${pendingOrder.id}/accept`)); }
  async function rejectOrder(form: FormData) { if (pendingOrder) await run(() => request(`/api/driver/orders/${pendingOrder.id}/reject`, { reason: String(form.get("reason") ?? "No puedo realizar el servicio"), details: String(form.get("details") ?? "") })); }
  async function arriveMerchant() { if (activeOrder) await run(() => request(`/api/driver/orders/${activeOrder.id}/progress`, { action: "merchant_arrived" })); }
  async function purchase(form: FormData) { if (activeOrder) await run(() => request(`/api/driver/orders/${activeOrder.id}/purchase`, { available: form.get("available") === "yes", productAmount: Number(form.get("productAmount")), note: String(form.get("note") ?? "") })); }
  async function completeOrder() { if (activeOrder) await run(() => request(`/api/driver/orders/${activeOrder.id}/complete`, { otp })); }
  async function startShift(form: FormData) { await run(() => request("/api/driver/shifts", { vehicleId: String(form.get("vehicleId") ?? ""), startOdometer: Number(form.get("startOdometer")), fuelLevel: Number(form.get("fuelLevel")), openingCash: Number(form.get("openingCash")) })); }
  async function saveFuel(form: FormData) { await run(() => request("/api/driver/fuel", { liters: Number(form.get("liters")), amount: Number(form.get("amount")), odometer: Number(form.get("odometer")), fuelLevelAfter: Number(form.get("fuelLevelAfter")), stationName: String(form.get("stationName") ?? "") })); }
  async function reportIncident(form: FormData) { await run(() => request("/api/driver/incidents", { orderId: activeOrder?.id, title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), priority: String(form.get("priority") ?? "normal") })); }
  async function closeShift(form: FormData) { await run(() => request("/api/driver/shifts/close", { endOdometer: Number(form.get("endOdometer")), fuelLevel: Number(form.get("fuelLevel")), closingCash: Number(form.get("closingCash")), notes: String(form.get("notes") ?? "") })); }

  return <main className="driver-app-shell driver-v2">
    <header className="driver-topbar"><div><span className="driver-logo"><Motorcycle size={22} weight="fill" /></span><strong>Tudelivery <small>Motorizado</small></strong></div><NotificationCenter variant="driver" /></header>
    <section className="driver-profile-strip"><div><span className="avatar avatar-blue">{data.driver.initials}</span><span><small>Buen día,</small><strong>{data.driver.name}</strong></span></div><Badge tone={activeOrder ? "green" : data.openShift ? "blue" : "neutral"}>{activeOrder ? "En servicio" : data.openShift ? "Disponible" : "Sin jornada"}</Badge></section>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !sheet ? <p className="form-error driver-notice" role="alert">{error}</p> : null}
    {tab === "inicio" ? <DriverHome data={data} activeOrder={activeOrder} pendingOrder={pendingOrder} otp={otp} setOtp={setOtp} gpsPosition={gpsPosition} gpsStatus={gpsStatus} gpsError={gpsError} deviationM={deviationM} working={working} onStart={() => openSheet("shift")} onFuel={() => openSheet("fuel")} onIncident={() => openSheet("incident")} onReject={() => openSheet("reject")} onAccept={acceptOrder} onArrive={arriveMerchant} onPurchase={purchase} onComplete={completeOrder} /> : tab === "actividad" ? <DriverActivity data={data} /> : <DriverProfile data={data} onFuel={() => openSheet("fuel")} onClose={() => openSheet("close")} setNotice={setNotice} setError={setError} />}
    <nav className="driver-bottom-nav" aria-label="Navegación del motorizado">
      <NavButton active={tab === "inicio"} onClick={() => setTab("inicio")} icon={<House size={22} weight={tab === "inicio" ? "fill" : "regular"} />} label="Inicio" />
      <NavButton active={tab === "actividad"} onClick={() => setTab("actividad")} icon={<ClipboardText size={22} weight={tab === "actividad" ? "fill" : "regular"} />} label="Actividad" />
      <NavButton active={tab === "perfil"} onClick={() => setTab("perfil")} icon={<UserCircle size={23} weight={tab === "perfil" ? "fill" : "regular"} />} label="Perfil" />
    </nav>
    {sheet === "shift" ? <StartShiftSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={startShift} /> : null}
    {sheet === "fuel" ? <FuelSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={saveFuel} /> : null}
    {sheet === "incident" ? <IncidentSheet close={() => setSheet(null)} saved={working} error={error} onSave={reportIncident} /> : null}
    {sheet === "close" ? <CloseShiftSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={closeShift} /> : null}
    {sheet === "reject" && pendingOrder ? <RejectSheet order={pendingOrder} close={() => setSheet(null)} saved={working} error={error} onSave={rejectOrder} /> : null}
    <DriverStyles />
  </main>;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button className={clsx(active && "active")} type="button" onClick={onClick}>{icon}<span>{label}</span></button>;
}

type HomeProps = {
  data: DriverBootstrap; activeOrder: OperationalOrder | null; pendingOrder: OperationalOrder | null;
  otp: string; setOtp: (value: string) => void; gpsPosition: GeoPoint | null; gpsStatus: GpsStatus;
  gpsError: string | null; deviationM: number | null; working: boolean; onStart: () => void;
  onFuel: () => void; onIncident: () => void; onReject: () => void; onAccept: () => Promise<void>;
  onArrive: () => Promise<void>; onPurchase: (form: FormData) => Promise<void>; onComplete: () => Promise<void>;
};

function DriverHome(props: HomeProps) {
  const { data, activeOrder, pendingOrder } = props;
  return <div className="driver-page">
    <ShiftSummary data={data} />
    {!data.openShift ? <EmptyState icon={<Motorcycle size={34} weight="fill" />} kicker="ANTES DE SALIR" title="Inicia tu jornada" text="Confirma la moto, kilometraje, combustible y fondo de caja antes de recibir servicios." action={<button className="button button-primary button-full" type="button" onClick={props.onStart} disabled={!data.availableVehicles.length}><ArrowRight size={18} weight="bold" /> {data.availableVehicles.length ? "Registrar salida" : "No hay vehículos disponibles"}</button>} />
      : activeOrder?.status === "picking_up" ? <PurchaseStep order={activeOrder} working={props.working} onSave={props.onPurchase} onIncident={props.onIncident} />
      : activeOrder ? <RouteStep order={activeOrder} otp={props.otp} setOtp={props.setOtp} gpsPosition={props.gpsPosition} gpsStatus={props.gpsStatus} gpsError={props.gpsError} deviationM={props.deviationM} working={props.working} onArrive={props.onArrive} onComplete={props.onComplete} onIncident={props.onIncident} />
      : pendingOrder ? <AssignedStep order={pendingOrder} working={props.working} onAccept={props.onAccept} onReject={props.onReject} />
      : <EmptyState icon={<CheckCircle size={34} weight="fill" />} kicker="JORNADA ACTIVA" title="Estás listo para recibir servicios" text="Cuando operaciones te asigne un pedido aparecerá aquí. El GPS solo se activa al aceptar." />}
    {data.openShift && !activeOrder ? <section className="driver-actions-grid"><button type="button" onClick={props.onFuel}><GasPump size={22} weight="fill" /><span>Registrar<br />combustible</span></button><button type="button" onClick={props.onIncident}><WarningCircle size={22} weight="fill" /><span>Reportar<br />incidencia</span></button></section> : null}
    {data.openShift && data.driver.vehicle?.nextMaintenanceAt ? <div className="driver-maintenance-note"><CheckCircle size={20} weight="fill" /><span><strong>Vehículo habilitado</strong><small>Próximo mantenimiento en {Math.max(0, data.driver.vehicle.nextMaintenanceAt - data.driver.vehicle.odometer).toLocaleString("es-NI")} km</small></span></div> : null}
  </div>;
}

function ShiftSummary({ data }: { data: DriverBootstrap }) {
  const vehicle = data.driver.vehicle;
  const travelled = data.openShift && vehicle ? Math.max(0, vehicle.odometer - data.openShift.startOdometer) : 0;
  return <section className="driver-shift-card driver-shift-card-v2"><div><span>{data.openShift ? "Jornada activa" : "Jornada sin iniciar"}</span><strong>{vehicle ? `${vehicle.label} · ${vehicle.plate}` : "Selecciona un vehículo"}</strong><small>{data.openShift ? `Salida ${data.openShift.startOdometer.toLocaleString("es-NI")} km` : "Registra tu salida para recibir pedidos"}</small></div><div className="driver-shift-stats"><span><Gauge size={18} /><b>{travelled} km</b><small>recorrido</small></span><span><GasPump size={18} /><b>{vehicle?.fuelLevel ?? 0}%</b><small>tanque</small></span><span><Wallet size={18} /><b>{currency(data.openShift?.openingCash ?? 0)}</b><small>fondo</small></span></div></section>;
}

function EmptyState({ icon, kicker, title, text, action }: { icon: React.ReactNode; kicker: string; title: string; text: string; action?: React.ReactNode }) {
  return <section className="driver-section driver-empty-state"><span className="driver-hero-icon">{icon}</span><p className="driver-kicker">{kicker}</p><h1>{title}</h1><p>{text}</p>{action}</section>;
}

function AssignedStep({ order, working, onAccept, onReject }: { order: OperationalOrder; working: boolean; onAccept: () => Promise<void>; onReject: () => void }) {
  return <section className="driver-section"><div className="driver-section-heading"><div><p>NUEVO SERVICIO</p><h1>Pedido por aceptar</h1></div><Badge tone="green">Ahora</Badge></div><OrderCard order={order} /><div className="driver-callout"><ShieldCheck size={21} weight="fill" /><span><strong>Antes de aceptar</strong><small>Revisa comercio, destino, pago y efectivo requerido.</small></span></div><div className="driver-stacked-actions"><button className="button button-primary button-full" type="button" disabled={working} onClick={() => void onAccept()}><CheckCircle size={21} weight="bold" /> {working ? "Aceptando…" : "Aceptar servicio"}</button><button className="button button-secondary button-full danger" type="button" disabled={working} onClick={onReject}><XCircle size={21} weight="bold" /> Rechazar</button></div></section>;
}

function RouteStep({ order, otp, setOtp, gpsPosition, gpsStatus, gpsError, deviationM, working, onArrive, onComplete, onIncident }: { order: OperationalOrder; otp: string; setOtp: (value: string) => void; gpsPosition: GeoPoint | null; gpsStatus: GpsStatus; gpsError: string | null; deviationM: number | null; working: boolean; onArrive: () => Promise<void>; onComplete: () => Promise<void>; onIncident: () => void }) {
  const toCustomer = order.status === "to_customer";
  const destination: GeoPoint | string = toCustomer && order.deliveryLatitude !== null && order.deliveryLongitude !== null ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude } : toCustomer ? order.address : order.merchantAddress || "Granada, Nicaragua";
  const origin: GeoPoint | string = toCustomer ? order.merchantAddress || "Granada, Nicaragua" : gpsPosition || "Catedral de Granada, Nicaragua";
  const stopName = toCustomer ? order.customerName : order.merchantName || "Comercio";
  const stopAddress = toCustomer ? order.address : order.merchantAddress || "Ubicación del comercio";
  function saveRoute(route: { origin: GeoPoint; destination: GeoPoint; encodedPolyline: string; distanceM: number | null; durationS: number | null }) { void fetch(`/api/routes/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(route) }); }
  function openNavigation() { const target = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`; window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`, "_blank", "noopener,noreferrer"); }
  return <section className="driver-section"><div className="driver-stage-banner"><NavigationArrow size={25} weight="fill" /><div><strong>{toCustomer ? "En camino al cliente" : "En camino al punto de compra"}</strong><small>{toCustomer ? "Entrega y valida el OTP" : "Siguiente acción: llegar al comercio"}</small></div><Badge tone="green">En tránsito</Badge></div><article className="driver-navigation-card driver-route-card"><GoogleRouteMap className="driver-map" origin={origin} destination={destination} currentPosition={gpsPosition} routeKey={`${order.id}-${order.status}`} onRouteReady={saveRoute} /><div className="driver-nav-info"><div className="driver-gps-row"><span className={clsx("location-active", gpsStatus === "denied" && "location-denied")}><i /> {gpsLabel(gpsStatus)}</span><button className="driver-link-button" type="button" onClick={openNavigation}><NavigationArrow size={16} weight="fill" /> Abrir navegación</button></div><span>Próxima parada</span><h2>{stopName}</h2><p><MapPin size={15} weight="fill" /> {stopAddress}</p>{deviationM !== null && deviationM > 500 ? <div className="gps-deviation-warning"><WarningCircle size={16} weight="fill" /> Desvío detectado: {Math.round(deviationM)} m</div> : null}</div></article><OrderSummary order={order} />{toCustomer ? <><a className="button button-secondary button-full driver-phone-action" href={`tel:${order.customerPhone.replace(/[^+\d]/g, "")}`}><Phone size={19} weight="fill" /> Llamar al cliente</a><div className="otp-card"><span>ENTREGA SEGURA</span><strong>Ingresa el OTP de 6 dígitos que tiene operaciones.</strong><label className="sr-only" htmlFor="delivery-otp">Código OTP</label><input id="delivery-otp" autoComplete="one-time-code" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="• • • • • •" /></div></> : null}{gpsError ? <p className="form-error">{gpsError}</p> : null}<div className="driver-stacked-actions"><button className="button button-primary button-full" type="button" disabled={working || (toCustomer && otp.length !== 6)} onClick={() => void (toCustomer ? onComplete() : onArrive())}><MapPin size={21} weight="fill" /> {working ? "Guardando…" : toCustomer ? "Validar OTP y finalizar" : "Llegué al punto de compra"}</button><button className="button button-secondary button-full danger" type="button" disabled={working} onClick={onIncident}><WarningCircle size={20} weight="fill" /> Reportar problema</button></div></section>;
}

function PurchaseStep({ order, working, onSave, onIncident }: { order: OperationalOrder; working: boolean; onSave: (form: FormData) => Promise<void>; onIncident: () => void }) {
  const [available, setAvailable] = useState(true);
  return <section className="driver-section"><div className="driver-section-heading"><div><p>EN EL COMERCIO</p><h1>Confirma la compra</h1></div><Badge tone="green">Paso 2 de 3</Badge></div><OrderSummary order={order} /><form className="driver-purchase-form" action={onSave}><fieldset><legend>¿Producto disponible?</legend><label className={clsx("driver-choice-tile", available && "selected")}><input type="radio" name="available" value="yes" checked={available} onChange={() => setAvailable(true)} /><CheckCircle size={22} weight="fill" /> Sí, disponible</label><label className={clsx("driver-choice-tile", !available && "selected unavailable")}><input type="radio" name="available" value="no" checked={!available} onChange={() => setAvailable(false)} /><XCircle size={22} weight="fill" /> No disponible</label></fieldset>{available ? <label>Precio real de compra<span className="driver-money-input"><b>C$</b><input name="productAmount" type="number" min="0" step="0.01" defaultValue={order.productAmount} required /></span><small>Confirma el monto pagado en el comercio.</small></label> : <input type="hidden" name="productAmount" value={order.productAmount} />}<label>Nota {available ? "(opcional)" : "(obligatoria)"}<textarea name="note" minLength={available ? undefined : 4} placeholder={available ? "Cambio de presentación autorizado" : "Explica por qué no se pudo comprar"} required={!available} /></label><button className="button button-secondary button-full danger" type="button" onClick={onIncident}><WarningCircle size={19} weight="fill" /> Reportar otro problema</button><button className="button button-primary button-full" type="submit" disabled={working}><CheckCircle size={20} weight="fill" /> {working ? "Confirmando…" : available ? "Confirmar compra" : "Reportar producto no disponible"}</button></form></section>;
}

function OrderCard({ order }: { order: OperationalOrder }) {
  return <article className="driver-order-card driver-order-card-v2"><div className="driver-order-top"><span>{order.number}</span><Badge tone="green">{serviceLabel(order.serviceType)}</Badge></div><dl className="driver-order-details"><div><dt><Storefront size={19} /></dt><dd><small>Compra en</small><strong>{order.merchantName || "Punto de recogida"}</strong></dd></div><div><dt><Package size={19} /></dt><dd><small>Servicio</small><strong>{order.reference || serviceLabel(order.serviceType)}</strong></dd></div><div><dt><MapPin size={19} /></dt><dd><small>Entrega en</small><strong>{order.address}</strong></dd></div><div><dt><Coins size={19} /></dt><dd><small>Total del pedido</small><strong>{currency(order.total)}</strong></dd></div></dl><div className="driver-cash-line"><span>{order.paymentMethod === "cash" ? "Pago en efectivo" : "Transferencia"}</span><strong>{order.paymentMethod === "cash" ? `Vuelto: ${currency(order.changeDue)}` : "Validada"}</strong></div></article>;
}

function OrderSummary({ order }: { order: OperationalOrder }) {
  return <article className="driver-order-card driver-order-summary"><div className="driver-order-top"><span>{order.number}</span><strong>{currency(order.total)}</strong></div><h2>{order.merchantName || serviceLabel(order.serviceType)}</h2><div className="driver-summary-lines"><span><Package size={17} /><b>Producto</b><strong>{currency(order.productAmount)}</strong></span><span><Motorcycle size={17} /><b>Gestión + delivery</b><strong>{currency(order.managementFee + order.deliveryFee)}</strong></span><span><Wallet size={17} /><b>{order.paymentMethod === "cash" ? "Cobrar al entregar" : "Pago validado"}</b><strong>{currency(order.total)}</strong></span></div></article>;
}

function DriverActivity({ data }: { data: DriverBootstrap }) {
  const travelled = data.openShift && data.driver.vehicle ? Math.max(0, data.driver.vehicle.odometer - data.openShift.startOdometer) : 0;
  const fuelLitres = data.recentFuel.reduce((sum, fuel) => sum + fuel.liters, 0);
  const earnings = data.recentOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
  const entries = [...data.recentOrders.map((order) => ({ type: "order" as const, at: order.deliveredAt ?? order.createdAt, order })), ...data.recentFuel.map((fuel) => ({ type: "fuel" as const, at: fuel.recordedAt, fuel }))].sort((a, b) => b.at.localeCompare(a.at));
  return <div className="driver-page"><div className="driver-section-heading"><div><p>HOY</p><h1>Actividad</h1></div><Badge tone="green">En tiempo real</Badge></div><section className="driver-activity-metrics"><span><small>Pedidos</small><strong>{data.recentOrders.length}</strong></span><span><small>Recorrido</small><strong>{travelled} km</strong></span><span><small>Combustible</small><strong>{fuelLitres.toFixed(1)} L</strong></span><span><small>Ganancia</small><strong>{currency(earnings)}</strong></span></section><div className="driver-activity-list">{entries.map((entry) => entry.type === "order" ? <article key={`o-${entry.order.id}`}><span className="activity-icon done"><CheckCircle size={18} weight="fill" /></span><div><strong>{entry.order.number} entregado</strong><small>{entry.order.merchantName || serviceLabel(entry.order.serviceType)} · {formatDate(entry.at)}</small></div><b>{currency(entry.order.deliveryFee)}</b></article> : <article key={`f-${entry.fuel.id}`}><span className="activity-icon fuel"><GasPump size={18} weight="fill" /></span><div><strong>Carga de combustible</strong><small>{entry.fuel.liters} L · {entry.fuel.odometer.toLocaleString("es-NI")} km · {formatDate(entry.at)}</small></div><b>{currency(entry.fuel.amount)}</b></article>)}{!entries.length ? <div className="empty-table">Tu actividad aparecerá aquí al completar pedidos o registrar combustible.</div> : null}</div></div>;
}

function DriverProfile({ data, onFuel, onClose, setNotice, setError }: { data: DriverBootstrap; onFuel: () => void; onClose: () => void; setNotice: (value: string | null) => void; setError: (value: string | null) => void }) {
  const router = useRouter(); const vehicle = data.driver.vehicle;
  async function savePassword(form: FormData) { const password = String(form.get("password") ?? ""); if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; } const { error } = await createSupabaseBrowserClient().auth.updateUser({ password }); if (error) { setError(error.message); return; } setError(null); setNotice("Clave de acceso actualizada."); }
  async function logout() { await createSupabaseBrowserClient().auth.signOut(); router.replace("/login"); router.refresh(); }
  return <div className="driver-page"><div className="driver-profile-card driver-profile-card-v2"><span className="avatar avatar-blue profile-avatar">{data.driver.initials}</span><div><h1>{data.driver.name}</h1><p>{data.driver.phone} · {data.companyName}</p><Badge tone={data.openShift ? "green" : "neutral"}>{data.openShift ? "Disponible" : "Fuera de jornada"}</Badge></div></div><section className="driver-profile-section"><h2>Mi vehículo</h2>{vehicle ? <><article><Motorcycle size={25} weight="fill" /><div><strong>{vehicle.label}</strong><small>{vehicle.plate} · {vehicle.odometer.toLocaleString("es-NI")} km</small></div><span>{vehicle.fuelLevel}%</span></article>{vehicle.nextMaintenanceAt ? <article><Gauge size={24} weight="fill" /><div><strong>Mantenimiento programado</strong><small>Faltan {Math.max(0, vehicle.nextMaintenanceAt - vehicle.odometer).toLocaleString("es-NI")} km</small></div></article> : null}</> : <p className="muted">Inicia una jornada para seleccionar vehículo.</p>}</section><section className="driver-profile-section"><h2>Mi jornada</h2>{data.openShift ? <><article><Clock size={24} weight="fill" /><div><strong>Iniciada {formatDate(data.openShift.startedAt)}</strong><small>Salida {data.openShift.startOdometer.toLocaleString("es-NI")} km · Fondo {currency(data.openShift.openingCash)}</small></div></article><button className="button button-secondary button-full" type="button" onClick={onFuel}><Plus size={18} /> Registrar combustible</button><button className="button button-secondary button-full danger" type="button" onClick={onClose}>Finalizar jornada</button></> : <p className="muted">No hay una jornada abierta.</p>}</section><section className="driver-profile-section"><h2>Seguridad</h2><form className="modal-form" action={savePassword}><label>Actualizar contraseña<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" required /></label><button className="button button-secondary button-full" type="submit"><ShieldCheck size={18} /> Guardar clave</button></form></section><PwaInstallCard compact /><section className="driver-profile-section"><button className="button button-secondary button-full danger" type="button" onClick={() => void logout()}><SignOut size={18} /> Cerrar sesión</button></section></div>;
}

function StartShiftSheet({ data, close, saved, error, onSave }: SheetFormProps & { data: DriverBootstrap }) {
  const first = data.availableVehicles[0]; const [vehicleId, setVehicleId] = useState(first?.id ?? ""); const selected = data.availableVehicles.find((vehicle) => vehicle.id === vehicleId) ?? first;
  return <Sheet icon={<Motorcycle size={24} weight="fill" />} title="Iniciar jornada" description="Confirma vehículo, kilometraje, combustible y fondo para vueltas." close={close}><form className="driver-fuel-form" action={onSave}><label className="driver-form-wide">Vehículo<select name="vehicleId" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>{data.availableVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.code} · {vehicle.label}</option>)}</select></label><label>Kilometraje inicial<input key={`${vehicleId}-km`} name="startOdometer" type="number" min={selected?.odometer ?? 0} defaultValue={selected?.odometer ?? 0} required /></label><label>Nivel de tanque (%)<input key={`${vehicleId}-fuel`} name="fuelLevel" type="number" min="0" max="100" defaultValue={selected?.fuelLevel ?? 0} required /></label><label className="driver-form-wide">Fondo para compras y vueltas (C$)<input name="openingCash" type="number" min="0" defaultValue="0" required /></label>{error ? <p className="form-error driver-form-wide">{error}</p> : null}<button className="button button-primary button-full driver-form-wide" type="submit" disabled={saved || !selected}>{saved ? "Iniciando…" : "Iniciar jornada"}</button></form></Sheet>;
}

function FuelSheet({ data, close, saved, error, onSave }: SheetFormProps & { data: DriverBootstrap }) {
  return <Sheet icon={<GasPump size={24} weight="fill" />} title="Registrar combustible" description="El kilometraje permite calcular consumo y costo por kilómetro." close={close}><form className="driver-fuel-form" action={onSave}><label>Litros<input name="liters" type="number" step="0.1" min="0.1" placeholder="0.0" required /></label><label>Monto pagado (C$)<input name="amount" type="number" step="0.01" min="0" placeholder="0" required /></label><label>Kilometraje actual<input name="odometer" type="number" min={data.driver.vehicle?.odometer ?? 0} defaultValue={data.driver.vehicle?.odometer ?? 0} required /></label><label>Nivel después (%)<input name="fuelLevelAfter" type="number" min="0" max="100" defaultValue={data.driver.vehicle?.fuelLevel ?? 0} required /></label><label className="driver-form-wide">Gasolinera (opcional)<input name="stationName" placeholder="Ej. UNO Granada" /></label>{error ? <p className="form-error driver-form-wide">{error}</p> : null}<button className="button button-primary button-full driver-form-wide" type="submit" disabled={saved}>{saved ? "Guardando…" : "Guardar carga"}</button></form></Sheet>;
}

function IncidentSheet({ close, saved, error, onSave }: SheetFormProps) {
  return <Sheet icon={<WarningCircle size={24} weight="fill" />} title="Reportar incidencia" description="Operaciones recibirá el reporte para ayudarte o autorizar una anulación." close={close}><form className="driver-fuel-form" action={onSave}><label>Motivo<select name="title" defaultValue="Cliente no responde"><option>Cliente no responde</option><option>No encuentro el destino</option><option>Lluvia</option><option>Vehículo averiado</option><option>Comercio cerrado</option><option>Otra incidencia</option></select></label><label>Prioridad<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label><label className="driver-form-wide">Detalle<textarea name="description" minLength={4} placeholder="Explica qué ocurre y qué necesitas." required /></label>{error ? <p className="form-error driver-form-wide">{error}</p> : null}<button className="button button-primary button-full driver-form-wide" type="submit" disabled={saved}>{saved ? "Enviando…" : "Enviar a operaciones"}</button></form></Sheet>;
}

function RejectSheet({ order, close, saved, error, onSave }: SheetFormProps & { order: OperationalOrder }) {
  return <Sheet icon={<XCircle size={24} weight="fill" />} title="Rechazar servicio" description={`${order.number} volverá a operaciones para que lo reasignen.`} close={close}><form className="driver-fuel-form" action={onSave}><label className="driver-form-wide">Motivo<select name="reason" defaultValue="No puedo realizar el servicio"><option>No puedo realizar el servicio</option><option>Vehículo con problemas</option><option>Fuera de mi zona</option><option>No tengo efectivo suficiente</option><option>Otro motivo</option></select></label><label className="driver-form-wide">Detalle (opcional)<textarea name="details" placeholder="Información para operaciones" /></label>{error ? <p className="form-error driver-form-wide">{error}</p> : null}<button className="button button-secondary button-full danger driver-form-wide" type="submit" disabled={saved}>{saved ? "Rechazando…" : "Confirmar rechazo"}</button></form></Sheet>;
}

function CloseShiftSheet({ data, close, saved, error, onSave }: SheetFormProps & { data: DriverBootstrap }) {
  return <Sheet icon={<SignOut size={24} weight="fill" />} title="Finalizar jornada" description="Termina o reporta cualquier pedido activo antes de cerrar." close={close}><form className="driver-fuel-form" action={onSave}><label>Kilometraje final<input name="endOdometer" type="number" min={data.driver.vehicle?.odometer ?? 0} defaultValue={data.driver.vehicle?.odometer ?? 0} required /></label><label>Nivel de tanque final (%)<input name="fuelLevel" type="number" min="0" max="100" defaultValue={data.driver.vehicle?.fuelLevel ?? 0} required /></label><label className="driver-form-wide">Caja a entregar (C$)<input name="closingCash" type="number" min="0" defaultValue="0" required /></label><label className="driver-form-wide">Novedades (opcional)<textarea name="notes" placeholder="Estado del vehículo o novedades" /></label>{error ? <p className="form-error driver-form-wide">{error}</p> : null}<button className="button button-primary button-full driver-form-wide" type="submit" disabled={saved}>{saved ? "Cerrando…" : "Cerrar jornada"}</button></form></Sheet>;
}

function Sheet({ icon, title, description, close, children }: { icon: React.ReactNode; title: string; description: string; close: () => void; children: React.ReactNode }) {
  return <dialog open className="driver-sheet-backdrop" aria-labelledby="driver-sheet-title" onCancel={(event) => { event.preventDefault(); close(); }}><section className="driver-sheet"><button type="button" className="sheet-close" onClick={close} aria-label="Cerrar"><X size={23} /></button><span className="auth-icon">{icon}</span><h2 id="driver-sheet-title">{title}</h2><p>{description}</p>{children}</section></dialog>;
}

function serviceLabel(service: OperationalOrder["serviceType"]) { return service === "delivery" ? "Delivery" : service === "errand" ? "Compra y entrega" : "Envío de paquete"; }
function gpsLabel(status: GpsStatus) { return status === "active" ? "GPS activo" : status === "requesting" ? "Solicitando GPS…" : status === "denied" ? "GPS bloqueado" : "GPS inactivo"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

function DriverStyles() {
  return <style jsx global>{`
    .driver-v2 dialog.driver-sheet-backdrop{width:100%;height:100%;max-width:none;max-height:none;margin:0;border:0}
    .driver-v2 .driver-topbar strong{display:flex;align-items:baseline;gap:5px}.driver-v2 .driver-topbar strong small{color:#9ed9b8;font-size:10px}.driver-shift-card-v2{display:grid;gap:12px}.driver-shift-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.driver-shift-stats span{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px 5px;padding:8px;background:#ffffff17;border-radius:9px}.driver-shift-stats svg{grid-row:1/3;color:#8fe0b2}.driver-shift-stats b{color:#fff;font-size:11px}.driver-shift-stats small{font-size:8px}.driver-empty-state{display:grid;justify-items:center;padding:28px 18px;text-align:center;background:#fff;border:1px solid #e1e7e3;border-radius:18px}.driver-empty-state h1{margin:5px 0 8px;font-size:24px}.driver-empty-state>p:not(.driver-kicker){color:#65748a;font-size:13px;line-height:1.55}.driver-empty-state .button{margin-top:20px}.driver-hero-icon{display:grid;place-items:center;width:66px;height:66px;margin-bottom:12px;color:#07894d;background:#e4f7eb;border-radius:20px}.driver-kicker{color:#07894d;font-size:10px;font-weight:900;letter-spacing:.1em}.driver-stage-banner{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:14px;color:#0b5d3d;background:#e8f7ed;border-radius:15px}.driver-stage-banner div{display:grid;gap:2px}.driver-stage-banner strong{color:#0b1f35;font-size:15px}.driver-stage-banner small{font-size:10px}.driver-route-card{padding:9px;overflow:hidden}.driver-route-card .driver-map{height:245px;border-radius:12px}.driver-gps-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.driver-link-button{display:flex;align-items:center;gap:5px;padding:7px 9px;color:#087a46;background:#fff;border:1px solid #9ac9af;border-radius:8px;font-size:10px;font-weight:850}.driver-order-details{display:grid;margin:14px 0}.driver-order-details div{display:grid;grid-template-columns:26px 1fr;gap:7px;padding:9px 0;border-bottom:1px solid #edf1ee}.driver-order-details dd{display:grid;gap:2px;margin:0}.driver-order-details small{color:#7a8798;font-size:9px}.driver-order-details strong{font-size:12px}.driver-callout,.driver-maintenance-note{display:flex;align-items:center;gap:10px;margin-top:13px;padding:13px;color:#0c633f;background:#eaf8ef;border-radius:12px}.driver-callout span,.driver-maintenance-note span{display:grid}.driver-callout small,.driver-maintenance-note small{font-size:10px}.driver-stacked-actions{display:grid;gap:10px;margin-top:15px}.driver-stacked-actions .button{min-height:49px}.driver-order-summary{margin-top:12px}.driver-summary-lines{display:grid;margin-top:12px;border-top:1px solid #edf1ee}.driver-summary-lines span{display:grid;grid-template-columns:22px 1fr auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid #edf1ee}.driver-summary-lines svg{color:#07894d}.driver-summary-lines b,.driver-summary-lines strong{font-size:10px}.driver-phone-action{margin-top:10px;text-decoration:none}.driver-purchase-form{display:grid;gap:14px;margin-top:14px;padding:16px;background:#fff;border:1px solid #e1e7e3;border-radius:18px}.driver-purchase-form fieldset{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0;padding:0;border:0}.driver-purchase-form legend{grid-column:1/-1;margin-bottom:7px;font-size:13px;font-weight:850}.driver-choice-tile{display:flex!important;align-items:center;justify-content:center;gap:7px;min-height:48px;border:1px solid #d9e1dc;border-radius:10px;font-size:11px!important}.driver-choice-tile input{position:absolute;opacity:0}.driver-choice-tile.selected{color:#087a46;background:#effaf3;border-color:#16a05c}.driver-choice-tile.unavailable{color:#c43d3d;background:#fff4f4;border-color:#e56b6b}.driver-purchase-form>label{display:grid;gap:7px;font-size:11px;font-weight:800}.driver-purchase-form textarea,.driver-fuel-form textarea{min-height:80px;padding:10px;resize:vertical;border:1px solid #d8e0e9;border-radius:9px;font:inherit}.driver-money-input{display:grid;grid-template-columns:42px 1fr;align-items:center;border:1px solid #d8e0e9;border-radius:9px}.driver-money-input b{padding-left:12px}.driver-money-input input{height:46px;border:0;font-size:20px;font-weight:850}.driver-activity-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:14px}.driver-activity-metrics span{display:grid;gap:4px;padding:14px;background:#fff;border:1px solid #e1e7e3;border-radius:12px}.driver-activity-metrics small{font-size:9px}.driver-activity-metrics strong{font-size:18px}.driver-profile-card-v2{grid-template-columns:auto 1fr;justify-items:start;align-items:center;gap:13px;text-align:left}.driver-profile-card-v2 h1{margin:0}.driver-profile-card-v2 div{display:grid;gap:5px}.location-denied{color:#c23b3b}.location-denied i{background:#c23b3b}@media(min-width:700px){.driver-v2{margin-block:18px;min-height:calc(100vh - 36px);border-radius:24px;overflow:hidden}.driver-v2 .driver-bottom-nav{bottom:18px;border-radius:0 0 24px 24px}}
  `}</style>;
}
