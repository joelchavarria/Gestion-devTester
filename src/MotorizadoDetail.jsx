import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUDownLeft, Bell, CalendarBlank, CaretDown, Car, ChartBar,
  ChartLineUp, Check, CheckCircle, Chats, ClipboardText, Clock, Engine, Gauge,
  Gear, House, LockSimple, MapPin, Motorcycle, NavigationArrow, Phone, Play,
  RoadHorizon, ShieldCheck, Storefront, Tag, UserCircle, Warning,
  Wrench, XCircle,
} from "@phosphor-icons/react";
import "./motorizado-detail.css";

const navItems = [
  ["Inicio", House], ["Conversaciones", Chats], ["Pedidos", ClipboardText],
  ["Mapa en vivo", MapPin], ["Motorizados", Motorcycle], ["Vehículos", Car],
  ["Tarifas", Tag], ["Incidencias", Warning], ["Reportes", ChartBar], ["Configuración", Gear],
];
const recent = [["14 abr 2025", "24,854", "24,920", "66 km"], ["13 abr 2025", "24,788", "24,854", "66 km"], ["12 abr 2025", "24,729", "24,788", "59 km"]];
const maint = [["10 ene 2025", "Cambio de aceite", "23,500 km"], ["10 ene 2025", "Revisión de frenos", "23,500 km"]];

function SectionTitle({ icon: Icon, children }) { return <div className="md-section-title"><Icon aria-hidden="true" size={21} weight="duotone" /><h2>{children}</h2></div>; }
function Metric({ icon: Icon, label, value, amber = false }) { return <article className="md-metric"><div className={`md-metric-icon ${amber ? "amber" : ""}`}><Icon aria-hidden="true" size={29} weight="duotone" /></div><div><div className="md-metric-label">{label}</div><strong className={amber ? "amber-text" : ""}>{value}</strong></div></article>; }
function Status() { return <b className="md-status">Completada</b>; }
function Table({ rows, maintenance = false }) {
  const headers = maintenance ? ["Fecha", "Mantenimiento", "Kilometraje", "Estado"] : ["Fecha", "Salida (km)", "Regreso (km)", "Recorrido", "Estado"];
  return <div className={`md-table ${maintenance ? "md-maint-table" : ""}`} role="table" aria-label={maintenance ? "Historial de mantenimientos" : "Historial reciente de recorridos"}>
    <div className="md-table-row md-table-head" role="row">{headers.map((header) => <span key={header} role="columnheader">{header}</span>)}</div>
    {rows.map((row) => <div className="md-table-row" role="row" key={row.join("-")}>{row.map((value, index) => <span key={`${row.join("-")}-${value}`} role="cell">{index === row.length - 1 ? <Status /> : value}</span>)}</div>)}
  </div>;
}

export function MotorizadoDetail() {
  const [active, setActive] = useState("Motorizados");
  const [toast, setToast] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const toastTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) clearTimeout(toastTimeoutRef.current);
  }, []);
  const notify = (message) => {
    setToast(message);
    if (toastTimeoutRef.current !== null) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast("");
      toastTimeoutRef.current = null;
    }, 3000);
  };
  const action = (message) => notify(message);
  return <div className="md-app">
    <aside className="md-sidebar">
      <div className="md-brand"><span className="md-brand-mark"><i /><i /></span><b>Tudelivery</b></div>
      <nav aria-label="Navegación principal">{navItems.map(([label, Icon]) => <button key={label} type="button" className={active === label ? "is-active" : ""} aria-current={active === label ? "page" : undefined} onClick={() => { setActive(label); if (label !== "Motorizados") notify(`${label} seleccionado`); }}><Icon aria-hidden="true" size={23} weight={active === label ? "fill" : "regular"} /><span>{label}</span></button>)}</nav>
    </aside>
    <main className="md-main">
      <header className="md-topbar"><div className="md-browser"><span><LockSimple aria-hidden="true" size={12} weight="fill" /> app.tudelivery.com</span></div><div className="md-top-actions"><button type="button" className="md-store" onClick={() => notify("Tienda: Sabores de Granada")}><Storefront aria-hidden="true" size={22} weight="duotone" /> Sabores de Granada <CaretDown aria-hidden="true" size={15} /></button><button type="button" className="md-notification" aria-label="Notificaciones, 3 nuevas" onClick={() => notify("Tienes 3 notificaciones nuevas")}><Bell aria-hidden="true" size={22} weight="duotone" /><b aria-hidden="true">3</b></button><button type="button" className="md-profile" onClick={() => notify("Perfil de Javier Morales")}><span aria-hidden="true">JM</span> Javier Morales <CaretDown aria-hidden="true" size={15} /></button></div></header>
      <div className="md-content">
        <nav className="md-breadcrumbs" aria-label="Ruta de navegación"><span>Motorizados</span><i aria-hidden="true">/</i><b aria-current="page">Luis Rodríguez</b></nav>
        <section className="md-profile-head"><div className="md-identity"><div className="md-avatar"><UserCircle aria-hidden="true" size={72} weight="duotone" /></div><div><div className="md-name"><h1>Luis Rodríguez</h1><span><i aria-hidden="true" /> Disponible</span></div><div className="md-phone"><Phone aria-hidden="true" size={18} weight="fill" /> +505 8888 1234</div></div></div><div className="md-head-actions"><button type="button" className="md-primary" onClick={() => action("Salida registrada para Luis Rodríguez")}><Play aria-hidden="true" size={19} weight="fill" /> Registrar salida</button><button type="button" className="md-outline" onClick={() => action("Regreso registrado para Luis Rodríguez")}><ArrowUDownLeft aria-hidden="true" size={21} weight="bold" /> Registrar regreso</button></div></section>
        <section className="md-metrics"><Metric icon={Gauge} label="Kilometraje actual" value="24,920 km" /><Metric icon={RoadHorizon} label="Recorrido hoy" value="66 km" /><Metric icon={Wrench} label="Próximo mantenimiento" value="25,000 km" /><Metric icon={NavigationArrow} label="Restan" value="80 km" amber /></section>
        <section className="md-detail-grid">
          <article className="md-panel md-vehicle"><SectionTitle icon={Car}>Vehículo asignado</SectionTitle><span className="md-operational"><CheckCircle aria-hidden="true" size={16} weight="fill" /> Operativo</span><div className="md-bike"><picture><source srcSet="/assets/black-motorcycle.webp" type="image/webp" /><img width="768" height="512" src="/assets/black-motorcycle.png" alt="Motocicleta Yamaha FZ 150" /></picture></div><b>Yamaha FZ 150</b><strong>M-12345</strong><small>Modelo 2023</small></article>
          <article className="md-panel md-shift"><SectionTitle icon={CalendarBlank}>Jornada de hoy</SectionTitle><div className="md-shift-card"><div><span>Salida</span><b>24,854 km</b><span>08:05</span></div><div><span>Regreso</span><b>24,920 km</b><span>18:12</span></div><footer><b>Recorrido total</b><strong>66 km</strong></footer></div><button type="button" className="md-link" onClick={() => notify("Historial de kilometraje abierto")}><ChartLineUp aria-hidden="true" size={20} weight="bold" /> Ver historial de kilometraje <ArrowRight aria-hidden="true" size={17} weight="bold" /></button></article>
          <article className="md-panel md-maintenance"><SectionTitle icon={Wrench}>Mantenimiento</SectionTitle><div className="md-warning"><Warning aria-hidden="true" size={22} weight="fill" /><b>Mantenimiento requerido antes de la próxima jornada</b></div><p>El cambio de aceite vence en 80 km y la ruta estimada de mañana es de 95 km.</p><div className="md-maint-item"><span className="oil"><Engine aria-hidden="true" size={20} weight="duotone" /></span><div><b>Cambio de aceite</b><small>Programado para mañana, 08:00</small></div></div><div className="md-maint-item"><span className="ok"><Check aria-hidden="true" size={20} weight="bold" /></span><div><b>Frenos</b><small>revisados hace 1,200 km</small></div></div><div className="md-maint-actions"><button type="button" onClick={() => action("Programación de mantenimiento abierta")}>Programar mantenimiento</button><button type="button" onClick={() => action("Cambio de aceite registrado")}>Registrar cambio de aceite</button></div></article>
          <article className="md-panel md-authorization"><SectionTitle icon={ShieldCheck}>Autorización de salida</SectionTitle>{authorized ? <div className="md-auth-success" aria-live="polite" aria-atomic="true"><CheckCircle aria-hidden="true" size={38} weight="fill" /><div><b>Salida autorizada excepcionalmente</b><p>La autorización queda registrada para mañana.</p></div></div> : <div className="md-auth-alert" aria-live="polite" aria-atomic="true"><XCircle aria-hidden="true" size={38} weight="fill" /><div><b>No autorizar salida mañana</b><p>Primero debe completarse el mantenimiento programado.</p></div></div>}<button type="button" onClick={() => action("Orden de mantenimiento abierta")}>Ver orden de mantenimiento</button><button type="button" onClick={() => { setAuthorized(true); action("Salida autorizada excepcionalmente"); }}>Autorizar excepcionalmente</button></article>
        </section>
        <section className="md-history"><article className="md-panel"><SectionTitle icon={Clock}>Historial reciente</SectionTitle><Table rows={recent} /></article><article className="md-panel"><SectionTitle icon={Wrench}>Historial de mantenimientos</SectionTitle><Table rows={maint} maintenance /></article></section>
      </div>
    </main>
    {toast && <div className="md-toast" role="status" aria-live="polite" aria-atomic="true"><CheckCircle aria-hidden="true" size={18} weight="fill" /> {toast}</div>}
  </div>;
}
