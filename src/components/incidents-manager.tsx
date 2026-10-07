"use client";

import { Badge, EmptyState } from "@/components/ui";
import type { OperationalIncident } from "@/lib/operations/types";
import { CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const incidentTone: Record<OperationalIncident["status"], "amber" | "blue" | "green"> = { open: "amber", in_review: "blue", resolved: "green" };
const incidentLabel: Record<OperationalIncident["status"], string> = { open: "Abierta", in_review: "En revisión", resolved: "Resuelta" };
const priorityLabel: Record<OperationalIncident["priority"], string> = { low: "Baja", normal: "Normal", medium: "Media", high: "Alta", critical: "Crítica" };

export function IncidentsManager({ incidents }: { incidents: OperationalIncident[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(incidents[0]?.id ?? "");
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0];
  const open = incidents.filter((incident) => incident.status === "open").length;
  const urgent = incidents.filter((incident) => incident.priority === "high" || incident.priority === "critical").length;
  const reviewing = incidents.filter((incident) => incident.status === "in_review").length;
  const resolved = incidents.filter((incident) => incident.status === "resolved").length;

  async function resolveIncident() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/incidents/${selected.id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution }) });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible resolver la incidencia.");
      setNotice(payload.message ?? "Incidencia resuelta.");
      setResolution("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible resolver la incidencia.");
    } finally {
      setSaving(false);
    }
  }

  if (!selected) return <EmptyState title="Sin incidencias" detail="Los reportes de motorizados y las incidencias operativas aparecerán aquí." />;
  return <><section className="incident-stats"><article><span>Abiertas</span><strong>{open}</strong></article><article className="urgent"><span>Urgentes</span><strong>{urgent}</strong></article><article className="review"><span>En revisión</span><strong>{reviewing}</strong></article><article className="resolved"><span>Resueltas</span><strong>{resolved}</strong></article></section>{notice ? <p className="form-notice driver-notice"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}<section className="incidents-layout"><article className="panel incident-list-panel"><div className="incidents-tabs"><button className="tab active" type="button">Todas <span>{incidents.length}</span></button><button className="tab" type="button">Abiertas <span>{open}</span></button><button className="tab" type="button">Resueltas <span>{resolved}</span></button></div><label className="search-field"><MagnifyingGlass size={18} /><input placeholder="Buscar ID, pedido o cliente" /></label><div className="incident-list">{incidents.map((incident) => <button type="button" className={`incident-row ${incident.id === selected.id ? "selected" : ""}`} onClick={() => { setSelectedId(incident.id); setResolution(incident.resolution ?? ""); setError(null); }} key={incident.id}><span className={`priority-dot priority-${incident.priority === "high" || incident.priority === "critical" ? "alta" : incident.priority === "medium" ? "media" : "normal"}`} /><span><strong>{incident.title}</strong><small>{incident.number} · {incident.orderNumber ?? "Sin pedido"}</small><small>{incident.driverName ?? "Sin motorizado asignado"}</small></span><div><Badge tone={incidentTone[incident.status]}>{incidentLabel[incident.status]}</Badge><time>{new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(incident.createdAt))}</time></div></button>)}</div></article><aside className="panel incident-detail"><div className="incident-detail-title"><div><span className="eyebrow">{selected.number}</span><h2>{selected.title}</h2></div><div><Badge tone={incidentTone[selected.status]}>{incidentLabel[selected.status]}</Badge><Badge tone={selected.priority === "high" || selected.priority === "critical" ? "red" : "amber"}>{priorityLabel[selected.priority]}</Badge></div></div><div className="incident-meta"><div><span>Pedido</span><strong>{selected.orderNumber ?? "No asociado"}</strong></div><div><span>Motorizado</span><strong>{selected.driverName ?? "No asignado"}</strong></div><div><span>Reportada</span><strong>{new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(selected.createdAt))}</strong></div></div><div className="incident-description"><h3>Descripción</h3><p>{selected.description ?? "Sin detalle adicional."}</p></div><div className="activity-timeline"><h3>Historial de actividad</h3><div><i className="timeline-dot active" /><span><strong>Incidencia reportada</strong><small>Enviada desde la operación o la PWA del motorizado.</small></span></div>{selected.resolution ? <div><i className="timeline-dot active" /><span><strong>Resolución registrada</strong><small>{selected.resolution}</small></span></div> : null}</div>{selected.status !== "resolved" ? <><label className="detail-note">Resolución<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Escribe cómo se resolvió la incidencia" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="incident-actions"><button className="button button-primary" type="button" disabled={saving || resolution.trim().length < 3} onClick={() => { void resolveIncident(); }}><CheckCircle size={17} weight="fill" /> {saving ? "Resolviendo…" : "Resolver incidencia"}</button></div></> : null}</aside></section></>;
}
