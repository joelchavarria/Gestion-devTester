"use client";

import { Bell, Check, WarningCircle } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: unknown;
  read_at: string | null;
  created_at: string;
};

export function NotificationCenter({ variant = "admin" }: { variant?: "admin" | "driver" }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const unread = items.filter((item) => !item.read_at).length;

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("No fue posible cargar las notificaciones.");
      const payload = await response.json() as { notifications: NotificationItem[] };
      setItems(payload.notifications);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No fue posible cargar las notificaciones.");
        return response.json() as Promise<{ notifications: NotificationItem[] }>;
      })
      .then((payload) => { if (active) setItems(payload.notifications); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markAllRead() {
    const ids = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!ids.length) return;
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, read_at: readAt } : item));
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  return <div className={clsx("notification-center", variant === "driver" && "is-driver")}>
    <button className={clsx(variant === "admin" && "icon-button", unread > 0 && "has-notification")} type="button" aria-label="Ver notificaciones" aria-expanded={open} onClick={toggle}>
      <Bell size={21} />
      {unread > 0 ? variant === "admin" ? <i>{unread > 9 ? "9+" : unread}</i> : <i /> : null}
    </button>
    {open ? <section className="notification-popover" aria-label="Notificaciones recientes">
      <header><div><strong>Notificaciones</strong><small>{unread ? `${unread} sin leer` : "Todo al día"}</small></div>{unread ? <button type="button" onClick={() => { void markAllRead(); }}><Check size={15} /> Marcar leídas</button> : null}</header>
      <div className="notification-list">
        {loading && !items.length ? <p className="notification-empty">Cargando notificaciones…</p> : items.length ? items.map((item) => <Link className={clsx("notification-item", !item.read_at && "is-unread")} href={notificationHref(item.kind, variant)} key={item.id} onClick={() => setOpen(false)}><span><WarningCircle size={18} weight={item.read_at ? "regular" : "fill"} /></span><div><strong>{item.title}</strong>{item.body ? <p>{item.body}</p> : null}<small>{formatDate(item.created_at)}</small></div></Link>) : <p className="notification-empty">No tienes notificaciones todavía.</p>}
      </div>
    </section> : null}
  </div>;
}

function notificationHref(kind: string, variant: "admin" | "driver") {
  if (variant === "driver") return "/driver";
  if (kind.includes("route") || kind.includes("deviation")) return "/admin/mapa";
  if (kind.includes("incident")) return "/admin/incidencias";
  if (kind.includes("maintenance")) return "/admin/vehiculos";
  return "/admin/pedidos";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
