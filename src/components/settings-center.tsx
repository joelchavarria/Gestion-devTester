"use client";

import { WhatsAppEmbeddedSignup } from "@/components/whatsapp-embedded-signup";
import { NumericInput } from "@/components/numeric-input";
import { Badge } from "@/components/ui";
import type { AdminBootstrap, BusinessHour, CompanySettings } from "@/lib/operations/types";
import { Bell, Buildings, CaretRight, ChatCenteredText, CheckCircle, GearSix, LockKey, Motorcycle, Plug, UsersThree, Wrench } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

const settingsItems = [
  { id: "empresa", label: "Empresa", icon: Buildings },
  { id: "usuarios", label: "Usuarios y permisos", icon: UsersThree },
  { id: "whatsapp", label: "WhatsApp Business", icon: ChatCenteredText },
  { id: "operacion", label: "Operación", icon: GearSix },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "motorizados", label: "App de motorizados", icon: Motorcycle },
  { id: "flota", label: "Flota y mantenimiento", icon: Wrench },
  { id: "seguridad", label: "Seguridad", icon: LockKey },
  { id: "integraciones", label: "Integraciones", icon: Plug },
] as const;

const days = [
  ["monday", "Lunes"], ["tuesday", "Martes"], ["wednesday", "Miércoles"], ["thursday", "Jueves"], ["friday", "Viernes"], ["saturday", "Sábado"], ["sunday", "Domingo"],
] as const;
type ActiveSection = typeof settingsItems[number]["id"];
type DayKey = typeof days[number][0];

export function SettingsCenter({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveSection>("whatsapp");
  const [displayName, setDisplayName] = useState(data.company.name);
  const [city, setCity] = useState(data.company.city);
  const [phone, setPhone] = useState(data.company.phone ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(data.whatsapp.welcomeMessage);
  const [settings, setSettings] = useState<CompanySettings>(data.settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = settingsItems.find((item) => item.id === active)!;

  function updateSettings(patch: Partial<CompanySettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function updateHour(day: DayKey, patch: Partial<BusinessHour>) {
    setSettings((current) => ({ ...current, businessHours: { ...current.businessHours, [day]: { ...current.businessHours[day], ...patch } } }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, city, phone: phone || null, welcomeMessage, ...settings }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar la configuración.");
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2_500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  const content = active === "empresa" ? <CompanySettings displayName={displayName} city={city} phone={phone} hours={settings.businessHours} onDisplayName={setDisplayName} onCity={setCity} onPhone={setPhone} onHour={updateHour} />
    : active === "whatsapp" ? <WhatsAppSettings channel={data.whatsapp} welcomeMessage={welcomeMessage} onWelcomeMessage={setWelcomeMessage} />
      : active === "operacion" ? <OperationSettings settings={settings} onUpdate={updateSettings} />
        : active === "motorizados" ? <DriverSettings settings={settings} onUpdate={updateSettings} />
          : active === "flota" ? <FleetSettings settings={settings} onUpdate={updateSettings} />
            : active === "usuarios" ? <InfoCard title="Usuarios y permisos" description="Registra motorizados desde el módulo Motorizados. El dueño controla el acceso administrativo y cada motorizado entra con su propia cuenta PWA." rows={[["Propietario", "Control total de la empresa"], ["Operadores", "Atienden conversaciones y pedidos"], ["Motorizados", "Acceso exclusivo a la PWA"]]} />
              : active === "notificaciones" ? <InfoCard title="Notificaciones" description="Las alertas de pedido, incidencias y mantenimiento se generan dentro del panel. WhatsApp se usa para conversar con clientes desde la bandeja." rows={[["Pedidos asignados", "Notificación en PWA"], ["Incidencias", "Panel de administración"], ["Mantenimientos", "Bloqueo de jornada al vencer"]]} />
                : active === "seguridad" ? <InfoCard title="Seguridad" description="Las sesiones se autentican con Supabase. Las operaciones sensibles validan rol, empresa y origen antes de escribirse." rows={[["Aislamiento", "Una empresa no puede leer otra"], ["OTP", settings.otpDeliveryRequired ? "Obligatorio para entregar" : "Desactivado"], ["Auditoría", "Cambios críticos registrados"]]} />
                  : <InfoCard title="Integraciones" description="Completa las variables del entorno antes de activar servicios externos." rows={[["WhatsApp Business", data.whatsapp.connectionStatus === "connected" ? `Conectado: ${data.whatsapp.phoneNumber ?? "número verificado"}` : "Pendiente de Meta Embedded Signup"], ["Mapas", "Google Maps + Directions API"], ["Base de datos", "Supabase (local o cloud)"]]} />;

  return <div className="settings-layout">
    <aside className="settings-nav panel">
      <h2>Ajustes</h2>
      {settingsItems.map((item) => {
        const Icon = item.icon;
        return <button type="button" className={clsx("settings-nav-item", active === item.id && "active")} onClick={() => setActive(item.id)} key={item.id}><Icon size={20} weight={active === item.id ? "fill" : "regular"} />{item.label}<CaretRight size={15} /></button>;
      })}
      <div className="settings-help"><span>✓</span><div><strong>Datos protegidos</strong><p>Los cambios quedan aislados dentro de tu empresa.</p></div></div>
    </aside>
    <section className="settings-content panel">
      <div className="settings-content-heading"><div><span className="eyebrow">CONFIGURACIÓN</span><h2>{selected.label}</h2><p>{active === "whatsapp" ? "Conecta y configura el canal oficial de atención." : "Ajusta las reglas permanentes de tu operación."}</p></div>{saved ? <Badge tone="green"><CheckCircle size={15} weight="fill" /> Cambios guardados</Badge> : null}</div>
      {content}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="settings-save"><button className="button button-primary" type="button" onClick={() => { void save(); }} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button></div>
    </section>
  </div>;
}

function CompanySettings({ displayName, city, phone, hours, onDisplayName, onCity, onPhone, onHour }: { displayName: string; city: string; phone: string; hours: CompanySettings["businessHours"]; onDisplayName: (value: string) => void; onCity: (value: string) => void; onPhone: (value: string) => void; onHour: (day: DayKey, patch: Partial<BusinessHour>) => void }) {
  return <div className="settings-stack"><section className="settings-card"><h3>Datos de empresa</h3><div className="form-grid"><label>Nombre comercial<input value={displayName} onChange={(event) => onDisplayName(event.target.value)} /></label><label>Ciudad<input value={city} onChange={(event) => onCity(event.target.value)} /></label><label>Teléfono de empresa<input type="tel" value={phone} onChange={(event) => onPhone(event.target.value)} placeholder="+505 0000 0000" /></label><label>Moneda<input value="C$ · Córdoba nicaragüense" disabled /></label></div></section><section className="settings-card"><h3>Horario de atención</h3><p className="panel-subtitle">Fuera de este horario podrás mostrar un mensaje de espera a clientes.</p><div className="business-hours">{days.map(([day, label]) => { const value = hours[day]; return <div className="business-hour-row" key={day}><label className="switch-label"><input type="checkbox" checked={value.enabled} onChange={(event) => onHour(day, { enabled: event.target.checked })} /><i /><span>{label}</span></label><input aria-label={`${label} inicia`} type="time" value={value.from} disabled={!value.enabled} onChange={(event) => onHour(day, { from: event.target.value })} /><span>a</span><input aria-label={`${label} termina`} type="time" value={value.to} disabled={!value.enabled} onChange={(event) => onHour(day, { to: event.target.value })} /></div>; })}</div></section></div>;
}

function WhatsAppSettings({ channel, welcomeMessage, onWelcomeMessage }: { channel: AdminBootstrap["whatsapp"]; welcomeMessage: string; onWelcomeMessage: (value: string) => void }) {
  return <div className="settings-stack"><WhatsAppEmbeddedSignup /><section className="settings-card"><h3>Mensajes y atención</h3><p className="panel-subtitle">Este saludo se envía una vez cuando una persona inicia una conversación nueva.</p><label className="detail-note">Mensaje de bienvenida<textarea value={welcomeMessage} onChange={(event) => onWelcomeMessage(event.target.value)} maxLength={1024} /></label><div className="settings-info"><LockKey size={19} weight="fill" /> {channel.connectionStatus === "connected" ? `Número conectado: ${channel.phoneNumber ?? "verificado por Meta"}` : "Conecta tu número desde el flujo oficial de Meta para recibir y responder mensajes reales."}</div></section></div>;
}

function OperationSettings({ settings, onUpdate }: { settings: CompanySettings; onUpdate: (patch: Partial<CompanySettings>) => void }) {
  return <div className="settings-stack"><section className="settings-card"><h3>Reglas de operación</h3><label className="settings-input">Gestión base para mandados<div><b>C$</b><NumericInput min={0} value={settings.baseManagementFee} onValueChange={(value) => onUpdate({ baseManagementFee: value })} /></div></label><label className="toggle-row"><span><strong>Permitir ajuste de precio</strong><small>Operadores pueden cambiar una cotización antes de confirmarla.</small></span><input type="checkbox" checked={settings.allowOperatorPriceOverride} onChange={(event) => onUpdate({ allowOperatorPriceOverride: event.target.checked })} /><i /></label><label className="settings-input">Cobro si se cancela después de comprar<select value={settings.cancellationAfterPurchaseRule} onChange={(event) => onUpdate({ cancellationAfterPurchaseRule: event.target.value as CompanySettings["cancellationAfterPurchaseRule"] })}><option value="product_management_delivery">Producto + gestión + delivery</option><option value="product_management">Producto + gestión</option><option value="product_only">Solo producto</option><option value="manual">Lo decide el administrador</option><option value="none">No cobrar</option></select></label></section></div>;
}

function DriverSettings({ settings, onUpdate }: { settings: CompanySettings; onUpdate: (patch: Partial<CompanySettings>) => void }) {
  return <div className="settings-stack"><section className="settings-card"><h3>Políticas de la PWA</h3><label className="toggle-row"><span><strong>OTP para finalizar</strong><small>El motorizado necesita el código que recibe el administrador para completar una entrega.</small></span><input type="checkbox" checked={settings.otpDeliveryRequired} onChange={(event) => onUpdate({ otpDeliveryRequired: event.target.checked })} /><i /></label><label className="settings-input">Compartir ubicación<select value={settings.gpsSharingMode} onChange={(event) => onUpdate({ gpsSharingMode: event.target.value as CompanySettings["gpsSharingMode"] })}><option value="active_orders_only">Solo con pedido aceptado</option><option value="active_shift">Durante toda la jornada</option></select></label><label className="settings-input">Alerta de desvío de ruta<div><NumericInput min={50} value={settings.routeDeviationThresholdM} onValueChange={(value) => onUpdate({ routeDeviationThresholdM: value })} /><b>metros</b></div></label></section></div>;
}

function FleetSettings({ settings, onUpdate }: { settings: CompanySettings; onUpdate: (patch: Partial<CompanySettings>) => void }) {
  return <div className="settings-stack"><section className="settings-card"><h3>Mantenimiento preventivo</h3><p className="panel-subtitle">La PWA bloquea el inicio de jornada cuando el vehículo alcanza este kilometraje.</p><label className="settings-input">Intervalo de mantenimiento<div><NumericInput min={100} value={settings.maintenanceIntervalKm} onValueChange={(value) => onUpdate({ maintenanceIntervalKm: value })} /><b>km</b></div></label><div className="settings-info"><Wrench size={19} weight="fill" /> Solo el administrador puede habilitar un vehículo que requiere mantenimiento.</div></section></div>;
}

function InfoCard({ title, description, rows }: { title: string; description: string; rows: [string, string][] }) {
  return <div className="settings-stack"><section className="settings-card"><h3>{title}</h3><p className="panel-subtitle">{description}</p>{rows.map(([label, value]) => <div className="settings-row-input" key={label}><span><strong>{label}</strong></span><div><input aria-label={label} value={value} readOnly /></div></div>)}</section></div>;
}
