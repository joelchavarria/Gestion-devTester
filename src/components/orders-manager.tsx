"use client";

import { Badge, PageHeader } from "@/components/ui";
import { currency, titleCaseStatus } from "@/lib/format";
import type { AdminBootstrap } from "@/lib/operations/types";
import { DownloadSimple, Funnel, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import Link from "next/link";

const orderTone = (status: string): "green" | "blue" | "amber" | "red" | "neutral" => {
  if (status === "delivered") return "green";
  if (status === "cancelled") return "red";
  if (["awaiting_confirmation", "pending_assignment", "picking_up"].includes(status)) return "amber";
  if (["assigned", "to_merchant", "to_customer", "confirmed"].includes(status)) return "blue";
  return "neutral";
};

export function OrdersManager({ data }: { data: AdminBootstrap }) {
  const pending = data.orders.filter((order) => ["awaiting_confirmation", "pending_assignment", "assigned"].includes(order.status)).length;
  const inRoute = data.orders.filter((order) => ["to_merchant", "picking_up", "to_customer"].includes(order.status)).length;
  const delivered = data.orders.filter((order) => order.status === "delivered").length;
  const cancelled = data.orders.filter((order) => order.status === "cancelled").length;

  return <><PageHeader title="Pedidos" description="Controla cada servicio desde la confirmación hasta la entrega." actions={<Link className="button button-primary" href="/admin/conversaciones"><Plus size={18} weight="bold" /> Nuevo pedido</Link>} /><section className="panel"><div className="toolbar"><label className="search-field"><MagnifyingGlass size={19} /><input placeholder="Buscar por pedido, cliente o teléfono" /></label><button className="button button-secondary" type="button"><Funnel size={18} /> Filtros</button><button className="button button-secondary" type="button"><DownloadSimple size={18} /> Exportar</button></div><div className="filter-pills"><button className="filter-pill active" type="button">Todos <b>{data.orders.length}</b></button><button className="filter-pill" type="button">Pendientes <b>{pending}</b></button><button className="filter-pill" type="button">En ruta <b>{inRoute}</b></button><button className="filter-pill" type="button">Entregados <b>{delivered}</b></button><button className="filter-pill" type="button">Cancelados <b>{cancelled}</b></button></div><div className="table-wrap"><table className="data-table orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Servicio</th><th>Motorizado</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead><tbody>{data.orders.length ? data.orders.map((order) => <tr key={order.id}><td><span className="order-id"><strong>{order.number}</strong></span><small>{new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.createdAt))}</small></td><td><strong>{order.customerName}</strong><small>{order.address}</small></td><td>{order.serviceType === "delivery" ? "Delivery" : order.serviceType === "errand" ? "Mandado / compra" : "Paquete"}</td><td>{order.driverName ?? <span className="muted">Sin asignar</span>}</td><td><strong>{order.paymentMethod === "bank_transfer" ? "Transferencia" : "Efectivo"}</strong><small>{order.paymentMethod === "bank_transfer" ? order.transferStatus === "validated" ? "Validada" : "Pendiente de validar" : order.changeDue ? `Vuelto ${currency(order.changeDue)}` : "Exacto"}</small></td><td><strong>{currency(order.total)}</strong></td><td><Badge tone={orderTone(order.status)}>{titleCaseStatus(order.status)}</Badge></td></tr>) : <tr><td colSpan={7}><div className="empty-table">Aún no hay pedidos. Crea uno desde Conversaciones.</div></td></tr>}</tbody></table></div></section></>;
}
