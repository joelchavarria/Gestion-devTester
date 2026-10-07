"use client";

import { Avatar, Badge } from "@/components/ui";
import type { OperationalDriver } from "@/lib/operations/types";
import { CalendarCheck, CheckCircle, EnvelopeSimple, GasPump, Plus, UserPlus, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormMode = "register" | "invite" | null;

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
          licenseNumber: String(formData.get("licenseNumber") ?? ""),
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

  return <>
    <section className="drivers-command-bar panel">
      <div><span>OPERACIÓN DE EQUIPO</span><strong>Alta segura de motorizados</strong><small>Cada motorizado recibe su propia invitación y nunca usa la cuenta de administración.</small></div>
      <div><button className="button button-secondary" type="button" onClick={() => setMode("invite")}><EnvelopeSimple size={18} /> Enviar invitación</button><button className="button button-primary" type="button" onClick={() => setMode("register")}><Plus size={18} weight="bold" /> Registrar motorizado</button></div>
    </section>
    {notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !mode ? <p className="form-error driver-notice" role="alert">{error}</p> : null}
    <section className="driver-summary-grid"><article className="summary-card"><span>Disponibles</span><strong>{available}</strong><small>Con turno y vehículo habilitado</small></article><article className="summary-card"><span>En servicio</span><strong>{busy}</strong><small>Con un pedido en curso</small></article><article className="summary-card"><span>Turnos activos</span><strong>{openShifts}</strong><small>Incluye apertura de caja</small></article><article className="summary-card summary-warning"><span>Mantenimiento</span><strong>{blocked}</strong><small>No pueden recibir pedidos</small></article></section>
    <section className="panel"><div className="panel-heading"><div><h2>Equipo operativo</h2><p>Un vehículo por motorizado durante la jornada.</p></div><button className="button button-secondary button-small" type="button"><CalendarCheck size={17} /> Turnos en tiempo real</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Motorizado</th><th>Estado</th><th>Vehículo</th><th>Combustible</th><th>Kilometraje</th><th>Entregas</th><th /></tr></thead><tbody>{drivers.length ? drivers.map((driver) => {
      const state = statusCopy[driver.status];
      return <tr key={driver.id}><td><div className="table-person"><Avatar initials={driver.initials} tone={driver.status === "maintenance" ? "pink" : "mint"} /><span><strong>{driver.name}</strong><small>{driver.phone}</small></span></div></td><td><Badge tone={state.tone}>{state.label}</Badge></td><td>{driver.vehicle ? <><strong>{driver.vehicle.label}</strong><small>{driver.vehicle.plate}</small></> : <span className="muted">Sin vehículo</span>}</td><td>{driver.vehicle ? <span className="fuel-inline"><GasPump size={17} /> {driver.vehicle.fuelLevel}%</span> : <span className="muted">—</span>}</td><td>{driver.vehicle ? `${driver.vehicle.odometer.toLocaleString("es-NI")} km` : "—"}</td><td>{driver.deliveriesToday}</td><td><button className="table-action" type="button">Ver perfil</button></td></tr>;
    }) : <tr><td colSpan={7}><div className="empty-table">Aún no hay motorizados. Registra el primero para enviarle una invitación a la PWA.</div></td></tr>}</tbody></table></div></section>
    {mode ? <DriverForm mode={mode} saving={saving} error={error} onClose={() => { setMode(null); setError(null); }} onSave={saveDriver} /> : null}
  </>;
}

function DriverForm({ mode, onClose, onSave, saving, error }: { mode: Exclude<FormMode, null>; onClose: () => void; onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }) {
  const resend = mode === "invite";
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card driver-modal" open aria-labelledby="driver-modal-title"><div className="modal-heading"><div><p>ACCESO PWA</p><h2 id="driver-modal-title">{resend ? "Enviar invitación a PWA" : "Registrar motorizado"}</h2></div><button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar"><X size={17} weight="bold" /></button></div><p className="modal-intro">El acceso es personal y protegido. El motorizado recibirá un enlace para crear su acceso y entrar solamente a la PWA.</p><form className="modal-form" action={onSave}><div className="form-grid"><label>Nombre completo<input name="fullName" placeholder="Ej. Marcos Pérez" required /></label><label>Teléfono WhatsApp<input name="phone" type="tel" placeholder="+505 8888 0000" required /></label><label>Correo de invitación<input name="email" type="email" placeholder="motorizado@correo.com" autoComplete="email" required /></label><label>Número de licencia<input name="licenseNumber" placeholder="N° de licencia" required /></label></div><div className="invite-preview"><UserPlus size={20} weight="fill" /><span><strong>Invitación protegida</strong><small>El enlace es individual y queda vinculado al perfil del motorizado.</small></span></div><p className="form-help">La jornada, vehículo, kilometraje, combustible y fondo de caja se registran desde la PWA al iniciar el día.</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Enviando invitación…" : resend ? "Enviar invitación" : "Registrar e invitar"}</button></form></dialog></div>;
}
