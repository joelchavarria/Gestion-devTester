"use client";

import { NumericInput } from "@/components/numeric-input";
import type { AdminBootstrap, OperationalZone } from "@/lib/operations/types";
import { ArrowRight, CheckCircle, Cube, DotsThreeVertical, FileText, FloppyDisk, MagnifyingGlass, MapPin, Moon, Plus, TrendUp } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type EditableZone = OperationalZone & { localId: string };
type TariffTab = "active" | "zones" | "surcharges";
type PreviewService = "delivery" | "errand" | "package";
type TariffsResponse = { error?: string; zones?: OperationalZone[] };

const additionalKmRate = 15;

function currency(value: number) {
  return `C$${value.toFixed(0)}`;
}

function tariffSnapshot(zones: EditableZone[], managementFee: number, allowOverride: boolean, cancellationRule: AdminBootstrap["settings"]["cancellationAfterPurchaseRule"]) {
  return JSON.stringify({
    zones: zones.map(({ id, name, deliveryFee, minimumFee, isActive }) => ({ id, name: name.trim(), deliveryFee, minimumFee, isActive })),
    managementFee,
    allowOverride,
    cancellationRule,
  });
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "green" | "blue" | "slate" | "amber" }) {
  return <article className={`tariff-metric tariff-metric-${tone}`}><span className="tariff-metric-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></article>;
}

export function TariffManager({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [zones, setZones] = useState<EditableZone[]>(() => data.zones.map((zone) => ({ ...zone, localId: zone.id })));
  const [managementFee, setManagementFee] = useState(data.settings.baseManagementFee);
  const [allowOverride, setAllowOverride] = useState(data.settings.allowOperatorPriceOverride);
  const [cancellationRule, setCancellationRule] = useState(data.settings.cancellationAfterPurchaseRule);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => tariffSnapshot(data.zones.map((zone) => ({ ...zone, localId: zone.id })), data.settings.baseManagementFee, data.settings.allowOperatorPriceOverride, data.settings.cancellationAfterPurchaseRule));
  const [tab, setTab] = useState<TariffTab>("active");
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [previewZoneId, setPreviewZoneId] = useState(() => data.zones.find((zone) => zone.isActive)?.id ?? data.zones[0]?.id ?? "");
  const [previewService, setPreviewService] = useState<PreviewService>("delivery");
  const [distance, setDistance] = useState(2.8);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSnapshot = tariffSnapshot(zones, managementFee, allowOverride, cancellationRule);
  const hasChanges = currentSnapshot !== lastSavedSnapshot;
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleZones = useMemo(() => zones.filter((zone) => {
    const matchesQuery = !normalizedQuery || zone.name.toLocaleLowerCase("es").includes(normalizedQuery);
    const matchesZone = zoneFilter === "all" || zone.name === zoneFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? zone.isActive : !zone.isActive);
    return matchesQuery && matchesZone && matchesStatus;
  }), [normalizedQuery, statusFilter, zoneFilter, zones]);
  const previewZone = zones.find((zone) => zone.localId === previewZoneId) ?? zones[0];
  const previewBase = previewZone?.deliveryFee ?? 0;
  const extraDistance = Math.max(0, distance - 1);
  const extraCost = extraDistance * additionalKmRate;
  const previewManagementFee = previewService === "errand" ? managementFee : 0;
  const previewTotal = previewBase + extraCost + previewManagementFee;
  const activeRules = zones.filter((zone) => zone.isActive).length;

  function updateZone(localId: string, field: "name" | "deliveryFee" | "minimumFee", value: string | number) {
    setSaved(false);
    setZones((current) => current.map((zone) => zone.localId === localId ? { ...zone, [field]: field === "name" ? value : Math.max(0, Number(value) || 0) } : zone));
  }

  function addZone() {
    const localId = `new-${crypto.randomUUID()}`;
    const newZone: EditableZone = { id: localId, localId, name: `Nueva zona ${zones.length + 1}`, deliveryFee: 50, minimumFee: 0, isActive: true };
    setZones((current) => [...current, newZone]);
    setPreviewZoneId(localId);
    setTab("active");
    setStatusFilter("all");
    setError(null);
  }

  function removeZone(zone: EditableZone) {
    if (zones.length === 1) {
      setError("Conserva al menos una zona tarifaria.");
      return;
    }
    if (!window.confirm(`¿Eliminar la zona “${zone.name}”? El cambio se aplicará al guardar.`)) return;
    setZones((current) => current.filter((item) => item.localId !== zone.localId));
    if (previewZoneId === zone.localId) setPreviewZoneId(zones.find((item) => item.localId !== zone.localId)?.localId ?? "");
    setSaved(false);
    setError(null);
  }

  function validate() {
    if (!zones.length) return "Conserva al menos una zona tarifaria.";
    const names = zones.map((zone) => zone.name.trim().toLocaleLowerCase("es"));
    if (names.some((name) => name.length < 2)) return "Cada zona debe tener un nombre de al menos 2 caracteres.";
    if (new Set(names).size !== names.length) return "No puedes guardar dos zonas con el mismo nombre.";
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map(({ id, name, deliveryFee, minimumFee, isActive }) => ({ id: id.startsWith("new-") ? undefined : id, name: name.trim(), deliveryFee, minimumFee, isActive })),
          baseManagementFee: managementFee,
          allowOperatorPriceOverride: allowOverride,
          cancellationAfterPurchaseRule: cancellationRule,
        }),
      });
      const payload = await response.json() as TariffsResponse;
      if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar las tarifas.");
      if (!payload.zones?.length) throw new Error("Las tarifas se guardaron, pero no pudimos actualizar la vista.");
      const persistedZones = payload.zones.map((zone) => ({ ...zone, localId: zone.id }));
      setZones(persistedZones);
      setPreviewZoneId((current) => persistedZones.some((zone) => zone.id === current) ? current : persistedZones[0]?.id ?? "");
      setLastSavedSnapshot(tariffSnapshot(persistedZones, managementFee, allowOverride, cancellationRule));
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2_500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar las tarifas.");
    } finally {
      setSaving(false);
    }
  }

  const previewLabel = previewService === "errand" ? "Compra y entrega" : previewService === "package" ? "Envío de paquete" : "Delivery";

  return <div className="tariffs-page">
    <div className="tariffs-page-header"><div><h1>Tarifas</h1><p>Configura cómo se calculan los precios de tus servicios.</p></div><button type="button" className="button button-primary tariff-new-button" onClick={addZone}><Plus size={19} weight="bold" /> Nueva tarifa</button></div>
    <div className="tariff-metrics"><Metric tone="green" icon={<FileText size={22} weight="bold" />} label="Reglas activas" value={activeRules} /><Metric tone="slate" icon={<MapPin size={23} weight="bold" />} label="Zonas configuradas" value={zones.length} /><Metric tone="green" icon={<Cube size={22} weight="bold" />} label="Servicios con tarifa" value={zones.length ? 6 : 0} /><Metric tone="amber" icon={<TrendUp size={22} weight="bold" />} label="Cambios este mes" value={2} /></div>
    <div className="tariff-content-grid">
      <section className="tariff-table-card panel">
        <div className="tariff-tabs" role="tablist" aria-label="Secciones de tarifas"><button type="button" role="tab" aria-selected={tab === "active"} className={tab === "active" ? "is-selected" : ""} onClick={() => setTab("active")}>Tarifas activas</button><button type="button" role="tab" aria-selected={tab === "zones"} className={tab === "zones" ? "is-selected" : ""} onClick={() => setTab("zones")}>Zonas</button><button type="button" role="tab" aria-selected={tab === "surcharges"} className={tab === "surcharges" ? "is-selected" : ""} onClick={() => setTab("surcharges")}>Recargos</button></div>
        {tab === "surcharges" ? <div className="tariff-tab-empty"><Moon size={28} /><h2>Recargos</h2><p>Configura recargos nocturnos y reglas especiales para tus servicios.</p><button type="button" className="button button-secondary" onClick={() => setTab("active")}>Volver a tarifas</button></div> : <>
          <div className="tariff-filters"><label className="tariff-search"><MagnifyingGlass size={19} /><span className="sr-only">Buscar tarifa</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarifa..." /></label><select aria-label="Filtrar por zona" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}><option value="all">Todas las zonas</option>{zones.map((zone) => <option key={zone.localId} value={zone.name}>{zone.name}</option>)}</select><select aria-label="Filtrar por servicio" value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value); setTab("active"); }}><option value="all">Todos los servicios</option><option value="delivery">Delivery</option><option value="errand">Compra y entrega</option><option value="package">Envío de paquete</option></select><select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Estado: Activa</option><option value="all">Todos los estados</option><option value="inactive">Estado: Inactiva</option></select></div>
          <div className="tariff-table-heading"><h2>Reglas de tarifa</h2></div>
          <div className="tariff-table-wrap"><table className="tariff-table"><thead><tr><th>Zona</th><th>Servicio</th><th>Vehículo</th><th>Tarifa base</th><th>Km adicional</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visibleZones.map((zone) => <tr key={zone.localId}><td><input className="tariff-inline-input tariff-zone-name" aria-label={`Zona ${zone.name}`} value={zone.name} onChange={(event) => updateZone(zone.localId, "name", event.target.value)} /></td><td>{serviceFilter === "errand" ? "Compra y entrega" : serviceFilter === "package" ? "Envío de paquete" : "Delivery"}</td><td>Moto</td><td><label className="tariff-money-input"><span>C$</span><NumericInput aria-label={`Tarifa base ${zone.name}`} min={0} max={100_000} value={zone.deliveryFee} onValueChange={(value) => updateZone(zone.localId, "deliveryFee", value)} /></label></td><td><label className="tariff-money-input"><span>C$</span><NumericInput aria-label={`Km adicional ${zone.name}`} min={0} max={100_000} value={zone.minimumFee || additionalKmRate} onValueChange={(value) => updateZone(zone.localId, "minimumFee", value)} /></label></td><td><span className={`tariff-status ${zone.isActive ? "is-active" : "is-draft"}`}><i />{zone.isActive ? "Activa" : "Borrador"}</span></td><td><button type="button" className="tariff-action-button" aria-label={`Eliminar ${zone.name}`} onClick={() => removeZone(zone)}><DotsThreeVertical size={21} weight="bold" /></button></td></tr>)}{!visibleZones.length ? <tr><td colSpan={7}><div className="empty-table">No hay tarifas que coincidan con los filtros.</div></td></tr> : null}</tbody></table></div>
          {hasChanges || saved || error ? <div className="tariff-save-row tariff-save-row-reference"><p aria-live="polite">{saved ? <><CheckCircle size={17} weight="fill" /> Cambios guardados</> : hasChanges ? "Tienes cambios sin guardar." : error ? error : "Las tarifas están actualizadas."}</p><button type="button" className="button button-primary" onClick={() => { void save(); }} disabled={saving || !hasChanges}><FloppyDisk size={18} weight="bold" /> {saving ? "Guardando…" : "Guardar cambios"}</button></div> : null}
        </>}
      </section>
      <aside className="tariff-reference-side">
        <section className="tariff-preview-card panel" aria-label="Vista previa de cálculo"><h2>Vista previa de cálculo</h2><select aria-label="Servicio y zona de vista previa" value={previewZone?.localId ?? ""} onChange={(event) => setPreviewZoneId(event.target.value)}>{zones.map((zone) => <option key={zone.localId} value={zone.localId}>{previewLabel} • {zone.name}</option>)}</select><label className="preview-distance"><span>Distancia total</span><div><input type="number" min="0" step="0.1" value={distance} onChange={(event) => setDistance(Math.max(0, Number(event.target.value) || 0))} /><b>km</b></div></label><div className="preview-service-select"><span>Servicio</span><select aria-label="Servicio de cálculo" value={previewService} onChange={(event) => setPreviewService(event.target.value as PreviewService)}><option value="delivery">Delivery</option><option value="errand">Compra y entrega</option><option value="package">Envío de paquete</option></select></div><div className="preview-calculation"><div><span>Tarifa base</span><strong>{currency(previewBase)}</strong></div><div><span>{extraDistance.toFixed(1)} km adicionales × {currency(additionalKmRate)}</span><strong>{currency(extraCost)}</strong></div>{previewService === "errand" ? <div><span>Gestión</span><strong>{currency(previewManagementFee)}</strong></div> : null}<hr /><div className="preview-total"><span>Total estimado</span><strong>{currency(previewTotal)}</strong></div></div><p className="preview-hint"><span>i</span>El operador puede ajustar el total antes de confirmar al cliente.</p></section>
        <section className="night-surcharge-card panel"><div className="night-surcharge-heading"><span className="night-icon"><Moon size={22} weight="fill" /></span><h2>Recargo nocturno</h2><span className="tariff-status is-inactive">Inactivo</span></div><p>+C$20 después de las 8:00 p. m.</p><button type="button" onClick={() => setTab("surcharges")}>Configurar recargos <ArrowRight size={18} /></button></section>
        <section className="tariff-settings-card panel"><h2>Reglas de cobro</h2><p>Gestión base para mandados</p><label className="tariff-settings-money"><span>C$</span><NumericInput aria-label="Gestión base para mandados" min={0} max={100_000} value={managementFee} onValueChange={(value) => { setManagementFee(value); setSaved(false); }} /></label><label className="tariff-toggle-row"><span><strong>Permitir ajuste manual</strong><small>El operador puede cambiar el total antes de confirmar.</small></span><input type="checkbox" checked={allowOverride} onChange={(event) => { setAllowOverride(event.target.checked); setSaved(false); }} /><i /></label><label className="tariff-cancel-rule">Cobro al cancelar tras compra<select value={cancellationRule} onChange={(event) => { setCancellationRule(event.target.value as typeof cancellationRule); setSaved(false); }}><option value="product_management_delivery">Producto + gestión + delivery</option><option value="product_management">Producto + gestión</option><option value="product_only">Solo producto</option><option value="manual">Decide el administrador</option><option value="none">No cobrar</option></select></label></section>
      </aside>
    </div>
  </div>;
}
