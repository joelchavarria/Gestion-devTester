"use client";

import { Avatar, Badge, PageHeader } from "@/components/ui";
import { currency, titleCaseStatus } from "@/lib/format";
import type { AdminBootstrap, OperationalDriver, OperationalOrder } from "@/lib/operations/types";
import { CheckCircle, DownloadSimple, Funnel, GasPump, MagnifyingGlass, Motorcycle, Plus, Star, UserPlus, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type OrderFilter = "all" | "pending" | "route" | "delivered" | "cancelled";
type DriverFilter = "available" | "busy" | "offline";

const dateTimeFormatter = new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" });
const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

const orderTone = (status: string): "green" | "blue" | "amber" | "red" | "neutral" => {
  if (status === "delivered") return "green";
  if (status === "cancelled") return "red";
  if (["awaiting_confirmation", "pending_assignment", "picking_up"].includes(status)) return "amber";
  if (["assigned", "to_merchant", "to_customer", "confirmed"].includes(status)) return "blue";
  return "neutral";
};

const serviceLabel = (serviceType: OperationalOrder["serviceType"]) => serviceType === "delivery"
  ? "Delivery"
  : serviceType === "errand"
    ? "Compra y entrega"
    : "Envío de paquete";

const isDriverAvailable = (driver: OperationalDriver) => driver.status === "available" && Boolean(driver.activeShift) && driver.vehicle?.status === "active";

export function OrdersManager({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [orderOverrides, setOrderOverrides] = useState<Record<string, OperationalOrder>>({});
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [assignableOnly, setAssignableOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverFilter, setDriverFilter] = useState<DriverFilter>("available");
  const [driverQuery, setDriverQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const orders = useMemo(() => data.orders.map((order) => orderOverrides[order.id] ?? order), [data.orders, orderOverrides]);
  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) ?? null : null;
  const pending = orders.filter((order) => ["awaiting_confirmation", "pending_assignment", "assigned", "confirmed"].includes(order.status)).length;
  const inRoute = orders.filter((order) => ["to_merchant", "picking_up", "to_customer"].includes(order.status)).length;
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return orders.filter((order) => {
      const matchesStatus = filter === "all"
        || (filter === "pending" && ["awaiting_confirmation", "confirmed", "pending_assignment", "assigned"].includes(order.status))
        || (filter === "route" && ["to_merchant", "picking_up", "to_customer"].includes(order.status))
        || (filter === "delivered" && order.status === "delivered")
        || (filter === "cancelled" && order.status === "cancelled");
      const matchesAssignable = !assignableOnly || ["confirmed", "pending_assignment"].includes(order.status);
      const matchesQuery = !normalizedQuery || [order.number, order.customerName, order.customerPhone, order.merchantName ?? "", order.address]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
      return matchesStatus && matchesAssignable && matchesQuery;
    });
  }, [assignableOnly, filter, orders, query]);

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = driverQuery.trim().toLocaleLowerCase("es");
    return data.drivers.filter((driver) => {
      const category: DriverFilter = isDriverAvailable(driver) ? "available" : driver.status === "busy" ? "busy" : "offline";
      const matchesQuery = !normalizedQuery || [driver.name, driver.phone, driver.vehicle?.label ?? "", driver.vehicle?.plate ?? ""]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
      return category === driverFilter && matchesQuery;
    });
  }, [data.drivers, driverFilter, driverQuery]);

  const availableDrivers = data.drivers.filter(isDriverAvailable);

  async function request(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as Record<string, unknown> & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No fue posible completar la operación.");
    return payload;
  }

  function openAssignment(order: OperationalOrder) {
    setSelectedOrderId(order.id);
    setSelectedDriverId(availableDrivers[0]?.id ?? "");
    setDriverFilter("available");
    setDriverQuery("");
    setError(null);
  }

  async function assignOrder() {
    if (!selectedOrder || !selectedDriverId) return;
    const driver = data.drivers.find((candidate) => candidate.id === selectedDriverId);
    if (!driver || !isDriverAvailable(driver)) {
      setError("Selecciona un motorizado disponible con jornada y vehículo operativo.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await request(`/api/admin/orders/${selectedOrder.id}/assign`, { driverId: selectedDriverId }) as { otpCode: string; expiresAt: string };
      setOrderOverrides((current) => ({
        ...current,
        [selectedOrder.id]: {
          ...selectedOrder,
          status: "assigned",
          driverId: driver.id,
          driverName: driver.name,
          assignedAt: new Date().toISOString(),
        },
      }));
      let customerNotified = false;
      if (selectedOrder.conversationId) {
        try {
          await request("/api/whatsapp/send", {
            conversationId: selectedOrder.conversationId,
            body: `Tu pedido ${selectedOrder.number} fue asignado a ${driver.name}. Te avisaremos cuando inicie la ruta.`,
          });
          customerNotified = true;
        } catch {
          customerNotified = false;
        }
      }
      setNotice(`Pedido asignado a ${driver.name}. OTP de entrega: ${result.otpCode}.${customerNotified ? " Cliente notificado." : " Aviso al cliente pendiente."}`);
      setSelectedOrderId(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible asignar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  function exportOrders() {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ["Pedido", "Cliente", "Teléfono", "Servicio", "Comercio", "Destino", "Motorizado", "Pago", "Total", "Estado"],
      ...filteredOrders.map((order) => [order.number, order.customerName, order.customerPhone, serviceLabel(order.serviceType), order.merchantName ?? "", order.address, order.driverName ?? "", order.paymentMethod === "cash" ? "Efectivo" : "Transferencia", order.total, titleCaseStatus(order.status)]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <PageHeader title="Pedidos" description="Confirma, asigna y da seguimiento a cada servicio." actions={<Link className="button button-primary" href="/admin/conversaciones"><Plus size={18} weight="bold" /> Nuevo pedido</Link>} />
    <section className="panel">
      {notice ? <p className="form-notice" role="status">{notice}</p> : null}
      <div className="toolbar"><label className="search-field"><MagnifyingGlass size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente, teléfono o comercio" /></label><button className={clsx("button", assignableOnly ? "button-primary" : "button-secondary")} type="button" onClick={() => setAssignableOnly((current) => !current)}><Funnel size={18} /> {assignableOnly ? "Solo asignables" : "Filtrar asignables"}</button><button className="button button-secondary" type="button" onClick={exportOrders}><DownloadSimple size={18} /> Exportar</button></div>
      <div className="filter-pills"><button className={clsx("filter-pill", filter === "all" && "active")} type="button" onClick={() => setFilter("all")}>Todos <b>{orders.length}</b></button><button className={clsx("filter-pill", filter === "pending" && "active")} type="button" onClick={() => setFilter("pending")}>Pendientes <b>{pending}</b></button><button className={clsx("filter-pill", filter === "route" && "active")} type="button" onClick={() => setFilter("route")}>En ruta <b>{inRoute}</b></button><button className={clsx("filter-pill", filter === "delivered" && "active")} type="button" onClick={() => setFilter("delivered")}>Entregados <b>{delivered}</b></button><button className={clsx("filter-pill", filter === "cancelled" && "active")} type="button" onClick={() => setFilter("cancelled")}>Cancelados <b>{cancelled}</b></button></div>
      <div className="table-wrap"><table className="data-table orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Compra / servicio</th><th>Motorizado</th><th>Pago</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filteredOrders.length ? filteredOrders.map((order) => <tr key={order.id}><td><span className="order-id"><strong>{order.number}</strong></span><small>{formatDateTime(order.createdAt)}</small></td><td><strong>{order.customerName}</strong><small>{order.address}</small></td><td><strong>{order.merchantName ?? serviceLabel(order.serviceType)}</strong><small>{serviceLabel(order.serviceType)}</small></td><td>{order.driverName ?? <span className="muted">Sin asignar</span>}</td><td><strong>{order.paymentMethod === "bank_transfer" ? "Transferencia" : "Efectivo"}</strong><small>{order.paymentMethod === "bank_transfer" ? order.transferStatus === "validated" ? "Validada" : "Pendiente de validar" : order.changeDue ? `Vuelto ${currency(order.changeDue)}` : "Exacto / por definir"}</small></td><td><strong>{currency(order.total)}</strong></td><td><Badge tone={orderTone(order.status)}>{titleCaseStatus(order.status)}</Badge></td><td>{["confirmed", "pending_assignment"].includes(order.status) ? <button className="table-action" type="button" onClick={() => openAssignment(order)}>Asignar</button> : order.status === "awaiting_confirmation" && order.conversationId ? <Link className="table-action" href={`/admin/conversaciones?conversation=${order.conversationId}`}>Confirmar</Link> : <span className="muted">—</span>}</td></tr>) : <tr><td colSpan={8}><div className="empty-table">No hay pedidos que coincidan con los filtros.</div></td></tr>}</tbody></table></div>
    </section>
    {selectedOrder ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelectedOrderId(null); }}><dialog className="modal-card" style={{ width: "min(100%, 980px)", maxHeight: "92vh", overflow: "auto" }} open aria-labelledby="assign-order-title"><div className="modal-heading"><div><p>DESPACHO</p><h2 id="assign-order-title">Asignar motorizado</h2></div><button className="modal-close" type="button" onClick={() => setSelectedOrderId(null)} disabled={busy} aria-label="Cerrar"><X size={17} /></button></div><p className="modal-intro">Selecciona quién realizará el pedido {selectedOrder.number}.</p><div className="form-grid" style={{ marginTop: 18, alignItems: "start" }}><section><label className="search-field"><MagnifyingGlass size={18} /><input value={driverQuery} onChange={(event) => setDriverQuery(event.target.value)} placeholder="Buscar motorizado…" /></label><div className="filter-pills" style={{ paddingInline: 0 }}><button className={clsx("filter-pill", driverFilter === "available" && "active")} type="button" onClick={() => setDriverFilter("available")}>Disponibles <b>{availableDrivers.length}</b></button><button className={clsx("filter-pill", driverFilter === "busy" && "active")} type="button" onClick={() => setDriverFilter("busy")}>En servicio</button><button className={clsx("filter-pill", driverFilter === "offline" && "active")} type="button" onClick={() => setDriverFilter("offline")}>Fuera de jornada</button></div><div className="driver-choice-list" style={{ paddingInline: 0 }}>{filteredDrivers.map((driver) => { const available = isDriverAvailable(driver); return <button type="button" key={driver.id} disabled={!available} onClick={() => setSelectedDriverId(driver.id)} className={clsx("driver-choice", selectedDriverId === driver.id && "selected")}><Avatar initials={driver.initials} tone={available ? "mint" : "purple"} /><span className="driver-choice-copy"><strong>{driver.name}</strong><small><Motorcycle size={13} /> {driver.vehicle?.label ?? "Sin vehículo"} · {driver.vehicle?.plate ?? ""}</small><span><GasPump size={13} /> {driver.vehicle?.fuelLevel ?? 0}% <i /> <Star size={12} weight="fill" /> {driver.rating} · {driver.deliveriesToday} hoy</span></span>{selectedDriverId === driver.id ? <CheckCircle className="driver-choice-check" size={21} weight="fill" /> : null}</button>; })}{filteredDrivers.length === 0 ? <p className="transfer-note">No hay motorizados en este estado.</p> : null}</div></section><section className="dispatch-card" style={{ marginTop: 0 }}><div className="dispatch-heading"><div><span>RESUMEN DEL SERVICIO</span><h3>{selectedOrder.number}</h3><p>{serviceLabel(selectedOrder.serviceType)}</p></div><Badge tone="green">Confirmado</Badge></div><div className="draft-section" style={{ marginInline: 15 }}><div className="price-line"><span>Cliente</span><strong>{selectedOrder.customerName}</strong></div><div className="price-line"><span>Compra</span><strong>{selectedOrder.merchantName ?? "—"}</strong></div><div className="price-line"><span>Destino</span><strong>{selectedOrder.address}</strong></div><div className="price-line"><span>Pago</span><strong>{selectedOrder.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}</strong></div><div className="price-total"><span>Total</span><strong>{currency(selectedOrder.total)}</strong></div></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="dispatch-footer"><span><CheckCircle size={16} weight="fill" /> Al asignar, el pedido aparecerá en la PWA del motorizado.</span><button className="button button-primary" type="button" disabled={busy || !selectedDriverId} onClick={assignOrder}><UserPlus size={18} weight="bold" /> {busy ? "Asignando…" : `Asignar a ${data.drivers.find((driver) => driver.id === selectedDriverId)?.name ?? "motorizado"}`}</button><button className="button button-secondary" type="button" onClick={() => setSelectedOrderId(null)} disabled={busy}>Cancelar</button></div></section></div></dialog></div> : null}
  </>;
}
