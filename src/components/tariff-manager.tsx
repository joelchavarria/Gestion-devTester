"use client";

import { CheckCircle, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { NumericInput } from "@/components/numeric-input";
import type { AdminBootstrap, OperationalZone } from "@/lib/operations/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EditableZone = OperationalZone & { localId: string };

const asNonNegativeAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function TariffManager({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [zones, setZones] = useState<EditableZone[]>(() => data.zones.map((zone) => ({ ...zone, localId: zone.id })));
  const [managementFee, setManagementFee] = useState(data.settings.baseManagementFee);
  const [allowOverride, setAllowOverride] = useState(data.settings.allowOperatorPriceOverride);
  const [cancellationRule, setCancellationRule] = useState(data.settings.cancellationAfterPurchaseRule);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateZone(localId: string, field: "name" | "deliveryFee" | "minimumFee", value: string | number) {
    setZones((current) => current.map((zone) => zone.localId === localId ? { ...zone, [field]: field === "name" ? value : asNonNegativeAmount(String(value)) } : zone));
  }

  async function save() {
    if (!zones.length) {
      setError("Conserva al menos una zona tarifaria.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/tariffs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map(({ id, name, deliveryFee, minimumFee, isActive }) => ({ id: id.startsWith("new-") ? undefined : id, name, deliveryFee, minimumFee, isActive })),
          baseManagementFee: managementFee,
          allowOperatorPriceOverride: allowOverride,
          cancellationAfterPurchaseRule: cancellationRule,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar las tarifas.");
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2_500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar las tarifas.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="tariff-layout"><section className="panel tariff-main"><div className="panel-heading"><div><h2>Tarifas por zona</h2><p>El precio de delivery se aplicará a las nuevas cotizaciones.</p></div><button type="button" className="button button-secondary button-small" onClick={() => { const localId = `new-${crypto.randomUUID()}`; setZones((current) => [...current, { id: localId, localId, name: "Nueva zona", deliveryFee: 0, minimumFee: 0, isActive: true }]); }}><Plus size={17} /> Agregar zona</button></div><div className="zone-list">{zones.map((zone) => <div className="zone-row" key={zone.localId}><div className="zone-pin" /><label><span>Nombre de zona</span><input value={zone.name} onChange={(event) => updateZone(zone.localId, "name", event.target.value)} /></label><label className="currency-input"><span>Tarifa delivery</span><b>C$</b><NumericInput min={0} value={zone.deliveryFee} onValueChange={(value) => updateZone(zone.localId, "deliveryFee", value)} /></label><label className="currency-input"><span>Mínimo</span><b>C$</b><NumericInput min={0} value={zone.minimumFee} onValueChange={(value) => updateZone(zone.localId, "minimumFee", value)} /></label><label className="switch-label"><input type="checkbox" checked={zone.isActive} onChange={() => setZones((current) => current.map((item) => item.localId === zone.localId ? { ...item, isActive: !item.isActive } : item))} /><i /><span>{zone.isActive ? "Activa" : "Inactiva"}</span></label><button className="table-action danger" type="button" onClick={() => setZones((current) => current.filter((item) => item.localId !== zone.localId))} aria-label={`Eliminar ${zone.name}`}><Trash size={18} /></button></div>)}</div><div className="tariff-save-row"><p>{saved ? <><CheckCircle size={17} weight="fill" /> Cambios guardados</> : "Los cambios se aplicarán a las siguientes cotizaciones."}</p><button type="button" className="button button-primary" onClick={() => { void save(); }} disabled={saving}><FloppyDisk size={18} weight="bold" /> {saving ? "Guardando…" : "Guardar cambios"}</button></div>{error ? <p className="form-error" role="alert">{error}</p> : null}</section><aside className="tariff-side"><section className="panel"><h2>Reglas de cobro</h2><p className="panel-subtitle">Define cómo se calcula y autoriza una cotización.</p><label className="settings-input">Gestión base para mandados<div><b>C$</b><NumericInput min={0} value={managementFee} onValueChange={setManagementFee} /></div></label><label className="toggle-row"><span><strong>Permitir ajuste manual</strong><small>El operador puede cambiar precio antes de confirmar.</small></span><input type="checkbox" checked={allowOverride} onChange={(event) => setAllowOverride(event.target.checked)} /><i /></label><label className="settings-input">Cobro al cancelar tras compra<select value={cancellationRule} onChange={(event) => setCancellationRule(event.target.value as typeof cancellationRule)}><option value="product_management_delivery">Producto + gestión + delivery</option><option value="product_management">Producto + gestión</option><option value="product_only">Solo producto</option><option value="manual">Decide el administrador</option><option value="none">No cobrar</option></select></label></section><section className="tip-card"><strong>¿Cómo se calcula un mandado?</strong><p>Compra / producto + gestión + delivery = total para el cliente.</p></section></aside></div>;
}
