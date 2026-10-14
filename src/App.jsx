import { useEffect, useRef, useState } from "react";
import {
  Bell, CalendarBlank, CaretRight, Check, ClipboardText, CurrencyCircleDollar,
  GasPump, House, Info, ListBullets, LockKey, MapPin, Motorcycle, NavigationArrow,
  Person, SignOut, UserCircle, Wrench, X,
} from "@phosphor-icons/react";

const navItems = [
  { id: "home", label: "Inicio", icon: House },
  { id: "activity", label: "Actividad", icon: ListBullets },
  { id: "profile", label: "Perfil", icon: UserCircle },
];
const deliveries = [
  { id: "DEL-20261006-A7K2", place: "Pollos Asados El Masayita", amount: "C$60", distance: "12 km" },
  { id: "DEL-20261006-B3L9", place: "Farmacia San Rafael", amount: "C$60", distance: "14 km" },
];
function Icon({ icon: IconComponent, size = 20, weight = "regular", ...props }) {
  return <IconComponent size={size} weight={weight} {...props} />;
}
function Brand({ compact = false }) {
  return <div className={compact ? "brand brand-compact" : "brand"}><Icon icon={Motorcycle} size={compact ? 24 : 28} weight="fill" /><span>Tudelivery Motor<strong>izado</strong></span></div>;
}
function Toggle({ checked, onChange, label }) {
  return <button className={checked ? "switch is-on" : "switch"} onClick={onChange} aria-pressed={checked}>{label && <span>{label}</span>}<i aria-hidden="true" /></button>;
}
function TopHeader({ onProfile }) {
  return <header className="app-header"><Brand compact /><button className="initials" onClick={onProfile} aria-label="Abrir perfil">LR</button></header>;
}
function BottomNav({ active, onNavigate }) {
  return <nav className="bottom-nav" aria-label="Navegación de la PWA">{navItems.map(({ id, label, icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon icon={icon} size={25} weight={active === id ? "fill" : "regular"} /><span>{label}</span></button>)}</nav>;
}
function HomePage({ available, onToggleAvailable, onNavigate, onToast }) {
  return <div className="page-stack"><TopHeader onProfile={() => onNavigate("profile")} /><main className="page-body home-body"><h1>Buenos días, Luis</h1>
    <section className="availability-card"><div className="availability-copy"><div className="availability-title"><span className="status-dot" />Disponible</div><p>Jornada activa desde las 08:05</p></div><Toggle checked={available} onChange={() => { onToggleAvailable(); onToast(available ? "Ya no recibirás pedidos" : "Ahora puedes recibir pedidos"); }} label="Recibir pedidos" /></section>
    <section className="empty-card"><picture><source srcSet="/assets/empty-delivery.webp" type="image/webp" /><img width="768" height="512" src="/assets/empty-delivery.png" alt="Motocicleta y casco listos para entregar" /></picture><h2>Estás listo para recibir servicios</h2><p>Cuando te asignen un pedido, aparecerá aquí.</p><div className="gps-note"><Icon icon={MapPin} size={20} weight="fill" /> GPS activo durante tu jornada</div></section>
    <section className="day-card"><h2>Tu jornada de hoy</h2><div className="vehicle-line"><Icon icon={Motorcycle} size={42} weight="fill" /><div><strong>Yamaha FZ 150 · M-12345</strong><div className="badges"><span>Operativa</span><span className="fuel-badge"><Icon icon={GasPump} size={16} weight="fill" /> Tanque ¾</span></div></div></div><div className="journey-stats two-cols"><div><span>Salida</span><strong>24,920 km</strong></div><div><span>Recorrido</span><strong>0 km</strong></div></div><div className="journey-stats three-cols"><div><Icon icon={ClipboardText} size={25} /><span>Pedidos<strong>0</strong></span></div><div><Icon icon={GasPump} size={25} /><span>Combustible<strong>0 L</strong></span></div><div><Icon icon={CurrencyCircleDollar} size={25} /><span>Ganancia<strong>C$0</strong></span></div></div></section>
    <section className="quick-actions"><h2>Acciones rápidas</h2><ActionRow icon={GasPump} label="Registrar carga de combustible" onClick={() => onToast("Registro de combustible abierto")} /><ActionRow icon={ListBullets} label="Ver jornada y kilometraje" onClick={() => onNavigate("activity")} /><ActionRow icon={SignOut} label="Finalizar jornada" danger onClick={() => onToast("Jornada finalizada")} /></section>
    <div className="vehicle-ok"><span><Check size={22} weight="bold" /></span><div><strong>Vehículo al día</strong><small>Próximo cambio de aceite en 2,420 km</small></div></div>
  </main></div>;
}
function ActionRow({ icon, label, danger, onClick }) {
  return <button className={danger ? "action-row danger" : "action-row"} onClick={onClick}><Icon icon={icon} size={26} weight="regular" /><strong>{label}</strong><Icon icon={CaretRight} size={22} /></button>;
}
function ActivityPage() {
  return <div className="page-stack"><div className="green-strip"><span>Tudelivery Motor<strong>izado</strong></span></div><main className="page-body activity-body"><div className="page-title-row"><h1>Actividad</h1><button className="date-chip"><Icon icon={CalendarBlank} size={19} /> Hoy <span>⌄</span></button></div><div className="activity-summary"><div>Pedidos<strong>3</strong></div><div>Recorrido<strong>42 km</strong></div><div>Ganancia<strong>C$180</strong></div></div><div className="timeline">{deliveries.map((delivery) => <ActivityItem key={delivery.id} icon={Check} title={delivery.id} detail={delivery.place} meta={delivery.amount + " · " + delivery.distance} done />)}<ActivityItem icon={GasPump} title="Carga de combustible" detail="12 L · C$1,200" meta="24,880 km" /><ActivityItem icon={NavigationArrow} title="Jornada iniciada" detail="Salida 24,854 km · 08:05" /></div><button className="history-button"><ListBullets size={23} /> Ver historial completo <CaretRight size={21} /></button></main></div>;
}
function ActivityItem({ icon, title, detail, meta, done }) {
  return <article className={done ? "activity-item done" : "activity-item"}><span className="timeline-icon"><Icon icon={icon} size={20} weight="bold" /></span><div className="activity-card"><div className="activity-card-title"><strong>{title}</strong><span>{done ? "Entregado" : "Registrada"}</span></div><p>{detail}</p>{meta && <small>{meta}</small>}<CaretRight className="activity-arrow" size={20} /></div></article>;
}
function ProfilePage({ biometric, notifications, onToggleBiometric, onToggleNotifications, onToast }) {
  return <div className="page-stack"><div className="green-strip"><span>Tudelivery Motor<strong>izado</strong></span></div><main className="page-body profile-body"><h1>Perfil</h1><section className="profile-card"><span className="profile-avatar">LR</span><div><strong>Luis Rodríguez</strong><p>+505 8888 1234</p><span className="available-pill"><i /> Disponible</span></div></section>
    <SectionLabel>Mi vehículo</SectionLabel><section className="settings-card"><div className="settings-line"><Icon icon={Motorcycle} size={27} weight="fill" /><div><strong>Yamaha FZ 150 · M-12345</strong><span className="green-caption"><i /> Operativa</span></div><CaretRight size={20} /></div><div className="settings-line"><Wrench size={23} /><span>Mantenimiento al día</span><CaretRight size={20} /></div></section>
    <SectionLabel>Documentos</SectionLabel><section className="settings-card"><div className="settings-line"><ClipboardText size={23} /><div><strong>Licencia de conducir</strong><span>Vigente hasta 18 ago 2027</span></div><CaretRight size={20} /></div><div className="settings-line"><Person size={23} /><div><strong>Identificación</strong><span>Verificada</span></div><CaretRight size={20} /></div></section>
    <SectionLabel>Seguridad y permisos</SectionLabel><section className="settings-card"><div className="settings-line"><LockKey size={23} /><span>Biometría</span><Toggle checked={biometric} onChange={() => { onToggleBiometric(); onToast("Preferencia de biometría actualizada"); }} /></div><div className="settings-line"><Bell size={23} /><span>Notificaciones</span><Toggle checked={notifications} onChange={() => { onToggleNotifications(); onToast("Preferencia de notificaciones actualizada"); }} /></div><div className="settings-line"><MapPin size={23} /><span>Ubicación durante pedidos activos</span><small>Permitida</small><CaretRight size={19} /></div></section><div className="profile-actions"><button type="button" onClick={() => onToast("Soporte disponible")}><Info size={21} /> Contactar soporte</button><button type="button" className="logout" onClick={() => onToast("Sesión cerrada")}><SignOut size={21} /> Cerrar sesión</button></div>
  </main></div>;
}
function SectionLabel({ children }) { return <h2 className="section-label">{children}</h2>; }
function ActivationPage({ onActivated }) {
  const [pin, setPin] = useState("");
  const valid = pin.length === 6;
  return <div className="activation-screen"><Brand /><div className="activation-body"><p className="eyebrow">INVITACIÓN PERSONAL</p><h1>Crea tu acceso seguro</h1><p className="activation-copy">Tu PIN protege el acceso a tu jornada y tus pedidos.</p><label htmlFor="pin-0">PIN de 6 dígitos</label><div className="pin-row">{Array.from({ length: 6 }).map((_, index) => <input id={`pin-${index}`} key={index} aria-label={`Dígito ${index + 1} del PIN`} maxLength={1} inputMode="numeric" value={pin[index] || ""} onChange={(event) => { const next = pin.slice(0, index) + event.target.value.replace(/\D/g, "").slice(-1) + pin.slice(index + 1); setPin(next); }} />)}</div><div className="biometric-note"><Check size={19} weight="bold" /> Usar biometría en este teléfono</div><div className="permissions"><strong>Permisos necesarios para operar</strong><span><MapPin size={20} weight="fill" /> Ubicación durante pedidos activos <Check size={18} weight="bold" /></span><span><Bell size={20} /> Notificaciones de nuevos servicios <Check size={18} weight="bold" /></span></div><button type="button" className="activate-button" disabled={!valid} onClick={onActivated}>Activar y abrir PWA</button><div className="personal-note"><Person size={20} /> Cuenta personal de Luis Rodríguez<br /><LockKey size={20} /> No requiere la cuenta del administrador</div></div></div>;
}
export function App() {
  const [active, setActive] = useState("home");
  const [available, setAvailable] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [showActivation, setShowActivation] = useState(window.location.pathname === "/activar");
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const notify = (message) => { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 2200); };
  const navigate = (next) => setActive(next);
  const page = active === "activity" ? <ActivityPage /> : active === "profile" ? <ProfilePage biometric={biometric} notifications={notifications} onToggleBiometric={() => setBiometric((value) => !value)} onToggleNotifications={() => setNotifications((value) => !value)} onToast={notify} /> : <HomePage available={available} onToggleAvailable={() => setAvailable((value) => !value)} onNavigate={navigate} onToast={notify} />;
  return <div className="pwa-stage"><div className="phone-app">{showActivation ? <ActivationPage onActivated={() => { setShowActivation(false); notify("Cuenta activada correctamente"); }} /> : <><div className="app-scroll">{page}</div><BottomNav active={active} onNavigate={navigate} /><button type="button" className="activation-link" onClick={() => setShowActivation(true)} aria-label="Abrir pantalla de activación">Activación</button></>}</div>{toast && <div className="toast" role="status" aria-live="polite"><Check size={16} weight="bold" />{toast}<button type="button" aria-label="Cerrar aviso" onClick={() => setToast("")}><X size={14} /></button></div>}</div>;
}
