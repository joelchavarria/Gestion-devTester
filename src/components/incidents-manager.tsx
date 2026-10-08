"use client";

import { Badge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OperationalIncident } from "@/lib/operations/types";
import { CheckCircle, Clock, MagnifyingGlass, Plus, ShieldWarning, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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
    const copy = [incident.number, incident.title, incident.orderNumber, incident.driverName, incident.description].filter(Boolean).join(" ").toLocaleLowerCase("es");
    return (!normalizedQuery || copy.includes(normalizedQuery))
      && (statusFilter === "all" || incident.status === statusFilter)
      && (priorityFilter === "all" || incident.priority === priorityFilter);
  }), [incidents, normalizedQuery, priorityFilter, statusFilter]);
  const selected = visibleIncidents.find((incident) => incident.id === selectedId) ?? visibleIncidents[0];
  const counts = {
    open: incidents.filter((incident) => incident.status === "open").length,
    urgent: incidents.filter((incident) => incident.priority === "high" || incident.priority === "critical").length,
    reviewing: incidents.filter((incident) => incident.status === "in_review").length,
    resolved: incidents.filter((incident) => incident.status === "resolved").length,
  };

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
      const response = await fetch(`/api/admin/incidents/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note: note.trim() || undefined }) });
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
      const response = await fetch(`/api/admin/incidents/${selected.id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution: note }) });
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

  return <div className="space-y-5">
    <div className="flex justify-end"><Button className="h-10 bg-emerald-700 px-4 shadow-sm hover:bg-emerald-800" type="button" onClick={() => { clearMessages(); setShowCreate(true); }}><Plus weight="bold" /> Nueva incidencia</Button></div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de incidencias">
      <StatCard label="Abiertas" value={counts.open} icon={<WarningCircle weight="duotone" />} tone="slate" />
      <StatCard label="Urgentes" value={counts.urgent} icon={<ShieldWarning weight="duotone" />} tone="red" />
      <StatCard label="En revisión" value={counts.reviewing} icon={<Clock weight="duotone" />} tone="blue" />
      <StatCard label="Resueltas" value={counts.resolved} icon={<CheckCircle weight="duotone" />} tone="green" />
    </section>

    {notice ? <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status"><CheckCircle size={17} weight="fill" /> {notice}</p> : null}
    {error && !showCreate ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p> : null}

    <section className="grid min-h-[470px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,.05)] xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
      <article className="min-w-0 border-b border-slate-200 xl:border-r xl:border-b-0">
        <div className="border-b border-slate-100 px-5 pt-4"><div className="flex gap-1 overflow-x-auto" aria-label="Estado de incidencias">
          {([["all", "Todas", incidents.length], ["open", "Abiertas", counts.open], ["in_review", "En revisión", counts.reviewing], ["resolved", "Resueltas", counts.resolved]] as const).map(([value, label, count]) => <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setSelectedId(""); clearMessages(); }} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${statusFilter === value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{count}</span></button>)}
        </div></div>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_190px]">
          <label className="relative"><span className="sr-only">Buscar incidencias</span><MagnifyingGlass className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={18} /><Input className="h-10 pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ID, pedido o motorizado" /></label>
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las prioridades</SelectItem>{Object.entries(priorityLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleIncidents.map((incident) => <button type="button" key={incident.id} onClick={() => { setSelectedId(incident.id); setNote(""); clearMessages(); }} className={`grid w-full grid-cols-[10px_1fr_auto] gap-3 px-5 py-4 text-left transition-colors ${incident.id === selected?.id ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
            <span className={`mt-2 size-2.5 rounded-full ${incident.priority === "high" || incident.priority === "critical" ? "bg-red-500" : incident.priority === "medium" ? "bg-amber-500" : "bg-slate-300"}`} />
            <span className="min-w-0"><strong className="block truncate text-sm text-slate-950">{incident.title}</strong><small className="mt-1 block truncate text-xs text-slate-500">{incident.number} · {incident.orderNumber ?? "Sin pedido"}</small><small className="block truncate text-xs text-slate-400">{incident.driverName ?? "Sin motorizado asignado"}</small></span>
            <span className="flex flex-col items-end gap-2"><Badge tone={incidentTone[incident.status]}>{incidentLabel[incident.status]}</Badge><time className="text-[11px] text-slate-400">{new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(incident.createdAt))}</time></span>
          </button>)}
          {!visibleIncidents.length ? <EmptyIncidents hasFilters={Boolean(query) || statusFilter !== "all" || priorityFilter !== "all"} onCreate={() => setShowCreate(true)} /> : null}
        </div>
      </article>

      {selected ? <aside className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="text-[11px] font-bold tracking-[.1em] text-slate-400">{selected.number}</span><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{selected.title}</h2></div><div className="flex gap-2"><Badge tone={incidentTone[selected.status]}>{incidentLabel[selected.status]}</Badge><Badge tone={selected.priority === "high" || selected.priority === "critical" ? "red" : "amber"}>{priorityLabel[selected.priority]}</Badge></div></div>
        <dl className="my-5 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 text-xs"><Meta label="Pedido" value={selected.orderNumber ?? "No asociado"} /><Meta label="Motorizado" value={selected.driverName ?? "No asignado"} /><Meta label="Reportada" value={new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" }).format(new Date(selected.createdAt))} /></dl>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Descripción</h3><p className="mt-2 text-sm leading-6 text-slate-700">{selected.description ?? "Sin detalle adicional."}</p></div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-950">Historial</h3><div className="mt-3 space-y-3 text-sm text-slate-600"><Timeline title="Incidencia reportada" detail="Registrada desde la operación o la PWA." />{selected.status === "in_review" ? <Timeline title="En revisión" detail="Operaciones está dando seguimiento." /> : null}{selected.resolution ? <Timeline title="Resolución registrada" detail={selected.resolution} /> : null}</div></div>
        {selected.status !== "resolved" ? <div className="mt-5 grid gap-3"><Label htmlFor="incident-note">Nota o resolución</Label><Textarea id="incident-note" className="min-h-24 resize-none" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Agrega una nota o describe cómo se resolvió" /><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" type="button" disabled={saving} onClick={() => { void changeStatus(selected.status === "in_review" ? "open" : "in_review"); }}>{selected.status === "in_review" ? "Reabrir" : "Pasar a revisión"}</Button><Button className="bg-emerald-700 hover:bg-emerald-800" type="button" disabled={saving || note.trim().length < 3} onClick={() => { void resolveIncident(); }}><CheckCircle weight="fill" /> {saving ? "Guardando…" : "Resolver"}</Button></div></div> : null}
      </aside> : <aside className="grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><WarningCircle size={25} weight="duotone" /></span><h2 className="mt-4 text-lg font-bold text-slate-950">Selecciona una incidencia</h2><p className="mt-1 text-sm text-slate-500">Aquí aparecerán sus detalles y acciones de seguimiento.</p></div></aside>}
    </section>

    <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) clearMessages(); }}>
      <DialogContent className="border-0 p-0 shadow-2xl sm:max-w-xl">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left"><DialogTitle className="text-xl">Nueva incidencia</DialogTitle><DialogDescription>Registra un problema operativo y deja un historial claro para el equipo.</DialogDescription></DialogHeader>
        <div className="grid gap-4 px-6 py-1 sm:grid-cols-2"><Field label="Título"><Input value={newTitle} maxLength={160} onChange={(event) => setNewTitle(event.target.value)} placeholder="Ej. Dirección incorrecta" /></Field><Field label="Pedido (opcional)"><Input value={newOrderNumber} maxLength={80} onChange={(event) => setNewOrderNumber(event.target.value)} placeholder="DEL-20261006-A7K2" /></Field><Field label="Prioridad"><Select value={newPriority} onValueChange={(value) => setNewPriority(value as OperationalIncident["priority"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(priorityLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><div className="sm:col-span-2"><Field label="Descripción"><Textarea className="min-h-28 resize-none" value={newDescription} maxLength={2000} onChange={(event) => setNewDescription(event.target.value)} placeholder="Describe qué ocurrió y qué necesita atención." /></Field></div>{error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2" role="alert">{error}</p> : null}</div>
        <DialogFooter className="border-t border-slate-100 px-6 py-4"><Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancelar</Button><Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => { void createIncident(); }} disabled={saving}>{saving ? "Creando…" : "Crear incidencia"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: "slate" | "red" | "blue" | "green" }) {
  const tones = { slate: "bg-slate-100 text-slate-600", red: "bg-red-50 text-red-600", blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-700" };
  return <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,.035)]"><span className={`grid size-11 place-items-center rounded-xl [&>svg]:size-6 ${tones[tone]}`}>{icon}</span><span><small className="block text-xs font-semibold text-slate-500">{label}</small><strong className="text-2xl tracking-tight text-slate-950">{value}</strong></span></article>;
}

function EmptyIncidents({ hasFilters, onCreate }: { hasFilters: boolean; onCreate: () => void }) {
  return <div className="grid min-h-64 place-items-center px-6 py-10 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldWarning size={28} weight="duotone" /></span><h3 className="mt-4 text-lg font-bold text-slate-950">{hasFilters ? "Sin coincidencias" : "Operación sin incidencias"}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{hasFilters ? "Prueba otra búsqueda o limpia los filtros." : "Cuando ocurra un problema podrás registrarlo, asignarle prioridad y seguir su resolución aquí."}</p>{!hasFilters ? <Button variant="outline" className="mt-5" type="button" onClick={onCreate}><Plus /> Registrar la primera</Button> : null}</div></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-r border-slate-200 p-3 last:border-r-0"><dt className="text-slate-400">{label}</dt><dd className="mt-1 truncate font-semibold text-slate-800" title={value}>{value}</dd></div>;
}

function Timeline({ title, detail }: { title: string; detail: string }) {
  return <div className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-50" /><span><strong className="block text-slate-800">{title}</strong><small className="leading-5 text-slate-500">{detail}</small></span></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label className="text-xs font-semibold text-slate-700">{label}</Label>{children}</div>;
}
