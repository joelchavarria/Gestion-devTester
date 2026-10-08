"use client";

import { NumericInput } from "@/components/numeric-input";
import type { AdminBootstrap, OperationalZone } from "@/lib/operations/types";
import { Calculator, CheckCircle, FloppyDisk, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EditableZone = OperationalZone & { localId: string };
type ZoneFilter = "all" | "active" | "inactive";
type PreviewService = "delivery" | "errand" | "package";
type TariffsResponse = { error?: string; zones?: OperationalZone[] };

const asNonNegativeAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

function tariffSnapshot(
  zones: EditableZone[],
  managementFee: number,
  allowOverride: boolean,
  cancellationRule: AdminBootstrap["settings"]["cancellationAfterPurchaseRule"],
) {
  return JSON.stringify({
    zones: zones.map(({ id, name, deliveryFee, minimumFee, isActive }) => ({
      id,
      name: name.trim(),
      deliveryFee,
      minimumFee,
      isActive,
    })),
    managementFee,
    allowOverride,
    cancellationRule,
  });
}

export function TariffManager({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [zones, setZones] = useState<EditableZone[]>(() => data.zones.map((zone) => ({ ...zone, localId: zone.id })));
  const [managementFee, setManagementFee] = useState(data.settings.baseManagementFee);
  const [allowOverride, setAllowOverride] = useState(data.settings.allowOperatorPriceOverride);
  const [cancellationRule, setCancellationRule] = useState(data.settings.cancellationAfterPurchaseRule);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => tariffSnapshot(
    data.zones.map((zone) => ({ ...zone, localId: zone.id })),
    data.settings.baseManagementFee,
    data.settings.allowOperatorPriceOverride,
    data.settings.cancellationAfterPurchaseRule,
  ));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ZoneFilter>("all");
  const [previewZoneId, setPreviewZoneId] = useState(() => data.zones.find((zone) => zone.isActive)?.id ?? data.zones[0]?.id ?? "");
  const [previewService, setPreviewService] = useState<PreviewService>("delivery");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSnapshot = tariffSnapshot(zones, managementFee, allowOverride, cancellationRule);
  const hasChanges = currentSnapshot !== lastSavedSnapshot;
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleZones = useMemo(() => zones.filter((zone) => {
    const matchesQuery = !normalizedQuery || zone.name.toLocaleLowerCase("es").includes(normalizedQuery);
    const matchesFilter = filter === "all" || (filter === "active" ? zone.isActive : !zone.isActive);
    return matchesQuery && matchesFilter;
  }), [filter, normalizedQuery, zones]);
  const previewZone = zones.find((zone) => zone.localId === previewZoneId) ?? zones[0];
  const previewDeliveryFee = previewZone ? Math.max(previewZone.deliveryFee, previewZone.minimumFee) : 0;
  const previewManagementFee = previewService === "errand" ? managementFee : 0;
  const previewTotal = previewDeliveryFee + previewManagementFee;

  function updateZone(localId: string, field: "name" | "deliveryFee" | "minimumFee", value: string | number) {
    setSaved(false);
    setZones((current) => current.map((zone) => zone.localId === localId
      ? { ...zone, [field]: field === "name" ? value : asNonNegativeAmount(String(value)) }
      : zone));
  }

  function addZone() {
    const localId = `new-${crypto.randomUUID()}`;
    setZones((current) => [...current, {
      id: localId,
      localId,
      name: `Nueva zona ${current.length + 1}`,
      deliveryFee: 0,
      minimumFee: 0,
      isActive: true,
    }]);
    setFilter("all");
    setQuery("");
    setPreviewZoneId(localId);
    setSaved(false);
    setError(null);
  }

  function removeZone(zone: EditableZone) {
    if (zones.length === 1) {
      setError("Conserva al menos una zona tarifaria.");
      return;
    }
    if (!window.confirm(`¿Eliminar la zona “${zone.name}”? El cambio se aplicará al guardar.`)) return;
    setZones((current) => current.filter((item) => item.localId !== zone.localId));
    if (previewZoneId === zone.localId) {
      setPreviewZoneId(zones.find((item) => item.localId !== zone.localId)?.localId ?? "");
    }
    setSaved(false);
    setError(null);
  }

  function validate() {
    if (!zones.length) return "Conserva al menos una zona tarifaria.";
    const normalizedNames = zones.map((zone) => zone.name.trim().toLocaleLowerCase("es"));
    if (normalizedNames.some((name) => name.length < 2)) return "Cada zona debe tener un nombre de al menos 2 caracteres.";
    if (new Set(normalizedNames).size !== normalizedNames.length) return "No puedes guardar dos zonas con el mismo nombre.";
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map(({ id, name, deliveryFee, minimumFee, isActive }) => ({
            id: id.startsWith("new-") ? undefined : id,
            name: name.trim(),
            deliveryFee,
            minimumFee,
            isActive,
          })),
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

  return (
    <div className="tariff-layout">
      <section className="panel tariff-main">
        <div className="panel-heading">
          <div><h2>Tarifas por zona</h2><p>El precio se aplicará a las nuevas cotizaciones.</p></div>
          <button type="button" className="button button-secondary button-small" onClick={addZone}><Plus size={17} /> Agregar zona</button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">Buscar zona</span><MagnifyingGlass size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar zona…" />
          </label>
          <div className="filter-pills" aria-label="Filtrar zonas">
            {(["all", "active", "inactive"] as const).map((value) => (
              <button key={value} className={`filter-pill ${filter === value ? "active" : ""}`} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === "all" ? "Todas" : value === "active" ? "Activas" : "Inactivas"}
              </button>
            ))}
          </div>
        </div>

        <div className="zone-list">
          {visibleZones.map((zone) => (
            <div className="zone-row" key={zone.localId}>
              <div className="zone-pin" />
              <label><span>Nombre de zona</span><input value={zone.name} maxLength={120} onChange={(event) => updateZone(zone.localId, "name", event.target.value)} /></label>
              <label className="currency-input"><span>Tarifa delivery</span><b>C$</b><NumericInput min={0} max={100_000} value={zone.deliveryFee} onValueChange={(value) => updateZone(zone.localId, "deliveryFee", value)} /></label>
              <label className="currency-input"><span>Mínimo</span><b>C$</b><NumericInput min={0} max={100_000} value={zone.minimumFee} onValueChange={(value) => updateZone(zone.localId, "minimumFee", value)} /></label>
              <label className="switch-label">
                <input type="checkbox" checked={zone.isActive} onChange={() => { setZones((current) => current.map((item) => item.localId === zone.localId ? { ...item, isActive: !item.isActive } : item)); setSaved(false); }} />
                <i /><span>{zone.isActive ? "Activa" : "Inactiva"}</span>
              </label>
              <button className="table-action danger" type="button" onClick={() => removeZone(zone)} aria-label={`Eliminar ${zone.name}`}><Trash size={18} /></button>
            </div>
          ))}
          {!visibleZones.length ? <div className="empty-table">No hay zonas que coincidan con los filtros.</div> : null}
        </div>

        <div className="tariff-save-row">
          <p aria-live="polite">{saved ? <><CheckCircle size={17} weight="fill" /> Cambios guardados</> : hasChanges ? "Tienes cambios sin guardar." : "Las tarifas están actualizadas."}</p>
          <button type="button" className="button button-primary" onClick={() => { void save(); }} disabled={saving || !hasChanges}><FloppyDisk size={18} weight="bold" /> {saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>

      <aside className="tariff-side">
        <section className="panel">
          <h2>Reglas de cobro</h2><p className="panel-subtitle">Define cómo se calcula y autoriza una cotización.</p>
          <label className="settings-input">Gestión base para mandados<div><b>C$</b><NumericInput min={0} max={100_000} value={managementFee} onValueChange={(value) => { setManagementFee(value); setSaved(false); }} /></div></label>
          <label className="toggle-row">
            <span><strong>Permitir ajuste manual</strong><small>El operador puede cambiar el precio antes de confirmar.</small></span>
            <input type="checkbox" checked={allowOverride} onChange={(event) => { setAllowOverride(event.target.checked); setSaved(false); }} /><i />
          </label>
          <label className="settings-input">Cobro al cancelar tras compra
            <select value={cancellationRule} onChange={(event) => { setCancellationRule(event.target.value as typeof cancellationRule); setSaved(false); }}>
              <option value="product_management_delivery">Producto + gestión + delivery</option><option value="product_management">Producto + gestión</option><option value="product_only">Solo producto</option><option value="manual">Decide el administrador</option><option value="none">No cobrar</option>
            </select>
          </label>
        </section>

        <section className="panel" aria-label="Vista previa de tarifa">
          <div className="panel-heading"><div><h2>Vista previa</h2><p>Comprueba el cálculo antes de guardar.</p></div><Calculator size={21} /></div>
          <div className="draft-section">
            <label>Zona<select value={previewZone?.localId ?? ""} onChange={(event) => setPreviewZoneId(event.target.value)}>{zones.map((zone) => <option key={zone.localId} value={zone.localId}>{zone.name}</option>)}</select></label>
            <label>Servicio<select value={previewService} onChange={(event) => setPreviewService(event.target.value as PreviewService)}><option value="delivery">Delivery</option><option value="errand">Mandado / compra</option><option value="package">Envío de paquete</option></select></label>
            <div className="price-line"><span>Delivery</span><strong>C${previewDeliveryFee.toFixed(2)}</strong></div>
            {previewService === "errand" ? <div className="price-line"><span>Gestión</span><strong>C${previewManagementFee.toFixed(2)}</strong></div> : null}
            <div className="price-total"><strong>Total estimado</strong><strong>C${previewTotal.toFixed(2)}</strong></div>
          </div>
        </section>

        <section className="tip-card"><strong>¿Cómo se calcula un mandado?</strong><p>Compra / producto + gestión + delivery = total para el cliente.</p></section>
      </aside>
    </div>
  );
}
