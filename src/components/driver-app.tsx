"use client";

import { Badge } from "@/components/ui";
import { GoogleRouteMap } from "@/components/google-route-map";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { currency } from "@/lib/format";
import type { GeoPoint } from "@/lib/geo";
import type { DriverBootstrap, OperationalOrder } from "@/lib/operations/types";
import { Bell, CheckCircle, ClipboardText, GasPump, House, MapPin, Motorcycle, NavigationArrow, Package, Plus, UserCircle, WarningCircle, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DriverTab = "inicio" | "actividad" | "perfil";
type Sheet = "shift" | "fuel" | "incident" | "close" | null;

const statusHeading: Record<Extract<OperationalOrder["status"], "to_merchant" | "picking_up" | "to_customer">, { title: string; action: string; note: string }> = {
  to_merchant: { title: "Rumbo al comercio", action: "Llegué al comercio", note: "Comparte tu ubicación solo durante este pedido." },
  picking_up: { title: "En el comercio", action: "Confirmar compra", note: "Registra la compra antes de salir hacia el cliente." },
  to_customer: { title: "Rumbo al cliente", action: "Validar OTP y entregar", note: "Solicita el código OTP para finalizar la entrega." },
};

export function DriverApp({ data }: { data: DriverBootstrap }) {
  const router = useRouter();
  const [tab, setTab] = useState<DriverTab>("inicio");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPosition, setGpsPosition] = useState<GeoPoint | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"inactive" | "requesting" | "active" | "denied">("inactive");
  const [deviationM, setDeviationM] = useState<number | null>(null);
  const lastLocationSent = useRef(0);
  const activeOrder = data.activeOrder;
  const activeOrderId = activeOrder?.id;

  useEffect(() => {
    if (!activeOrderId || !("geolocation" in navigator)) return;
    const requestingTimer = window.setTimeout(() => setGpsStatus("requesting"), 0);
    const watchId = navigator.geolocation.watchPosition((position) => {
      const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
      setGpsPosition(nextPosition);
      setGpsStatus("active");
      const now = Date.now();
      if (now - lastLocationSent.current < 20_000) return;
      lastLocationSent.current = now;
      void fetch("/api/driver/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrderId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          speedKmh: position.coords.speed ? position.coords.speed * 3.6 : undefined,
          heading: position.coords.heading ?? undefined,
          capturedAt: new Date(position.timestamp).toISOString(),
        }),
      }).then(async (response) => {
        if (!response.ok) {
          setGpsError("No pudimos compartir la ubicación en este momento.");
          return;
        }
        const result = await response.json() as { distanceM?: number | null };
        setDeviationM(result.distanceM ?? null);
      }).catch(() => setGpsError("No hay conexión para compartir ubicación."));
    }, () => { setGpsStatus("denied"); setGpsError("Activa la ubicación para que operaciones pueda seguir el pedido."); }, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    return () => { window.clearTimeout(requestingTimer); navigator.geolocation.clearWatch(watchId); };
  }, [activeOrderId]);

  async function request(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json() as { error?: string; message?: string; status?: string };
    if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar el cambio.");
    return payload;
  }

  async function run(action: () => Promise<{ message?: string; status?: string }>) {
    setWorking(true);
    setError(null);
    try {
      const result = await action();
      setNotice(result.message ?? "Cambio guardado correctamente.");
      setSheet(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible completar la operación.");
    } finally {
      setWorking(false);
    }
  }

  async function acceptOrder() {
    if (!data.pendingOrders[0]) return;
    await run(() => request(`/api/driver/orders/${data.pendingOrders[0].id}/accept`));
  }

  async function advanceOrder() {
    if (!activeOrder) return;
    if (activeOrder.status === "to_customer") {
      await run(() => request(`/api/driver/orders/${activeOrder.id}/complete`, { otp }));
      return;
    }
    await run(() => request(`/api/driver/orders/${activeOrder.id}/progress`, { action: activeOrder.status === "to_merchant" ? "merchant_arrived" : "purchase_completed" }));
  }

  async function startShift(formData: FormData) {
    await run(() => request("/api/driver/shifts", {
      vehicleId: String(formData.get("vehicleId") ?? ""),
      startOdometer: Number(formData.get("startOdometer")),
      fuelLevel: Number(formData.get("fuelLevel")),
      openingCash: Number(formData.get("openingCash")),
    }));
  }

  async function saveFuel(formData: FormData) {
    await run(() => request("/api/driver/fuel", {
      liters: Number(formData.get("liters")),
      amount: Number(formData.get("amount")),
      odometer: Number(formData.get("odometer")),
      fuelLevelAfter: Number(formData.get("fuelLevelAfter")),
      stationName: String(formData.get("stationName") ?? ""),
    }));
  }

  async function reportIncident(formData: FormData) {
    await run(() => request("/api/driver/incidents", {
      orderId: activeOrder?.id,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      priority: String(formData.get("priority") ?? "normal"),
    }));
  }

  async function closeShift(formData: FormData) {
    await run(() => request("/api/driver/shifts/close", {
      endOdometer: Number(formData.get("endOdometer")),
      fuelLevel: Number(formData.get("fuelLevel")),
      closingCash: Number(formData.get("closingCash")),
      notes: String(formData.get("notes") ?? ""),
    }));
  }

  return <main className="driver-app-shell"><header className="driver-topbar"><div><span className="driver-logo"><Motorcycle size={22} weight="fill" /></span><strong>Tudelivery</strong></div><button type="button" aria-label="Notificaciones"><Bell size={21} /><i /></button></header><section className="driver-profile-strip"><div><span className="avatar avatar-blue">{data.driver.initials}</span><span><small>Buen día,</small><strong>{data.driver.name}</strong></span></div><Badge tone={activeOrder ? "green" : data.openShift ? "blue" : "neutral"}>{activeOrder ? "En servicio" : data.openShift ? "Disponible" : "Sin turno"}</Badge></section>{notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}{error && !sheet ? <p className="form-error driver-notice" role="alert">{error}</p> : null}{tab === "inicio" ? <DriverHome data={data} activeOrder={activeOrder} otp={otp} setOtp={setOtp} gpsError={gpsError} gpsPosition={gpsPosition} gpsStatus={gpsStatus} deviationM={deviationM} working={working} onStartShift={() => setSheet("shift")} onFuel={() => setSheet("fuel")} onIncident={() => setSheet("incident")} onAccept={acceptOrder} onAdvance={advanceOrder} /> : tab === "actividad" ? <DriverActivity data={data} /> : <DriverProfile data={data} onFuel={() => setSheet("fuel")} onCloseShift={() => setSheet("close")} setNotice={setNotice} setError={setError} />}<nav className="driver-bottom-nav"><button className={clsx(tab === "inicio" && "active")} type="button" onClick={() => setTab("inicio")}><House size={22} weight={tab === "inicio" ? "fill" : "regular"} /><span>Inicio</span></button><button className={clsx(tab === "actividad" && "active")} type="button" onClick={() => setTab("actividad")}><ClipboardText size={22} weight={tab === "actividad" ? "fill" : "regular"} /><span>Actividad</span></button><button className={clsx(tab === "perfil" && "active")} type="button" onClick={() => setTab("perfil")}><UserCircle size={23} weight={tab === "perfil" ? "fill" : "regular"} /><span>Perfil</span></button></nav>{sheet === "shift" ? <StartShiftSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={startShift} /> : null}{sheet === "fuel" ? <FuelSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={saveFuel} /> : null}{sheet === "incident" ? <IncidentSheet close={() => setSheet(null)} saved={working} error={error} onSave={reportIncident} /> : null}{sheet === "close" ? <CloseShiftSheet data={data} close={() => setSheet(null)} saved={working} error={error} onSave={closeShift} /> : null}</main>;
}

function DriverHome({ data, activeOrder, otp, setOtp, gpsError, gpsPosition, gpsStatus, deviationM, working, onStartShift, onFuel, onIncident, onAccept, onAdvance }: { data: DriverBootstrap; activeOrder: OperationalOrder | null; otp: string; setOtp: (value: string) => void; gpsError: string | null; gpsPosition: GeoPoint | null; gpsStatus: "inactive" | "requesting" | "active" | "denied"; deviationM: number | null; working: boolean; onStartShift: () => void; onFuel: () => void; onIncident: () => void; onAccept: () => Promise<void>; onAdvance: () => Promise<void> }) {
  const vehicle = data.driver.vehicle;
  const pendingOrder = data.pendingOrders[0];
  const action = activeOrder && (activeOrder.status === "to_merchant" || activeOrder.status === "picking_up" || activeOrder.status === "to_customer") ? statusHeading[activeOrder.status] : null;
  const destination = activeOrder && (activeOrder.status === "to_merchant" || activeOrder.status === "picking_up") ? activeOrder.merchantAddress || "Granada, Nicaragua" : activeOrder?.deliveryLatitude !== null && activeOrder?.deliveryLatitude !== undefined && activeOrder.deliveryLongitude !== null && activeOrder.deliveryLongitude !== undefined ? { lat: activeOrder.deliveryLatitude, lng: activeOrder.deliveryLongitude } : activeOrder?.address || "Granada, Nicaragua";
  const origin = activeOrder?.status === "to_customer" ? activeOrder.merchantAddress || "Pollos Asados El Masayita, Granada, Nicaragua" : "Catedral de Granada, Nicaragua";
  const saveRoute = (route: { origin: GeoPoint; destination: GeoPoint; encodedPolyline: string; distanceM: number | null; durationS: number | null }) => {
    if (!activeOrder) return;
    void fetch(`/api/routes/${activeOrder.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(route) });
  };
  return <div className="driver-page"><section className="driver-shift-card"><div><span>Turno actual</span><strong>{data.openShift ? `Activo desde ${new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(data.openShift.startedAt))}` : "Sin turno activo"}</strong><small>{vehicle ? `${vehicle.code} · ${vehicle.label}` : "Inicia tu jornada con un vehículo habilitado."}</small></div><div className="driver-fuel-mini"><GasPump size={19} weight="fill" /><span><strong>{vehicle?.fuelLevel ?? 0}%</strong><small>combustible</small></span></div></section>{!data.openShift ? <section className="driver-section"><div className="driver-section-heading"><div><p>ANTES DE SALIR</p><h1>Inicia tu jornada</h1></div></div><article className="driver-order-card"><h2>Registra tu salida</h2><p>Selecciona la moto, confirma kilometraje, nivel de combustible y fondo de caja antes de recibir pedidos.</p><button className="button button-primary button-full" type="button" onClick={onStartShift} disabled={!data.availableVehicles.length}><Motorcycle size={18} weight="fill" /> {data.availableVehicles.length ? "Iniciar jornada" : "No hay vehículos disponibles"}</button></article></section> : activeOrder && action ? <section className="driver-section"><div className="driver-section-heading"><div><p>SERVICIO EN CURSO</p><h1>{action.title}</h1></div><span className={clsx("location-active", gpsStatus === "denied" && "location-denied")}><i /> {gpsStatus === "active" ? "GPS activo" : gpsStatus === "requesting" ? "Solicitando GPS…" : gpsStatus === "denied" ? "GPS bloqueado" : "GPS inactivo"}</span></div><article className="driver-navigation-card"><GoogleRouteMap className="driver-map" origin={origin} destination={destination} currentPosition={gpsPosition} routeKey={`${activeOrder.id}-${activeOrder.status}`} onRouteReady={saveRoute} /><div className="driver-nav-info"><span>Próxima parada</span><h2>{activeOrder.status === "to_merchant" || activeOrder.status === "picking_up" ? activeOrder.merchantName || "Comercio" : activeOrder.customerName}</h2><p>{activeOrder.status === "to_merchant" || activeOrder.status === "picking_up" ? activeOrder.merchantAddress || "Ubicación del comercio pendiente" : activeOrder.address}</p>{deviationM !== null && deviationM > 500 ? <div className="gps-deviation-warning"><WarningCircle size={16} weight="fill" /> Desvío detectado: {Math.round(deviationM)} m de la ruta</div> : null}<button className="button button-secondary button-full" type="button" onClick={() => navigator.geolocation?.getCurrentPosition(() => undefined)}><NavigationArrow size={18} weight="fill" /> Abrir navegación</button></div></article>{activeOrder.status === "to_customer" ? <div className="otp-card"><span>OTP requerido</span><strong>Solicita el código al administrador antes de finalizar.</strong><label className="sr-only" htmlFor="delivery-otp">Código OTP de seis dígitos</label><input id="delivery-otp" aria-label="Código OTP de seis dígitos" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Ingresa código de 6 dígitos" /></div> : null}{gpsError ? <p className="form-error">{gpsError}</p> : null}</section> : pendingOrder ? <section className="driver-section"><div className="driver-section-heading"><div><p>NUEVO SERVICIO</p><h1>Pedido por aceptar</h1></div><Badge tone="amber">Prioridad {pendingOrder.priority}</Badge></div><OrderCard order={pendingOrder} /></section> : <section className="driver-section"><div className="driver-section-heading"><div><p>JORNADA ACTIVA</p><h1>Todo listo</h1></div><Badge tone="green">Disponible</Badge></div><article className="driver-order-card"><h2>Esperando asignación</h2><p>Cuando operaciones te asigne un pedido, aparecerá aquí para que lo aceptes desde tu PWA.</p></article></section>}<section className="driver-actions-grid"><button type="button" onClick={onFuel} disabled={!data.openShift}><GasPump size={22} weight="fill" /><span>Registrar<br />combustible</span></button><button type="button" onClick={onIncident} disabled={!data.openShift}><WarningCircle size={22} weight="fill" /><span>Reportar<br />incidencia</span></button></section>{data.openShift && (pendingOrder || action) ? <section className="driver-action-bottom"><p>{pendingOrder ? "Acepta solamente si puedes completar el pedido. Al aceptar se activa el GPS para este servicio." : action?.note}</p><button className="button button-primary button-full" type="button" onClick={() => { void (pendingOrder ? onAccept() : onAdvance()); }} disabled={working || (activeOrder?.status === "to_customer" && otp.length !== 6)}>{working ? "Guardando…" : pendingOrder ? "Aceptar pedido" : action?.action}</button></section> : null}</div>;
}

function OrderCard({ order }: { order: OperationalOrder }) {
  return <article className="driver-order-card"><div className="driver-order-top"><span>{order.number}</span><strong>{currency(order.total)}</strong></div><h2>{order.merchantName || serviceLabel(order.serviceType)}</h2><p><MapPin size={18} weight="fill" /> {order.merchantAddress || order.address}</p><div className="driver-route-steps"><span><i>1</i><div><strong>Recoger pedido</strong><small>{order.merchantName || "Punto de recogida"}</small></div></span><span><i>2</i><div><strong>Entregar a {order.customerName}</strong><small>{order.reference || order.address}</small></div></span></div><div className="driver-cash-line"><span>Cliente paga con</span><strong>{order.paymentMethod === "cash" ? `${order.amountReceived ? currency(order.amountReceived) : "Efectivo"} · Vuelto ${currency(order.changeDue)}` : "Transferencia validada"}</strong></div></article>;
}

function DriverActivity({ data }: { data: DriverBootstrap }) {
  return <div className="driver-page"><div className="driver-section-heading"><div><p>HISTORIAL</p><h1>Actividad reciente</h1></div><Badge tone="green">{data.recentOrders.length} entregas</Badge></div><div className="driver-activity-list">{[...data.recentOrders.map((order) => ({ type: "order" as const, at: order.deliveredAt ?? order.createdAt, order })), ...data.recentFuel.map((fuel) => ({ type: "fuel" as const, at: fuel.recordedAt, fuel }))].sort((left, right) => right.at.localeCompare(left.at)).map((entry) => entry.type === "order" ? <article key={`order-${entry.order.id}`}><span className="activity-icon done"><CheckCircle size={18} weight="fill" /></span><div><strong>{entry.order.number} entregado</strong><small>{entry.order.merchantName || serviceLabel(entry.order.serviceType)} · {new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.at))}</small></div><b>{currency(entry.order.total)}</b></article> : <article key={`fuel-${entry.fuel.id}`}><span className="activity-icon fuel"><GasPump size={18} weight="fill" /></span><div><strong>Combustible registrado</strong><small>{entry.fuel.liters} L · Odómetro {entry.fuel.odometer.toLocaleString("es-NI")} km</small></div><b>{currency(entry.fuel.amount)}</b></article>)}{!data.recentOrders.length && !data.recentFuel.length ? <div className="empty-table">Tu actividad aparecerá aquí al completar pedidos o registrar combustible.</div> : null}</div></div>;
}

function DriverProfile({ data, onFuel, onCloseShift, setNotice, setError }: { data: DriverBootstrap; onFuel: () => void; onCloseShift: () => void; setNotice: (notice: string | null) => void; setError: (error: string | null) => void }) {
  const vehicle = data.driver.vehicle;
  async function savePassword(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) { setError(error.message); return; }
    setError(null);
    setNotice("Clave de acceso actualizada.");
  }
  return <div className="driver-page"><div className="driver-profile-card"><span className="avatar avatar-blue profile-avatar">{data.driver.initials}</span><h1>{data.driver.name}</h1><p>Motorizado · {data.companyName}</p><Badge tone="green">Cuenta activa</Badge></div><section className="driver-profile-section"><h2>Mi vehículo actual</h2>{vehicle ? <article><Motorcycle size={24} weight="fill" /><div><strong>{vehicle.label} · {vehicle.code}</strong><small>Placa {vehicle.plate} · {vehicle.odometer.toLocaleString("es-NI")} km</small></div><span>{vehicle.fuelLevel}%</span></article> : <p className="muted">Inicia una jornada para seleccionar vehículo.</p>}</section><section className="driver-profile-section"><h2>Mi jornada</h2>{data.openShift ? <><article><Package size={24} weight="fill" /><div><strong>Caja inicial: {currency(data.openShift.openingCash)}</strong><small>Registra compras, cobros y vuelto por pedido.</small></div></article><button className="button button-secondary button-full" type="button" onClick={onFuel}><Plus size={18} /> Registrar carga de combustible</button><button className="button button-secondary button-full danger" type="button" onClick={onCloseShift}>Cerrar jornada</button></> : <p className="muted">No hay una jornada abierta.</p>}</section><section className="driver-profile-section"><h2>Seguridad</h2><form className="modal-form" action={savePassword}><label>Definir o actualizar contraseña<input name="password" type="password" minLength={8} placeholder="Mínimo 8 caracteres" required /></label><button className="button button-secondary button-full" type="submit">Guardar clave de acceso</button></form></section></div>;
}

function StartShiftSheet({ data, close, saved, error, onSave }: { data: DriverBootstrap; close: () => void; saved: boolean; error: string | null; onSave: (data: FormData) => Promise<void> }) {
  const first = data.availableVehicles[0];
  return <Sheet title="Iniciar jornada" description="Confirma vehículo, kilometraje, combustible y fondo para vueltas." close={close}><form className="driver-fuel-form" action={onSave}><label>Vehículo<select name="vehicleId" defaultValue={first?.id}>{data.availableVehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.code} · {vehicle.label}</option>)}</select></label><label>Kilometraje inicial<input name="startOdometer" type="number" min={first?.odometer ?? 0} defaultValue={first?.odometer ?? 0} required /></label><label>Nivel de tanque<input name="fuelLevel" type="number" min="0" max="100" defaultValue={first?.fuelLevel ?? 0} required /></label><label>Fondo para vueltas (C$)<input name="openingCash" type="number" min="0" defaultValue="0" required /></label>{error ? <p className="form-error">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saved}> {saved ? "Iniciando…" : "Iniciar jornada"}</button></form></Sheet>;
}

function FuelSheet({ data, close, saved, error, onSave }: { data: DriverBootstrap; close: () => void; saved: boolean; error: string | null; onSave: (data: FormData) => Promise<void> }) {
  return <Sheet title="Registrar combustible" description="Guarda el odómetro para calcular consumo y costo por kilómetro." close={close}><form className="driver-fuel-form" action={onSave}><label>Litros<input name="liters" type="number" step="0.1" min="0.1" placeholder="0.0" required /></label><label>Monto pagado (C$)<input name="amount" type="number" min="0" placeholder="0" required /></label><label>Kilometraje actual<input name="odometer" type="number" min={data.driver.vehicle?.odometer ?? 0} defaultValue={data.driver.vehicle?.odometer ?? 0} required /></label><label>Nivel de tanque después<input name="fuelLevelAfter" type="number" min="0" max="100" defaultValue={data.driver.vehicle?.fuelLevel ?? 0} required /></label><label>Gasolinera (opcional)<input name="stationName" placeholder="Ej. UNO Granada" /></label>{error ? <p className="form-error">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saved}>{saved ? "Guardando…" : "Guardar registro"}</button></form></Sheet>;
}

function IncidentSheet({ close, saved, error, onSave }: { close: () => void; saved: boolean; error: string | null; onSave: (data: FormData) => Promise<void> }) {
  return <Sheet title="Reportar incidencia" description="Operaciones recibirá tu reporte para orientarte o autorizar una anulación." close={close}><form className="driver-fuel-form" action={onSave}><label>Motivo<select name="title" defaultValue="Cliente no responde"><option>Cliente no responde</option><option>No encuentro el destino</option><option>Lluvia</option><option>Vehículo averiado</option><option>Otra incidencia</option></select></label><label>Prioridad<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label><label className="driver-form-wide">Detalle<textarea name="description" placeholder="Explica qué ocurre y qué necesitas de operaciones." required /></label>{error ? <p className="form-error">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saved}>{saved ? "Enviando…" : "Enviar incidencia"}</button></form></Sheet>;
}

function CloseShiftSheet({ data, close, saved, error, onSave }: { data: DriverBootstrap; close: () => void; saved: boolean; error: string | null; onSave: (data: FormData) => Promise<void> }) {
  return <Sheet title="Cerrar jornada" description="No puedes cerrar si tienes un pedido activo. Registra los valores finales para cerrar la flota y caja." close={close}><form className="driver-fuel-form" action={onSave}><label>Kilometraje final<input name="endOdometer" type="number" min={data.driver.vehicle?.odometer ?? 0} defaultValue={data.driver.vehicle?.odometer ?? 0} required /></label><label>Nivel de tanque final<input name="fuelLevel" type="number" min="0" max="100" defaultValue={data.driver.vehicle?.fuelLevel ?? 0} required /></label><label>Caja a entregar (C$)<input name="closingCash" type="number" min="0" defaultValue="0" required /></label><label className="driver-form-wide">Notas<input name="notes" placeholder="Novedades de la jornada (opcional)" /></label>{error ? <p className="form-error">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saved}>{saved ? "Cerrando…" : "Cerrar jornada"}</button></form></Sheet>;
}

function Sheet({ title, description, close, children }: { title: string; description: string; close: () => void; children: React.ReactNode }) {
  return <div className="driver-sheet-backdrop"><section className="driver-sheet"><button type="button" className="sheet-close" onClick={close} aria-label="Cerrar"><X size={23} /></button><span className="auth-icon"><GasPump size={24} weight="fill" /></span><h2>{title}</h2><p>{description}</p>{children}</section></div>;
}

function serviceLabel(service: OperationalOrder["serviceType"]) {
  return service === "delivery" ? "Delivery" : service === "errand" ? "Mandado / compra" : "Paquete";
}
