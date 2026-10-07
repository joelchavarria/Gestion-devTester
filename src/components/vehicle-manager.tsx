"use client";

import { Avatar, Badge } from "@/components/ui";
import type { OperationalMaintenance, OperationalVehicle } from "@/lib/operations/types";
import { CheckCircle, Plus, Wrench, X } from "@phosphor-icons/react";
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

  async function saveVehicle(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: String(formData.get("code") ?? "") || undefined,
          plate: String(formData.get("plate") ?? ""),
          make: String(formData.get("make") ?? ""),
          model: String(formData.get("model") ?? ""),
          modelYear: Number(formData.get("modelYear")),
          fuelType: String(formData.get("fuelType") ?? "gasolina_regular"),
          odometer: Number(formData.get("odometer")),
          fuelLevel: Number(formData.get("fuelLevel")),
        }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible registrar el vehículo.");
      setShowForm(false);
      setNotice(payload.message ?? "Vehículo registrado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible registrar el vehículo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMaintenance(formData: FormData) {
    const vehicle = vehicles.find((item) => item.id === maintenanceVehicleId);
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    const latest = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "in_progress");
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicle.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest ? {
          action: "complete", recordId: latest.id, odometer: Number(formData.get("odometer")), cost: Number(formData.get("cost")), supplier: String(formData.get("supplier") ?? "") || null, notes: String(formData.get("notes") ?? "") || null,
        } : {
          action: formData.get("startNow") === "on" ? "start" : "schedule", kind: String(formData.get("kind") ?? "Cambio de aceite"), dueAtKm: Number(formData.get("dueAtKm")), dueDate: String(formData.get("dueDate") ?? "") || null, supplier: String(formData.get("supplier") ?? "") || null, notes: String(formData.get("notes") ?? "") || null,
        }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar el mantenimiento.");
      setMaintenanceVehicleId(null);
      setNotice(payload.message ?? "Mantenimiento actualizado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar el mantenimiento.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button className="button button-primary" onClick={() => setShowForm(true)} type="button"><Plus size={18} weight="bold" /> Agregar vehículo</button>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {showForm ? <div className="modal-backdrop" role="presentation"><dialog className="modal-card" open aria-labelledby="vehicle-modal-title"><div className="modal-heading"><div><p>FLOTA</p><h2 id="vehicle-modal-title">Registrar vehículo</h2></div><button className="modal-close" onClick={() => { setShowForm(false); setError(null); }} type="button" aria-label="Cerrar"><X size={17} /></button></div><form className="modal-form" action={saveVehicle}><div className="form-grid"><label>Código interno<input name="code" placeholder="MOTO-007 (opcional)" /></label><label>Placa<input name="plate" placeholder="GR 00000" required /></label><label>Marca<input name="make" placeholder="Honda" required /></label><label>Modelo<input name="model" placeholder="CB125F" required /></label><label>Año<input name="modelYear" type="number" min="1990" max="2100" placeholder="2025" required /></label><label>Tipo de combustible<select name="fuelType" defaultValue="gasolina_regular"><option value="gasolina_regular">Gasolina regular</option><option value="gasolina_super">Gasolina súper</option><option value="electrico">Eléctrico</option></select></label><label>Kilometraje actual<input name="odometer" type="number" min="0" placeholder="0" required /></label><label>Nivel de combustible<input name="fuelLevel" type="number" min="0" max="100" placeholder="0" required /></label></div><p className="form-help">El siguiente mantenimiento se calculará automáticamente usando la regla de kilometraje de tu empresa. El vehículo solo puede tener una jornada abierta a la vez.</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar vehículo"}</button></form></dialog></div> : null}
    <div className="vehicle-grid">
      {vehicles.length ? vehicles.map((vehicle) => {
        const remaining = vehicle.nextMaintenanceAt === null ? null : vehicle.nextMaintenanceAt - vehicle.odometer;
        const state = vehicleStatus[vehicle.status];
        const inProgress = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "in_progress");
        const planned = maintenanceRecords.find((record) => record.vehicleId === vehicle.id && record.status === "planned");
        return <article className="vehicle-card" key={vehicle.id}><div className="vehicle-card-top"><span className="vehicle-icon"><Wrench size={22} weight="bold" /></span><Badge tone={state.tone}>{state.label}</Badge></div><div className="vehicle-name"><h3>{vehicle.code}</h3><p>{vehicle.label}</p><span>{vehicle.plate}</span></div><div className="vehicle-specs"><div><span>Kilometraje</span><strong>{vehicle.odometer.toLocaleString("es-NI")} km</strong></div><div><span>Combustible</span><strong>{vehicle.fuelLevel}%</strong></div></div><div className="fuel-meter"><i style={{ width: `${vehicle.fuelLevel}%` }} /></div><div className="maintenance-block"><span>{inProgress ? "Mantenimiento en curso" : planned ? `Programado: ${planned.kind}` : "Próximo mantenimiento"}</span><strong>{remaining === null ? "Sin programación" : remaining <= 0 ? "Requiere atención" : remaining <= 500 ? `Atención en ${remaining.toLocaleString("es-NI")} km` : `en ${remaining.toLocaleString("es-NI")} km`}</strong></div><div className="vehicle-driver">{vehicle.activeDriverName ? <><Avatar initials={vehicle.activeDriverName.split(" ").map((word) => word[0]).join("").slice(0, 2)} tone="blue" /><span><small>Conductor actual</small><strong>{vehicle.activeDriverName}</strong></span></> : <span className="muted">Sin jornada activa</span>}</div><button type="button" className="button button-secondary button-full" onClick={() => { setMaintenanceVehicleId(vehicle.id); setError(null); }}>{inProgress ? "Finalizar mantenimiento" : "Programar mantenimiento"}</button></article>;
      }) : <div className="empty-state"><span className="empty-orb" /><h3>Tu flota está vacía</h3><p>Registra la primera moto o vehículo para habilitar jornadas de motorizados.</p></div>}
    </div>
    {maintenanceVehicleId ? <MaintenanceDialog vehicle={vehicles.find((vehicle) => vehicle.id === maintenanceVehicleId)!} record={maintenanceRecords.find((record) => record.vehicleId === maintenanceVehicleId && record.status === "in_progress") ?? null} saving={saving} error={error} onClose={() => { setMaintenanceVehicleId(null); setError(null); }} onSave={saveMaintenance} /> : null}
  </>;
}

function MaintenanceDialog({ vehicle, record, saving, error, onClose, onSave }: { vehicle: OperationalVehicle; record: OperationalMaintenance | null; saving: boolean; error: string | null; onClose: () => void; onSave: (data: FormData) => Promise<void> }) {
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card" open aria-labelledby="maintenance-modal-title"><div className="modal-heading"><div><p>MANTENIMIENTO</p><h2 id="maintenance-modal-title">{record ? "Finalizar mantenimiento" : `Programar · ${vehicle.code}`}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} /></button></div><form className="modal-form" action={onSave}>{record ? <div className="form-grid"><label>Kilometraje al finalizar<input name="odometer" type="number" min={vehicle.odometer} defaultValue={vehicle.odometer} required /></label><label>Costo (C$)<input name="cost" type="number" min="0" defaultValue="0" required /></label><label>Proveedor / taller<input name="supplier" defaultValue={record.supplier ?? ""} /></label><label className="driver-form-wide">Notas<textarea name="notes" defaultValue={record.notes ?? ""} /></label></div> : <div className="form-grid"><label>Trabajo<select name="kind" defaultValue="Cambio de aceite"><option>Cambio de aceite</option><option>Mantenimiento preventivo</option><option>Revisión de frenos</option><option>Cambio de llantas</option><option>Reparación general</option></select></label><label>Kilometraje programado<input name="dueAtKm" type="number" min={vehicle.odometer} defaultValue={vehicle.nextMaintenanceAt ?? vehicle.odometer} required /></label><label>Fecha programada<input name="dueDate" type="date" /></label><label>Proveedor / taller<input name="supplier" /></label><label className="driver-form-wide">Notas<textarea name="notes" placeholder="Detalle del mantenimiento" /></label><label className="check-label driver-form-wide"><input name="startNow" type="checkbox" /> Marcar vehículo como en mantenimiento ahora</label></div>}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Guardando…" : record ? "Completar mantenimiento" : "Guardar programación"}</button></form></dialog></div>;
}
