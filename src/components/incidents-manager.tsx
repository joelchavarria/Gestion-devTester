"use client";

import { Badge, EmptyState } from "@/components/ui";
import type { OperationalIncident } from "@/lib/operations/types";
import { CheckCircle, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const incidentTone: Record<OperationalIncident["status"], "amber" | "blue" | "green"> = { open: "amber", in_review: "blue", resolved: "green" };
const incidentLabel: Record<OperationalIncident["status"], string> = { open: "Abierta", in_review: "En revisión", resolved: "Resuelta" };
const priorityLabel: Record<OperationalIncident["priority"], string> = { low: "Baja", normal: "Normal", medium: "Media", high: "Alta", critical: "Crítica" };

type StatusFilter = "all" | OperationalIncident["status"];
type PriorityFilter = "all" | OperationalIncident["priority"];

export function IncidentsManager({ incidents }: { incidents: OperationalIncident[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(incidents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [note, setNote] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [newPriority, setNewPriority] = useState<OperationalIncident["priority"]>("normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleIncidents = useMemo(() => incidents.filter((incident) => {
    const searchCopy = [incident.number, incident.title, incident.orderNumber, incident.driverName, incident.description].filter(Boolean).join(" ").toLocaleLowerCase("es");
    const matchesQuery = !normalizedQuery || searchCopy.includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || incident.priority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  }), [incidents, normalizedQuery, priorityFilter, statusFilter]);
  const selected = visibleIncidents.find((incident) => incident.id === selectedId) ?? visibleIncidents[0];
  const open = incidents.filter((incident) => incident.status === "open").length;
  const urgent = incidents.filter((incident) => incident.priority === "high" || incident.priority === "critical").length;
  const reviewing = incidents.filter((incident) => incident.status === "in_review").length;
  const resolved = incidents.filter((incident) => incident.status === "resolved").length;

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  async function createIncident() {
    clearMessages();
    if (newTitle.trim().length < 3 || newDescription.trim().length < 4) {
      setError("Escribe un título y una descripción clara para crear la incidencia.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription, orderNumber: newOrderNumber || undefined, priority: newPriority }),
      });
      const payload = await response.json() as { id?: string; message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible crear la incidencia.");
      if (payload.id) setSelectedId(payload.id);
      setNewTitle("");
      setNewDescription("");
      setNewOrderNumber("");
      setNewPriority("normal");
      setShowCreate(false);
      setNotice(payload.message ?? "Incidencia creada.");
      setStatusFilter("all");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear la incidencia.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: "open" | "in_review") {
    if (!selected) return;
    setSaving(true);
    clearMessages();
    try {
      const response = await fetch(`/api/admin/incidents/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible actualizar la incidencia.");
      setNotice(payload.message ?? "Incidencia actualizada.");
      setNote("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar la incidencia.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveIncident() {
    if (!selected) return;
    if (note.trim().length < 3) {
      setError("Describe cómo se resolvió la incidencia.");
      return;
    }
    setSaving(true);
    clearMessages();
    try {
      const response = await fetch(`/api/admin/incidents/${selected.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: note }),
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible resolver la incidencia.");
      setNotice(payload.message ?? "Incidencia resuelta.");
      setNote("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible resolver la incidencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-actions" style={{ marginBottom: 18 }}>
        <button type="button" className="button button-primary" onClick={() => { setShowCreate((current) => !current); clearMessages(); }}>
          {showCreate ? <X size={18} /> : <Plus size={18} />} {showCreate ? "Cerrar formulario" : "Nueva incidencia"}
        </button>
      </div>

      {showCreate ? (
        <section className="panel" style={{ marginBottom: 18, padding: 22 }} aria-label="Crear incidencia">
          <div className="panel-heading" style={{ padding: 0, marginBottom: 16 }}>
            <div><h2>Nueva incidencia</h2><p>Registra un problema operativo para darle seguimiento.</p></div>
          </div>
          <div className="form-grid">
            <label>Título<input value={newTitle} maxLength={160} onChange={(event) => setNewTitle(event.target.value)} placeholder="Ej. Dirección incorrecta" /></label>
            <label>Pedido (opcional)<input value={newOrderNumber} maxLength={80} onChange={(event) => setNewOrderNumber(event.target.value)} placeholder="Ej. DEL-20261006-A7K2" /></label>
            <label>Prioridad<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as OperationalIncident["priority"])}>{Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label style={{ gridColumn: "1 / -1" }}>Descripción<textarea value={newDescription} maxLength={2000} onChange={(event) => setNewDescription(event.target.value)} placeholder="Describe qué ocurrió y qué necesita atención." style={{ minHeight: 90 }} /></label>
          </div>
          <div className="page-actions" style={{ marginTop: 16 }}>
            <button type="button" className="button button-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancelar</button>
            <button type="button" className="button button-primary" onClick={() => { void createIncident(); }} disabled={saving}>{saving ? "Creando…" : "Crear incidencia"}</button>
          </div>
        </section>
      ) : null}

      <section className="incident-stats">
        <article><span>Abiertas</span><strong>{open}</strong></article>
        <article className="urgent"><span>Urgentes</span><strong>{urgent}</strong></article>
        <article className="review"><span>En revisión</span><strong>{reviewing}</strong></article>
        <article className="resolved"><span>Resueltas</span><strong>{resolved}</strong></article>
      </section>

      {notice ? <p className="form-notice driver-notice" role="status"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <section className="incidents-layout">
        <article className="panel incident-list-panel">
          <div className="incidents-tabs" aria-label="Estado de incidencias">
            {([
              ["all", "Todas", incidents.length],
              ["open", "Abiertas", open],
              ["in_review", "En revisión", reviewing],
              ["resolved", "Resueltas", resolved],
            ] as const).map(([value, label, count]) => (
              <button key={value} className={`tab ${statusFilter === value ? "active" : ""}`} type="button" aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setSelectedId(""); clearMessages(); }}>
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="toolbar">
            <label className="search-field">
              <span className="sr-only">Buscar incidencias</span><MagnifyingGlass size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ID, pedido, título o motorizado" />
            </label>
            <select className="button button-secondary button-small" aria-label="Filtrar por prioridad" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
              <option value="all">Todas las prioridades</option>{Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="incident-list">
            {visibleIncidents.map((incident) => (
              <button type="button" className={`incident-row ${incident.id === selected?.id ? "selected" : ""}`} onClick={() => { setSelectedId(incident.id); setNote(""); clearMessages(); }} key={incident.id}>
                <span className={`priority-dot priority-${incident.priority === "high" || incident.priority === "critical" ? "alta" : incident.priority === "medium" ? "media" : "normal"}`} />
                <span><strong>{incident.title}</strong><small>{incident.number} · {incident.orderNumber ?? "Sin pedido"}</small><small>{incident.driverName ?? "Sin motorizado asignado"}</small></span>
                <div><Badge tone={incidentTone[incident.status]}>{incidentLabel[incident.status]}</Badge><time>{new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(incident.createdAt))}</time></div>
              </button>
            ))}
            {!visibleIncidents.length ? <div className="empty-table">No hay incidencias que coincidan con los filtros.</div> : null}
          </div>
        </article>

        {selected ? (
          <aside className="panel incident-detail">
            <div className="incident-detail-title">
              <div><span className="eyebrow">{selected.number}</span><h2>{selected.title}</h2></div>
              <div><Badge tone={incidentTone[selected.status]}>{incidentLabel[selected.status]}</Badge><Badge tone={selected.priority === "high" || selected.priority === "critical" ? "red" : "amber"}>{priorityLabel[selected.priority]}</Badge></div>
            </div>
            <div className="incident-meta">
              <div><span>Pedido</span><strong>{selected.orderNumber ?? "No asociado"}</strong></div>
              <div><span>Motorizado</span><strong>{selected.driverName ?? "No asignado"}</strong></div>
              <div><span>Reportada</span><strong>{new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(selected.createdAt))}</strong></div>
            </div>
            <div className="incident-description"><h3>Descripción</h3><p>{selected.description ?? "Sin detalle adicional."}</p></div>
            <div className="activity-timeline">
              <h3>Historial de actividad</h3>
              <div><i className="timeline-dot active" /><span><strong>Incidencia reportada</strong><small>Enviada desde la operación o la PWA del motorizado.</small></span></div>
              {selected.status === "in_review" ? <div><i className="timeline-dot active" /><span><strong>En revisión</strong><small>Operaciones está dando seguimiento.</small></span></div> : null}
              {selected.resolution ? <div><i className="timeline-dot active" /><span><strong>Resolución registrada</strong><small>{selected.resolution}</small></span></div> : null}
            </div>
            {selected.status !== "resolved" ? (
              <>
                <label className="detail-note">Nota / resolución<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Agrega una nota o describe cómo se resolvió" /></label>
                <div className="incident-actions">
                  <button className="button button-secondary" type="button" disabled={saving} onClick={() => { void changeStatus(selected.status === "in_review" ? "open" : "in_review"); }}>
                    {saving ? "Actualizando…" : selected.status === "in_review" ? "Reabrir" : "Pasar a revisión"}
                  </button>
                  <button className="button button-primary" type="button" disabled={saving || note.trim().length < 3} onClick={() => { void resolveIncident(); }}>
                    <CheckCircle size={17} weight="fill" /> {saving ? "Resolviendo…" : "Resolver incidencia"}
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        ) : (
          <aside className="panel incident-detail"><EmptyState title="Sin resultados" detail="Ajusta los filtros o crea una nueva incidencia." /></aside>
        )}
      </section>
    </>
  );
}
