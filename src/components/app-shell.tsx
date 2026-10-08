"use client";

import {
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
import { NotificationCenter } from "@/components/notification-center";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

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

type AdminProfile = { name: string; role: string; initials: string };

export function AdminShell({ children, companyName, whatsappConnected, profile }: { children: ReactNode; companyName: string; whatsappConnected: boolean; profile: AdminProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  async function logout() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

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
            <Link className="whatsapp-status" href="/admin/configuracion" title="Abrir configuración de WhatsApp"><span className={whatsappConnected ? "" : "is-offline"} /> {whatsappConnected ? "WhatsApp conectado" : "WhatsApp pendiente"}</Link>
            <NotificationCenter />
            <div className="profile-menu-wrap">
              <button className="user-menu" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((current) => !current)}>
                <span className="avatar avatar-navy">{profile.initials}</span>
                <span className="user-copy"><strong>{profile.name}</strong><small>{profile.role}</small></span>
                <CaretDown size={16} />
              </button>
              {profileOpen ? <div className="profile-popover"><div><span className="avatar avatar-navy">{profile.initials}</span><p><strong>{profile.name}</strong><small>{companyName} · {profile.role}</small></p></div><Link href="/admin/configuracion" onClick={() => setProfileOpen(false)}>Configuración de la cuenta</Link><Link href="/admin/configuracion" onClick={() => setProfileOpen(false)}>Datos de la empresa</Link><button type="button" onClick={() => { void logout(); }}>Cerrar sesión</button></div> : null}
            </div>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
