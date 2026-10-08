"use client";

import { Avatar, Badge } from "@/components/ui";
import type { OperationalMaintenance, OperationalVehicle } from "@/lib/operations/types";
import { CheckCircle, GasPump, Gauge, Plus, Warning, Wrench, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const vehicleStatus: Record<OperationalVehicle["status"], { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  active: { label: "Activo", tone: "green" },
  in_maintenance: { label: "En mantenimiento", tone: "amber" },
  damaged: { label: "Dañado", tone: "red" },
  inactive: { label: "Inactivo", tone: "neutral" },
};

export function VehicleManager({ vehicles, maintenanceRecords }: { vehicles: OperationalVehicle[]; maintenanceRecords: OperationalMaintenance[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string | null>(null);
  const [readingVehicleId, setReadingVehicleId] = useState<string | null>(null);

  async function request(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { message?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar los cambios.");
    return payload;
  }

  async function saveVehicle(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const payload = await request("/api/admin/vehicles", "POST", {
        code: String(formData.get("code") ?? "") || undefined,
        plate: String(formData.get("plate") ?? ""),
        make: String(formData.get("make") ?? ""),
        model: String(formData.get("model") ?? ""),
        modelYear: Number(formData.get("modelYear")),
        vehicleType: String(formData.get("vehicleType") ?? "motorcycle"),
        color: String(formData.get("color") ?? "") || undefined,
        fuelType: String(formData.get("fuelType") ?? "gasolina_regular"),
        odometer: Number(formData.get("odometer")),
        fuelLevel: Number(formData.get("fuelLevel")),
        circulationNumber: String(formData.get("circulationNumber") ?? "") || undefined,
        insurancePolicy: String(formData.get("insurancePolicy") ?? "") || undefined,
        insuranceExpiresAt: String(formData.get("insuranceExpiresAt") ?? "") || undefined,
      });
      setShowForm(false);
      setNotice(payload.message ?? "Vehículo registrado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible registrar el vehículo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReading(formData: FormData) {
    if (!readingVehicleId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await request("/api/admin/vehicles", "PATCH", {
        action: "reading",
        vehicleId: readingVehicleId,
        odometer: Number(formData.get("odometer")),
        fuelLevel: Number(formData.get("fuelLevel")),
      });
      setReadingVehicleId(null);
      setNotice(payload.message ?? "Lectura actualizada.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar la lectura.");
    } finally {
      setSaving(false);
    }
  }

  async function changeVehicleStatus(vehicle: OperationalVehicle) {
    setSaving(true);
    setError(null);
    try {
      const target = vehicle.status === "active" ? "damaged" : "active";
      const payload = await request("/api/admin/vehicles", "PATCH", { action: "status", vehicleId: vehicle.id, status: target });
      setNotice(payload.message ?? "Estado actualizado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar el estado.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMaintenance(formData: FormData) {
    const vehicle = vehicles.find((item) => item.id === maintenanceVehicleId);
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    const inProgress = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "in_progress");
    const planned = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "planned");
    try {
      const payload = await request(`/api/admin/vehicles/${vehicle.id}/maintenance`, "POST", inProgress ? {
        action: "complete",
        recordId: inProgress.id,
        odometer: Number(formData.get("odometer")),
        cost: Number(formData.get("cost")),
        supplier: String(formData.get("supplier") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      } : {
        action: formData.get("startNow") === "on" ? "start" : "schedule",
        recordId: planned?.id,
        kind: String(formData.get("kind") ?? "Cambio de aceite"),
        dueAtKm: Number(formData.get("dueAtKm")),
        dueDate: String(formData.get("dueDate") ?? "") || null,
        supplier: String(formData.get("supplier") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      });
      setMaintenanceVehicleId(null);
      setNotice(payload.message ?? "Mantenimiento actualizado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar el mantenimiento.");
    } finally {
      setSaving(false);
    }
  }

  const readingVehicle = vehicles.find((vehicle) => vehicle.id === readingVehicleId);
  const maintenanceVehicle = vehicles.find((vehicle) => vehicle.id === maintenanceVehicleId);

  return <>
    <button className="button button-primary" onClick={() => { setShowForm(true); setError(null); }} type="button"><Plus size={18} weight="bold" /> Agregar vehículo</button>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !showForm && !readingVehicleId && !maintenanceVehicleId ? <p className="form-error driver-notice" role="alert">{error}</p> : null}
    {showForm ? <VehicleForm saving={saving} error={error} onClose={() => { setShowForm(false); setError(null); }} onSave={saveVehicle} /> : null}
    <div className="vehicle-grid">
      {vehicles.length ? vehicles.map((vehicle) => {
        const remaining = vehicle.nextMaintenanceAt === null ? null : vehicle.nextMaintenanceAt - vehicle.odometer;
        const overdue = remaining !== null && remaining <= 0;
        const warning = remaining !== null && remaining > 0 && remaining <= 500;
        const state = vehicleStatus[vehicle.status];
        const inProgress = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "in_progress");
        const planned = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "planned");
        return <article className="vehicle-card" key={vehicle.id}><div className="vehicle-card-top"><span className="vehicle-icon"><Wrench size={22} weight="bold" /></span><Badge tone={overdue && vehicle.status === "active" ? "red" : state.tone}>{overdue && vehicle.status === "active" ? "Salida bloqueada" : state.label}</Badge></div><div className="vehicle-name"><h3>{vehicle.code}</h3><p>{vehicle.label}</p><span>{vehicle.plate}</span></div><div className="vehicle-specs"><div><span>Kilometraje</span><strong>{vehicle.odometer.toLocaleString("es-NI")} km</strong></div><div><span>Nivel de tanque</span><strong>{vehicle.fuelLevel}%</strong></div></div><div className="fuel-meter"><i style={{ width: `${vehicle.fuelLevel}%` }} /></div><div className="maintenance-block"><span>{inProgress ? "Mantenimiento en curso" : planned ? planned.kind : "Próximo mantenimiento"}</span><strong>{remaining === null ? "Sin programación" : overdue ? "Mantenimiento requerido" : warning ? `Alerta: faltan ${remaining.toLocaleString("es-NI")} km` : `Faltan ${remaining.toLocaleString("es-NI")} km`}</strong>{overdue ? <small>Debe completarse antes de la siguiente salida.</small> : null}</div><div className="vehicle-driver">{vehicle.activeDriverName ? <><Avatar initials={vehicle.activeDriverName.split(" ").map((word) => word[0]).join("").slice(0, 2)} tone="blue" /><span><small>Jornada activa</small><strong>{vehicle.activeDriverName}</strong></span></> : <span className="muted">Disponible para asignar</span>}</div><div className="drivers-command-bar"><button type="button" className="button button-secondary" onClick={() => { setReadingVehicleId(vehicle.id); setError(null); }}><Gauge size={17} /> Actualizar lectura</button><button type="button" className="button button-secondary" onClick={() => { setMaintenanceVehicleId(vehicle.id); setError(null); }}><Wrench size={17} /> {inProgress ? "Finalizar" : "Mantenimiento"}</button></div><button type="button" className={vehicle.status === "active" ? "table-action" : "button button-secondary button-full"} disabled={saving || vehicle.status === "in_maintenance"} onClick={() => changeVehicleStatus(vehicle)}>{vehicle.status === "active" ? "Reportar vehículo dañado" : vehicle.status === "damaged" || vehicle.status === "inactive" ? "Reactivar vehículo" : "En mantenimiento"}</button></article>;
      }) : <div className="empty-state"><span className="empty-orb" /><h3>Tu flota está vacía</h3><p>Registra la primera moto o vehículo para habilitar jornadas de motorizados.</p></div>}
    </div>
    {readingVehicle ? <ReadingDialog vehicle={readingVehicle} saving={saving} error={error} onClose={() => { setReadingVehicleId(null); setError(null); }} onSave={saveReading} /> : null}
    {maintenanceVehicle ? <MaintenanceDialog vehicle={maintenanceVehicle} inProgress={maintenanceRecords.find((record) => record.vehicleId === maintenanceVehicle.id && record.status === "in_progress") ?? null} planned={maintenanceRecords.find((record) => record.vehicleId === maintenanceVehicle.id && record.status === "planned") ?? null} saving={saving} error={error} onClose={() => { setMaintenanceVehicleId(null); setError(null); }} onSave={saveMaintenance} /> : null}
  </>;
}

function VehicleForm({ saving, error, onClose, onSave }: { saving: boolean; error: string | null; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card driver-modal" open aria-labelledby="vehicle-modal-title"><div className="modal-heading"><div><p>FLOTA</p><h2 id="vehicle-modal-title">Agregar vehículo</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} /></button></div><p className="modal-intro">Registra los datos, la lectura inicial y los documentos de control. El primer cambio de aceite se programará automáticamente a 1,500 km.</p><form className="modal-form" action={onSave}><div className="form-grid"><label>Tipo de vehículo<select name="vehicleType" defaultValue="motorcycle"><option value="motorcycle">Motocicleta</option><option value="car">Automóvil</option><option value="van">Camioneta</option><option value="bicycle">Bicicleta</option></select></label><label>Código interno<input name="code" placeholder="MOTO-007 (automático)" /></label><label>Placa<input name="plate" placeholder="M-12345" required /></label><label>Marca<input name="make" placeholder="Yamaha" required /></label><label>Modelo<input name="model" placeholder="FZ 150" required /></label><label>Año<input name="modelYear" type="number" min="1990" max="2100" placeholder="2025" required /></label><label>Color<input name="color" placeholder="Negro" /></label><label>Tipo de combustible<select name="fuelType" defaultValue="gasolina_regular"><option value="gasolina_regular">Gasolina regular</option><option value="gasolina_super">Gasolina súper</option><option value="electrico">Eléctrico</option></select></label><label>Kilometraje inicial<input name="odometer" type="number" min="0" placeholder="0" required /></label><label>Nivel de tanque (%)<input name="fuelLevel" type="number" min="0" max="100" placeholder="0" required /></label><label>Número de circulación<input name="circulationNumber" placeholder="Opcional" /></label><label>Póliza de seguro<input name="insurancePolicy" placeholder="Opcional" /></label><label>Vencimiento del seguro<input name="insuranceExpiresAt" type="date" /></label></div><div className="invite-preview"><Wrench size={20} weight="fill" /><span><strong>Plan preventivo automático</strong><small>El sistema alertará 500 km antes y bloqueará la salida al alcanzar los 1,500 km.</small></span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Guardando vehículo…" : "Guardar vehículo"}</button></form></dialog></div>;
}

function ReadingDialog({ vehicle, saving, error, onClose, onSave }: { vehicle: OperationalVehicle; saving: boolean; error: string | null; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  const remaining = vehicle.nextMaintenanceAt === null ? null : vehicle.nextMaintenanceAt - vehicle.odometer;
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card" open aria-labelledby="reading-title"><div className="modal-heading"><div><p>LECTURA DE VEHÍCULO</p><h2 id="reading-title">{vehicle.code}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} /></button></div><form className="modal-form" action={onSave}><div className="form-grid"><label>Kilometraje actual<input name="odometer" type="number" min={vehicle.odometer} defaultValue={vehicle.odometer} required /></label><label>Nivel de tanque (%)<input name="fuelLevel" type="number" min="0" max="100" defaultValue={vehicle.fuelLevel} required /></label></div>{remaining !== null && remaining <= 500 ? <p className={remaining <= 0 ? "form-error" : "form-notice"}><Warning size={17} weight="fill" /> {remaining <= 0 ? "La salida está bloqueada hasta completar mantenimiento." : `Faltan ${remaining.toLocaleString("es-NI")} km para mantenimiento.`}</p> : <p className="form-help"><GasPump size={17} /> Registra la lectura real del odómetro y el indicador del tanque.</p>}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Actualizando…" : "Guardar lectura"}</button></form></dialog></div>;
}

function MaintenanceDialog({ vehicle, inProgress, planned, saving, error, onClose, onSave }: { vehicle: OperationalVehicle; inProgress: OperationalMaintenance | null; planned: OperationalMaintenance | null; saving: boolean; error: string | null; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  const dueAt = planned?.dueAtKm ?? vehicle.nextMaintenanceAt ?? vehicle.odometer + 1500;
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card" open aria-labelledby="maintenance-modal-title"><div className="modal-heading"><div><p>MANTENIMIENTO</p><h2 id="maintenance-modal-title">{inProgress ? "Finalizar mantenimiento" : `Plan de ${vehicle.code}`}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} /></button></div><form className="modal-form" action={onSave}>{inProgress ? <div className="form-grid"><label>Kilometraje al finalizar<input name="odometer" type="number" min={vehicle.odometer} defaultValue={vehicle.odometer} required /></label><label>Costo (C$)<input name="cost" type="number" min="0" step="0.01" defaultValue="0" required /></label><label>Proveedor / taller<input name="supplier" defaultValue={inProgress.supplier ?? ""} /></label><label className="driver-form-wide">Trabajo realizado<textarea name="notes" defaultValue={inProgress.notes ?? ""} /></label></div> : <div className="form-grid"><label>Trabajo<select name="kind" defaultValue={planned?.kind ?? "Cambio de aceite"}><option>Cambio de aceite</option><option>Mantenimiento preventivo</option><option>Revisión de frenos</option><option>Cambio de llantas</option><option>Reparación general</option></select></label><label>Kilometraje programado<input name="dueAtKm" type="number" min={vehicle.odometer} defaultValue={dueAt} required /></label><label>Fecha programada<input name="dueDate" type="date" defaultValue={planned?.dueDate ?? ""} /></label><label>Proveedor / taller<input name="supplier" defaultValue={planned?.supplier ?? ""} /></label><label className="driver-form-wide">Notas<textarea name="notes" placeholder="Detalle del mantenimiento" defaultValue={planned?.notes ?? ""} /></label><label className="check-label driver-form-wide"><input name="startNow" type="checkbox" /> Iniciar mantenimiento ahora y bloquear el vehículo</label></div>}<div className="invite-preview"><Wrench size={20} weight="fill" /><span><strong>Ciclo de 1,500 km</strong><small>Al completar este trabajo se programará automáticamente el siguiente mantenimiento.</small></span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Guardando…" : inProgress ? "Completar y habilitar vehículo" : planned ? "Actualizar plan" : "Guardar programación"}</button></form></dialog></div>;
}
