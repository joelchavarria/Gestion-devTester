"use client";

import {
  Bell,
  CaretDown,
  ChartBar,
  ChatCenteredText,
  GearSix,
  House,
  MapTrifold,
  Motorcycle,
  Package,
  Tag,
  Truck,
  WarningCircle,
} from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/admin", label: "Inicio", icon: House },
  { href: "/admin/conversaciones", label: "Conversaciones", icon: ChatCenteredText, dot: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/mapa", label: "Mapa en vivo", icon: MapTrifold },
  { href: "/admin/motorizados", label: "Motorizados", icon: Motorcycle },
  { href: "/admin/vehiculos", label: "Vehículos", icon: Truck },
  { href: "/admin/tarifas", label: "Tarifas", icon: Tag },
  { href: "/admin/incidencias", label: "Incidencias", icon: WarningCircle },
  { href: "/admin/reportes", label: "Reportes", icon: ChartBar },
  { href: "/admin/configuracion", label: "Configuración", icon: GearSix },
];

export function AdminShell({ children, companyName, whatsappConnected }: { children: ReactNode; companyName: string; whatsappConnected: boolean }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/admin" aria-label="Ir al inicio de Tudelivery">
          <span className="brand-mark"><Motorcycle size={28} weight="fill" /></span>
          <span>
            <strong>Tudelivery</strong>
            <small>Entregas que conectan</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigation.map((item) => {
            const selected = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} className={clsx("nav-link", selected && "is-active")} href={item.href}>
                <Icon size={21} weight={selected ? "fill" : "regular"} />
                <span>{item.label}</span>
                {item.dot ? <span className="nav-dot" aria-label="Nuevos mensajes" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-help">
          <span className="mini-rule" />
          <p>Tu negocio<br />siempre en movimiento</p>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <button className="company-switcher" type="button">
            <span className="company-icon"><Truck size={18} weight="fill" /></span>
            <strong>{companyName}</strong>
            <CaretDown size={16} />
          </button>
          <div className="topbar-actions">
            <span className="whatsapp-status"><span className={whatsappConnected ? "" : "is-offline"} /> {whatsappConnected ? "WhatsApp conectado" : "WhatsApp pendiente"}</span>
            <button className="icon-button has-notification" type="button" aria-label="Ver notificaciones">
              <Bell size={21} />
              <i>3</i>
            </button>
            <button className="user-menu" type="button">
              <span className="avatar avatar-navy">AD</span>
              <span className="user-copy"><strong>Administrador</strong><small>Propietario</small></span>
              <CaretDown size={16} />
            </button>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
