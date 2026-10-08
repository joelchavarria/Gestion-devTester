"use client";

import { PwaInstallCard } from "@/components/pwa-install-card";
import { Avatar, Badge } from "@/components/ui";
import type { OperationalDriver } from "@/lib/operations/types";
import { CalendarCheck, CheckCircle, EnvelopeSimple, GasPump, Gauge, Plus, SignIn, SignOut, UserPlus, Warning, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormMode = "register" | "invite" | null;
type OperationMode = "start" | "fuel" | "close";
type AdminVehicle = {
  id: string;
  code: string;
  plate: string;
  label: string;
  odometer: number;
  fuelLevel: number;
  status: "active" | "in_maintenance" | "damaged" | "inactive";
  nextMaintenanceAt: number | null;
  remainingKm: number | null;
  occupied: boolean;
};

const statusCopy: Record<OperationalDriver["status"], { label: string; tone: "green" | "blue" | "amber" | "red" | "neutral" }> = {
  available: { label: "Disponible", tone: "green" },
  busy: { label: "En servicio", tone: "blue" },
  off_shift: { label: "Sin turno", tone: "neutral" },
  maintenance: { label: "Mantenimiento", tone: "amber" },
  pending: { label: "Invitación pendiente", tone: "amber" },
};

export function DriverManager({ drivers }: { drivers: OperationalDriver[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(null);
  const [selectedDriver, setSelectedDriver] = useState<OperationalDriver | null>(null);
  const [operationMode, setOperationMode] = useState<OperationMode>("start");
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const available = drivers.filter((driver) => driver.status === "available").length;
  const busy = drivers.filter((driver) => driver.status === "busy").length;
  const openShifts = drivers.filter((driver) => driver.activeShift).length;
  const blocked = drivers.filter((driver) => driver.status === "maintenance").length;

  async function saveDriver(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          identityDocument: String(formData.get("identityDocument") ?? "") || undefined,
          licenseNumber: String(formData.get("licenseNumber") ?? ""),
          emergencyContact: String(formData.get("emergencyContact") ?? "") || undefined,
        }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible crear la invitación.");
      setNotice(payload.message ?? "Invitación enviada al motorizado.");
      setMode(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible registrar al motorizado.");
    } finally {
      setSaving(false);
    }
  }

  async function openDriver(driver: OperationalDriver) {
    setSelectedDriver(driver);
    setOperationMode(driver.activeShift ? "fuel" : "start");
    setError(null);
    setLoadingVehicles(true);
    try {
      const response = await fetch("/api/admin/vehicles", { cache: "no-store" });
      const payload = await response.json() as { vehicles?: AdminVehicle[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible consultar la flota.");
      const fleet = payload.vehicles ?? [];
      setVehicles(fleet);
      const firstAvailable = fleet.find((vehicle) => vehicle.status === "active" && !vehicle.occupied && (vehicle.remainingKm === null || vehicle.remainingKm > 0));
      setSelectedVehicleId(firstAvailable?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar la flota.");
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function saveOperation(formData: FormData) {
    if (!selectedDriver) return;
    setSaving(true);
    setError(null);
    const action = operationMode === "start" ? "start_shift" : operationMode === "fuel" ? "fuel" : "close_shift";
    const body = action === "start_shift"
      ? {
          action,
          vehicleId: String(formData.get("vehicleId") ?? ""),
          startOdometer: Number(formData.get("startOdometer")),
          fuelLevel: Number(formData.get("fuelLevel")),
          openingCash: Number(formData.get("openingCash")),
        }
      : action === "fuel"
        ? {
            action,
            liters: Number(formData.get("liters")),
            amount: Number(formData.get("amount")),
            odometer: Number(formData.get("odometer")),
            fuelLevelAfter: Number(formData.get("fuelLevelAfter")),
            stationName: String(formData.get("stationName") ?? "") || undefined,
          }
        : {
            action,
            endOdometer: Number(formData.get("endOdometer")),
            fuelLevel: Number(formData.get("fuelLevel")),
            closingCash: Number(formData.get("closingCash")),
            notes: String(formData.get("notes") ?? "") || undefined,
          };
    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriver.id}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible registrar la operación.");
      setNotice(payload.message ?? "Operación registrada.");
      setSelectedDriver(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible registrar la operación.");
    } finally {
      setSaving(false);
    }
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  return <>
    <PwaInstallCard />
    <section className="drivers-command-bar panel">
      <div><span>OPERACIÓN DE EQUIPO</span><strong>Alta y control diario de motorizados</strong><small>Invitación individual, salida, combustible, kilometraje y regreso en un mismo flujo.</small></div>
      <div><button className="button button-secondary" type="button" onClick={() => setMode("invite")}><EnvelopeSimple size={18} /> Enviar invitación</button><button className="button button-primary" type="button" onClick={() => setMode("register")}><Plus size={18} weight="bold" /> Registrar motorizado</button></div>
    </section>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !mode && !selectedDriver ? <p className="form-error driver-notice" role="alert">{error}</p> : null}
    <section className="driver-summary-grid"><article className="summary-card"><span>Disponibles</span><strong>{available}</strong><small>Con turno y vehículo habilitado</small></article><article className="summary-card"><span>En servicio</span><strong>{busy}</strong><small>Con un pedido en curso</small></article><article className="summary-card"><span>Turnos activos</span><strong>{openShifts}</strong><small>Con kilometraje y tanque registrados</small></article><article className="summary-card summary-warning"><span>Salida bloqueada</span><strong>{blocked}</strong><small>Requieren mantenimiento</small></article></section>
    <section className="panel"><div className="panel-heading"><div><h2>Equipo operativo</h2><p>Un vehículo por motorizado durante la jornada.</p></div><span className="button button-secondary button-small"><CalendarCheck size={17} /> {openShifts} jornadas abiertas</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Motorizado</th><th>Estado</th><th>Vehículo</th><th>Tanque</th><th>Kilometraje</th><th>Entregas</th><th /></tr></thead><tbody>{drivers.length ? drivers.map((driver) => {
      const state = statusCopy[driver.status];
      return <tr key={driver.id}><td><div className="table-person"><Avatar initials={driver.initials} tone={driver.status === "maintenance" ? "pink" : "mint"} /><span><strong>{driver.name}</strong><small>{driver.phone}</small></span></div></td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{driver.vehicle ? <><strong>{driver.vehicle.label}</strong><small>{driver.vehicle.plate}</small></> : <span className="muted">Sin vehículo</span>}</td><td>{driver.vehicle ? <span className="fuel-inline"><GasPump size={17} /> {driver.vehicle.fuelLevel}%</span> : <span className="muted">—</span>}</td><td>{driver.vehicle ? `${driver.vehicle.odometer.toLocaleString("es-NI")} km` : "—"}</td><td>{driver.deliveriesToday}</td><td><button className="table-action" type="button" disabled={driver.inviteStatus === "pending"} onClick={() => openDriver(driver)}>{driver.inviteStatus === "pending" ? "Esperando activación" : driver.activeShift ? "Gestionar jornada" : "Registrar salida"}</button></td></tr>;
    }) : <tr><td colSpan={7}><div className="empty-table">Aún no hay motorizados. Registra el primero para enviarle una invitación a la PWA.</div></td></tr>}</tbody></table></div></section>
    {mode ? <DriverForm mode={mode} saving={saving} error={error} onClose={() => { setMode(null); setError(null); }} onSave={saveDriver} /> : null}
    {selectedDriver ? <DriverOperationsDialog driver={selectedDriver} mode={operationMode} setMode={setOperationMode} vehicles={vehicles} selectedVehicle={selectedVehicle} selectedVehicleId={selectedVehicleId} setSelectedVehicleId={setSelectedVehicleId} loadingVehicles={loadingVehicles} saving={saving} error={error} onClose={() => { setSelectedDriver(null); setError(null); }} onSave={saveOperation} /> : null}
  </>;
}

function DriverForm({ mode, onClose, onSave, saving, error }: { mode: Exclude<FormMode, null>; onClose: () => void; onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }) {
  const resend = mode === "invite";
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card driver-modal" open aria-labelledby="driver-modal-title"><div className="modal-heading"><div><p>ACCESO PWA</p><h2 id="driver-modal-title">{resend ? "Invitar motorizado" : "Registrar motorizado"}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} weight="bold" /></button></div><p className="modal-intro">Crea un perfil independiente. El motorizado recibirá un enlace seguro para activar su cuenta y entrar solamente a la PWA.</p><form className="modal-form" action={onSave}><div className="form-grid"><label>Nombre completo<input name="fullName" placeholder="Ej. Luis Rodríguez" autoComplete="name" required /></label><label>Teléfono WhatsApp<input name="phone" type="tel" placeholder="+505 8888 0000" autoComplete="tel" required /></label><label>Correo de invitación<input name="email" type="email" placeholder="motorizado@correo.com" autoComplete="email" required /></label><label>Documento de identidad<input name="identityDocument" placeholder="001-000000-0000A" /></label><label>Número de licencia<input name="licenseNumber" placeholder="N° de licencia" required /></label><label>Contacto de emergencia<input name="emergencyContact" type="tel" placeholder="+505 7777 0000" /></label></div><div className="invite-preview"><UserPlus size={20} weight="fill" /><span><strong>Invitación personal</strong><small>La cuenta queda vinculada al negocio, nunca a las credenciales del administrador.</small></span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Creando acceso…" : "Crear e invitar motorizado"}</button></form></dialog></div>;
}

function DriverOperationsDialog({ driver, mode, setMode, vehicles, selectedVehicle, selectedVehicleId, setSelectedVehicleId, loadingVehicles, saving, error, onClose, onSave }: {
  driver: OperationalDriver;
  mode: OperationMode;
  setMode: (mode: OperationMode) => void;
  vehicles: AdminVehicle[];
  selectedVehicle: AdminVehicle | undefined;
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
  loadingVehicles: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  const currentVehicle = driver.vehicle;
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card driver-modal" open aria-labelledby="driver-operation-title"><div className="modal-heading"><div><p>JORNADA DEL MOTORIZADO</p><h2 id="driver-operation-title">{driver.name}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} weight="bold" /></button></div>
    <div className="invite-preview"><Avatar initials={driver.initials} tone="mint" /><span><strong>{statusCopy[driver.status].label}</strong><small>{driver.phone} · Licencia {driver.licenseNumber || "sin registrar"}</small></span></div>
    {driver.activeShift ? <div className="drivers-command-bar"><button className={`button ${mode === "fuel" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setMode("fuel")}><GasPump size={18} /> Registrar combustible</button><button className={`button ${mode === "close" ? "button-primary" : "button-secondary"}`} type="button" onClick={() => setMode("close")}><SignOut size={18} /> Registrar regreso</button></div> : null}
    <form className="modal-form" action={onSave}>
      {mode === "start" ? <><div className="form-grid"><label className="driver-form-wide">Vehículo<select name="vehicleId" value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)} required disabled={loadingVehicles}><option value="">{loadingVehicles ? "Consultando flota…" : "Selecciona un vehículo"}</option>{vehicles.map((vehicle) => {
        const blocked = vehicle.status !== "active" || vehicle.occupied || (vehicle.remainingKm !== null && vehicle.remainingKm <= 0);
        const reason = vehicle.occupied ? " · en otra jornada" : vehicle.status !== "active" ? " · no operativo" : vehicle.remainingKm !== null && vehicle.remainingKm <= 0 ? " · mantenimiento vencido" : "";
        return <option key={vehicle.id} value={vehicle.id} disabled={blocked}>{vehicle.code} · {vehicle.label} · {vehicle.plate}{reason}</option>;
      })}</select></label><label>Kilometraje de salida<input name="startOdometer" type="number" min={selectedVehicle?.odometer ?? 0} defaultValue={selectedVehicle?.odometer ?? ""} key={`odometer-${selectedVehicleId}`} required /></label><label>Nivel de tanque (%)<input name="fuelLevel" type="number" min="0" max="100" defaultValue={selectedVehicle?.fuelLevel ?? ""} key={`fuel-${selectedVehicleId}`} required /></label><label>Fondo de caja (C$)<input name="openingCash" type="number" min="0" step="0.01" defaultValue="0" required /></label></div>{selectedVehicle && selectedVehicle.remainingKm !== null && selectedVehicle.remainingKm <= 500 ? <p className={selectedVehicle.remainingKm <= 0 ? "form-error" : "form-notice"}><Warning size={17} weight="fill" /> {selectedVehicle.remainingKm <= 0 ? "Salida bloqueada: mantenimiento vencido." : `Alerta: faltan ${selectedVehicle.remainingKm.toLocaleString("es-NI")} km para mantenimiento.`}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving || !selectedVehicleId}><SignIn size={18} /> {saving ? "Registrando salida…" : "Registrar salida e iniciar jornada"}</button></> : null}
      {mode === "fuel" ? <><div className="form-grid"><label>Vehículo<input value={currentVehicle ? `${currentVehicle.label} · ${currentVehicle.plate}` : "Sin vehículo"} readOnly /></label><label>Kilometraje al cargar<input name="odometer" type="number" min={currentVehicle?.odometer ?? driver.activeShift?.startOdometer ?? 0} defaultValue={currentVehicle?.odometer ?? ""} required /></label><label>Litros cargados<input name="liters" type="number" min="0.01" max="200" step="0.001" placeholder="0.00" required /></label><label>Monto pagado (C$)<input name="amount" type="number" min="0" step="0.01" placeholder="0.00" required /></label><label>Tanque después de cargar (%)<input name="fuelLevelAfter" type="number" min="0" max="100" defaultValue={currentVehicle?.fuelLevel ?? ""} required /></label><label>Gasolinera<input name="stationName" placeholder="Nombre opcional" /></label></div><p className="form-help">Con litros, monto y kilometraje el sistema podrá calcular rendimiento y costo por kilómetro.</p><button className="button button-primary button-full" type="submit" disabled={saving}><GasPump size={18} /> {saving ? "Registrando carga…" : "Guardar carga de combustible"}</button></> : null}
      {mode === "close" ? <><div className="form-grid"><label>Kilometraje de regreso<input name="endOdometer" type="number" min={currentVehicle?.odometer ?? driver.activeShift?.startOdometer ?? 0} defaultValue={currentVehicle?.odometer ?? ""} required /></label><label>Nivel de tanque al regresar (%)<input name="fuelLevel" type="number" min="0" max="100" defaultValue={currentVehicle?.fuelLevel ?? ""} required /></label><label>Cierre de caja (C$)<input name="closingCash" type="number" min="0" step="0.01" defaultValue="0" required /></label><label className="driver-form-wide">Observaciones<textarea name="notes" placeholder="Novedades de la jornada" /></label></div>{currentVehicle && currentVehicle.nextMaintenanceAt !== null ? <p className={currentVehicle.nextMaintenanceAt - currentVehicle.odometer <= 500 ? "form-notice" : "form-help"}><Gauge size={17} /> Próximo mantenimiento en {Math.max(0, currentVehicle.nextMaintenanceAt - currentVehicle.odometer).toLocaleString("es-NI")} km. Si el regreso alcanza el límite, la siguiente salida quedará bloqueada.</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}><SignOut size={18} /> {saving ? "Cerrando jornada…" : "Registrar regreso y cerrar jornada"}</button></> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  </dialog></div>;
}
