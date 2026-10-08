"use client";

import { PwaInstallCard } from "@/components/pwa-install-card";
import { Avatar, Badge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OperationalDriver } from "@/lib/operations/types";
import { CalendarCheck, CheckCircle, EnvelopeSimple, GasPump, Gauge, Motorcycle, Plus, SignIn, SignOut, UserPlus, Warning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

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
  assignedDriverId: string | null;
  openShiftDriverId: string | null;
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
          vehicleId: String(formData.get("vehicleId") ?? "") || undefined,
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

  async function loadFleet() {
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
      return fleet;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar la flota.");
      return [];
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function openDriver(driver: OperationalDriver) {
    setSelectedDriver(driver);
    setOperationMode(driver.activeShift ? "fuel" : "start");
    const fleet = await loadFleet();
    if (driver.vehicle && !driver.activeShift) {
      const assigned = fleet.find((vehicle) => vehicle.id === driver.vehicle?.id);
      setSelectedVehicleId(assigned?.id ?? "");
    }
  }

  async function openRegister() {
    await loadFleet();
    setMode("register");
  }

  async function openInvite() {
    await loadFleet();
    setMode("invite");
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
      <div><button className="button button-secondary" type="button" onClick={() => { void openInvite(); }}><EnvelopeSimple size={18} /> Enviar invitación</button><button className="button button-primary" type="button" onClick={() => { void openRegister(); }}><Plus size={18} weight="bold" /> Registrar motorizado</button></div>
    </section>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !mode && !selectedDriver ? <p className="form-error driver-notice" role="alert">{error}</p> : null}
    <section className="driver-summary-grid"><article className="summary-card"><span>Disponibles</span><strong>{available}</strong><small>Con turno y vehículo habilitado</small></article><article className="summary-card"><span>En servicio</span><strong>{busy}</strong><small>Con un pedido en curso</small></article><article className="summary-card"><span>Turnos activos</span><strong>{openShifts}</strong><small>Con kilometraje y tanque registrados</small></article><article className="summary-card summary-warning"><span>Salida bloqueada</span><strong>{blocked}</strong><small>Requieren mantenimiento</small></article></section>
    <section className="panel"><div className="panel-heading"><div><h2>Equipo operativo</h2><p>Un vehículo por motorizado durante la jornada.</p></div><span className="button button-secondary button-small"><CalendarCheck size={17} /> {openShifts} jornadas abiertas</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Motorizado</th><th>Estado</th><th>Vehículo</th><th>Tanque</th><th>Kilometraje</th><th>Entregas</th><th /></tr></thead><tbody>{drivers.length ? drivers.map((driver) => {
      const state = statusCopy[driver.status];
      return <tr key={driver.id}><td><div className="table-person"><Avatar initials={driver.initials} tone={driver.status === "maintenance" ? "pink" : "mint"} /><span><strong>{driver.name}</strong><small>{driver.phone}</small></span></div></td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{driver.vehicle ? <><strong>{driver.vehicle.label}</strong><small>{driver.vehicle.plate}</small></> : <span className="muted">Sin vehículo</span>}</td><td>{driver.vehicle ? <span className="fuel-inline"><GasPump size={17} /> {driver.vehicle.fuelLevel}%</span> : <span className="muted">—</span>}</td><td>{driver.vehicle ? `${driver.vehicle.odometer.toLocaleString("es-NI")} km` : "—"}</td><td>{driver.deliveriesToday}</td><td><button className="table-action" type="button" disabled={driver.inviteStatus === "pending"} onClick={() => openDriver(driver)}>{driver.inviteStatus === "pending" ? "Esperando activación" : driver.activeShift ? "Gestionar jornada" : "Registrar salida"}</button></td></tr>;
    }) : <tr><td colSpan={7}><div className="empty-table">Aún no hay motorizados. Registra el primero para enviarle una invitación a la PWA.</div></td></tr>}</tbody></table></div></section>
    {mode ? <DriverForm mode={mode} vehicles={vehicles} loadingVehicles={loadingVehicles} saving={saving} error={error} onClose={() => { setMode(null); setError(null); }} onSave={saveDriver} /> : null}
    {selectedDriver ? <DriverOperationsDialog driver={selectedDriver} mode={operationMode} setMode={setOperationMode} vehicles={vehicles} selectedVehicle={selectedVehicle} selectedVehicleId={selectedVehicleId} setSelectedVehicleId={setSelectedVehicleId} loadingVehicles={loadingVehicles} saving={saving} error={error} onClose={() => { setSelectedDriver(null); setError(null); }} onSave={saveOperation} /> : null}
  </>;
}

function DriverForm({ mode, vehicles, loadingVehicles, onClose, onSave, saving, error }: { mode: Exclude<FormMode, null>; vehicles: AdminVehicle[]; loadingVehicles: boolean; onClose: () => void; onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }) {
  const resend = mode === "invite";
  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === "active" && !vehicle.occupied && (vehicle.remainingKm === null || vehicle.remainingKm > 0));
  const [vehicleId, setVehicleId] = useState(availableVehicles[0]?.id ?? "");
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[min(92vh,780px)] overflow-y-auto border-0 p-0 shadow-2xl sm:max-w-2xl">
      <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
        <p className="text-[11px] font-extrabold tracking-[.14em] text-emerald-700">ACCESO PWA</p>
        <DialogTitle className="text-2xl font-bold tracking-tight text-slate-950">{resend ? "Invitar motorizado" : "Registrar motorizado"}</DialogTitle>
        <DialogDescription>Crea su acceso personal y reserva el vehículo que usará. El conductor no podrá cambiarlo ni escoger una unidad asignada a otra persona.</DialogDescription>
      </DialogHeader>
      <form action={onSave} className="grid gap-5 px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo"><Input className="h-10" name="fullName" placeholder="Ej. Luis Rodríguez" autoComplete="name" required /></Field>
          <Field label="Teléfono WhatsApp"><Input className="h-10" name="phone" type="tel" placeholder="+505 8888 0000" autoComplete="tel" required /></Field>
          <Field label="Correo de invitación"><Input className="h-10" name="email" type="email" placeholder="motorizado@correo.com" autoComplete="email" required /></Field>
          <Field label="Documento de identidad"><Input className="h-10" name="identityDocument" placeholder="001-000000-0000A" /></Field>
          <Field label="Número de licencia"><Input className="h-10" name="licenseNumber" placeholder="N° de licencia" required /></Field>
          <Field label="Contacto de emergencia"><Input className="h-10" name="emergencyContact" type="tel" placeholder="+505 7777 0000" /></Field>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="mb-3 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Motorcycle size={20} weight="fill" /></span><div><strong className="block text-sm text-slate-950">Vehículo reservado</strong><small>Solo aparecen unidades operativas y sin otro motorizado asignado.</small></div></div>
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <Select value={vehicleId} onValueChange={(value) => setVehicleId(value ?? "")} disabled={loadingVehicles || !availableVehicles.length}>
            <SelectTrigger className="h-11 w-full bg-white"><SelectValue placeholder={loadingVehicles ? "Consultando flota…" : "Selecciona un vehículo"} /></SelectTrigger>
            <SelectContent>{availableVehicles.map((vehicle) => <SelectItem value={vehicle.id} key={vehicle.id}>{vehicle.code} · {vehicle.label} · {vehicle.plate}</SelectItem>)}</SelectContent>
          </Select>
          {!loadingVehicles && !availableVehicles.length ? <p className="mt-2 text-xs font-medium text-amber-700">No hay vehículos libres. Registra una unidad o libera la asignación actual.</p> : null}
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600"><UserPlus className="mt-0.5 shrink-0 text-emerald-700" size={19} weight="fill" /><p className="text-xs leading-5"><strong className="block text-slate-900">Invitación personal y segura</strong>La cuenta queda vinculada al negocio, nunca a las credenciales del administrador.</p></div>
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p> : null}
        <DialogFooter className="mx-0 mb-0 -mt-1 bg-transparent px-0 pb-0">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancelar</Button>
          <Button className="bg-emerald-700 px-5 hover:bg-emerald-800" size="lg" type="submit" disabled={saving || loadingVehicles || !vehicleId}>{saving ? "Creando acceso…" : "Crear, asignar e invitar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label className="text-xs font-semibold text-slate-700">{label}</Label>{children}</div>;
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
  const assignableVehicles = vehicles.filter((vehicle) => {
    const occupiedByAnother = (vehicle.assignedDriverId !== null && vehicle.assignedDriverId !== driver.id) || (vehicle.openShiftDriverId !== null && vehicle.openShiftDriverId !== driver.id);
    return vehicle.status === "active" && !occupiedByAnother && (vehicle.remainingKm === null || vehicle.remainingKm > 0);
  });

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[min(92vh,760px)] overflow-y-auto border-0 p-0 shadow-2xl sm:max-w-xl">
      <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
        <p className="text-[11px] font-extrabold tracking-[.14em] text-emerald-700">JORNADA DEL MOTORIZADO</p>
        <DialogTitle className="text-2xl font-bold tracking-tight">{driver.name}</DialogTitle>
        <DialogDescription>{driver.phone} · Licencia {driver.licenseNumber || "sin registrar"}</DialogDescription>
      </DialogHeader>

      <div className="mx-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><Avatar initials={driver.initials} tone="mint" /><span><strong className="block text-sm text-slate-950">{statusCopy[driver.status].label}</strong><small>{currentVehicle ? `${currentVehicle.label} · ${currentVehicle.plate}` : "Vehículo pendiente"}</small></span></div>

      {driver.activeShift ? <div className="mx-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><Button className={mode === "fuel" ? "bg-white text-slate-950 shadow-sm hover:bg-white" : "text-slate-500"} variant="ghost" type="button" onClick={() => setMode("fuel")}><GasPump /> Combustible</Button><Button className={mode === "close" ? "bg-white text-slate-950 shadow-sm hover:bg-white" : "text-slate-500"} variant="ghost" type="button" onClick={() => setMode("close")}><SignOut /> Regreso</Button></div> : null}

      <form action={onSave} className="grid gap-5 px-6 pb-6">
        {mode === "start" ? <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Vehículo asignado"><input type="hidden" name="vehicleId" value={selectedVehicleId} /><Select value={selectedVehicleId} onValueChange={(value) => setSelectedVehicleId(value ?? "")} disabled={loadingVehicles || Boolean(driver.vehicle)}><SelectTrigger className="h-10 w-full"><SelectValue placeholder={loadingVehicles ? "Consultando flota…" : "Selecciona un vehículo"} /></SelectTrigger><SelectContent>{assignableVehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.label} · {vehicle.plate}{vehicle.assignedDriverId === driver.id ? " · asignado" : ""}</SelectItem>)}</SelectContent></Select></Field></div>
            <Field label="Kilometraje de salida"><Input name="startOdometer" type="number" min={selectedVehicle?.odometer ?? 0} defaultValue={selectedVehicle?.odometer ?? ""} key={`odometer-${selectedVehicleId}`} required /></Field>
            <Field label="Nivel de tanque (%)"><Input name="fuelLevel" type="number" min="0" max="100" defaultValue={selectedVehicle?.fuelLevel ?? ""} key={`fuel-${selectedVehicleId}`} required /></Field>
            <Field label="Fondo de caja (C$)"><Input name="openingCash" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
          </div>
          {selectedVehicle && selectedVehicle.remainingKm !== null && selectedVehicle.remainingKm <= 500 ? <p className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${selectedVehicle.remainingKm <= 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}><Warning size={17} weight="fill" /> {selectedVehicle.remainingKm <= 0 ? "Salida bloqueada: mantenimiento vencido." : `Faltan ${selectedVehicle.remainingKm.toLocaleString("es-NI")} km para mantenimiento.`}</p> : null}
          <Button className="h-10 w-full bg-emerald-700 hover:bg-emerald-800" type="submit" disabled={saving || !selectedVehicleId}><SignIn /> {saving ? "Registrando salida…" : "Registrar salida e iniciar jornada"}</Button>
        </> : null}

        {mode === "fuel" ? <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vehículo"><Input value={currentVehicle ? `${currentVehicle.label} · ${currentVehicle.plate}` : "Sin vehículo"} readOnly /></Field>
            <Field label="Kilometraje al cargar"><Input name="odometer" type="number" min={currentVehicle?.odometer ?? driver.activeShift?.startOdometer ?? 0} defaultValue={currentVehicle?.odometer ?? ""} required /></Field>
            <Field label="Litros cargados"><Input name="liters" type="number" min="0.01" max="200" step="0.001" placeholder="0.00" required /></Field>
            <Field label="Monto pagado (C$)"><Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" required /></Field>
            <Field label="Tanque después de cargar (%)"><Input name="fuelLevelAfter" type="number" min="0" max="100" defaultValue={currentVehicle?.fuelLevel ?? ""} required /></Field>
            <Field label="Gasolinera"><Input name="stationName" placeholder="Nombre opcional" /></Field>
          </div>
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">Con litros, monto y kilometraje calculamos rendimiento y costo por kilómetro.</p>
          <Button className="h-10 w-full bg-emerald-700 hover:bg-emerald-800" type="submit" disabled={saving}><GasPump /> {saving ? "Registrando carga…" : "Guardar carga de combustible"}</Button>
        </> : null}

        {mode === "close" ? <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kilometraje de regreso"><Input name="endOdometer" type="number" min={currentVehicle?.odometer ?? driver.activeShift?.startOdometer ?? 0} defaultValue={currentVehicle?.odometer ?? ""} required /></Field>
            <Field label="Nivel de tanque al regresar (%)"><Input name="fuelLevel" type="number" min="0" max="100" defaultValue={currentVehicle?.fuelLevel ?? ""} required /></Field>
            <Field label="Cierre de caja (C$)"><Input name="closingCash" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
            <div className="sm:col-span-2"><Field label="Observaciones"><Textarea name="notes" className="min-h-24 resize-none" placeholder="Novedades de la jornada" /></Field></div>
          </div>
          {currentVehicle && currentVehicle.nextMaintenanceAt !== null ? <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"><Gauge className="mt-0.5 shrink-0" size={17} /> Próximo mantenimiento en {Math.max(0, currentVehicle.nextMaintenanceAt - currentVehicle.odometer).toLocaleString("es-NI")} km. Si el regreso alcanza el límite, la siguiente salida quedará bloqueada.</p> : null}
          <Button className="h-10 w-full bg-emerald-700 hover:bg-emerald-800" type="submit" disabled={saving}><SignOut /> {saving ? "Cerrando jornada…" : "Registrar regreso y cerrar jornada"}</Button>
        </> : null}
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p> : null}
      </form>
    </DialogContent>
  </Dialog>;
}
