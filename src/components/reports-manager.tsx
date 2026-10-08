"use client";

import { Avatar, PageHeader } from "@/components/ui";
import { currency } from "@/lib/format";
import type { AdminBootstrap, OperationalOrder } from "@/lib/operations/types";
import {
  CalendarBlank,
  CurrencyCircleDollar,
  DownloadSimple,
  Funnel,
  Gauge,
  Percent,
  Printer,
  Timer,
  TrendUp,
  Warning,
  Wrench,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

const activeStatuses: OperationalOrder["status"][] = ["assigned", "to_merchant", "picking_up", "to_customer"];
const pendingStatuses: OperationalOrder["status"][] = ["new", "awaiting_confirmation", "confirmed", "pending_assignment"];
const exportDateFormatter = new Intl.DateTimeFormat("es-NI", { dateStyle: "short", timeStyle: "short" });
type ReportStatus = "all" | "delivered" | "active" | "pending" | "cancelled";

function averageDeliveryMinutes(orders: OperationalOrder[]) {
  const minutes = orders.flatMap((order) => order.assignedAt && order.deliveredAt
    ? [Math.max(0, (Date.parse(order.deliveredAt) - Date.parse(order.assignedAt)) / 60_000)]
    : []);
  return minutes.length ? Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length) : 0;
}

function defaultRange(orders: OperationalOrder[]) {
  const dates = orders.map((order) => order.createdAt.slice(0, 10)).sort();
  const today = new Date().toISOString().slice(0, 10);
  return { start: dates[0] ?? today, end: dates.at(-1) ?? today };
}

function inDateRange(date: string, start: string, end: string) {
  const timestamp = Date.parse(date);
  const startAt = start ? Date.parse(`${start}T00:00:00-06:00`) : Number.NEGATIVE_INFINITY;
  const endAt = end ? Date.parse(`${end}T23:59:59.999-06:00`) : Number.POSITIVE_INFINITY;
  return timestamp >= startAt && timestamp <= endAt;
}

function matchesStatus(order: OperationalOrder, status: ReportStatus) {
  if (status === "all") return true;
  if (status === "active") return activeStatuses.includes(order.status);
  if (status === "pending") return pendingStatuses.includes(order.status);
  return order.status === status;
}

function csvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function ReportsManager({ data }: { data: AdminBootstrap }) {
  const initialRange = defaultRange(data.orders);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  const filteredOrders = useMemo(() => invalidRange ? [] : data.orders.filter((order) => {
    const matchesDate = inDateRange(order.createdAt, startDate, endDate);
    const matchesDriver = driverFilter === "all" || order.driverId === driverFilter;
    return matchesDate && matchesDriver && matchesStatus(order, statusFilter);
  }), [data.orders, driverFilter, endDate, invalidRange, startDate, statusFilter]);
  const filteredIncidents = useMemo(() => invalidRange ? [] : data.incidents.filter((incident) => inDateRange(incident.createdAt, startDate, endDate)), [data.incidents, endDate, invalidRange, startDate]);
  const delivered = filteredOrders.filter((order) => order.status === "delivered");
  const active = filteredOrders.filter((order) => activeStatuses.includes(order.status));
  const pending = filteredOrders.filter((order) => pendingStatuses.includes(order.status));
  const cancelled = filteredOrders.filter((order) => order.status === "cancelled");
  const revenue = delivered.reduce((sum, order) => sum + order.total, 0);
  const deliveryRate = filteredOrders.length ? Math.round((delivered.length / filteredOrders.length) * 1000) / 10 : 0;
  const openIncidents = filteredIncidents.filter((incident) => incident.status !== "resolved").length;
  const dueMaintenance = data.vehicles.filter((vehicle) => vehicle.nextMaintenanceAt !== null && vehicle.nextMaintenanceAt <= vehicle.odometer);
  const activeFilterCount = Number(statusFilter !== "all") + Number(driverFilter !== "all");

  const driverRows = data.drivers
    .filter((driver) => driverFilter === "all" || driver.id === driverFilter)
    .map((driver) => ({
      ...driver,
      deliveredInRange: delivered.filter((order) => order.driverId === driver.id).length,
      assignedInRange: filteredOrders.filter((order) => order.driverId === driver.id).length,
    }));

  function resetFilters() {
    setStartDate(initialRange.start);
    setEndDate(initialRange.end);
    setStatusFilter("all");
    setDriverFilter("all");
    setNotice(null);
  }

  function exportCsv() {
    if (!filteredOrders.length) {
      setNotice("No hay pedidos en el rango y filtros seleccionados para exportar.");
      return;
    }
    const headers = ["Pedido", "Fecha", "Cliente", "Servicio", "Estado", "Motorizado", "Producto", "Gestión", "Delivery", "Total"];
    const rows = filteredOrders.map((order) => [
      order.number,
      exportDateFormatter.format(new Date(order.createdAt)),
      order.customerName,
      order.serviceType,
      order.status,
      order.driverName,
      order.productAmount,
      order.managementFee,
      order.deliveryFee,
      order.total,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reporte-pedidos-${startDate || "inicio"}-${endDate || "hoy"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${filteredOrders.length} pedidos exportados correctamente.`);
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Métricas reales de los pedidos, flota y motorizados de tu empresa."
        actions={(
          <>
            <button className="button button-secondary" type="button" aria-expanded={showFilters} onClick={() => setShowFilters((current) => !current)}>
              <Funnel size={18} /> Filtros {activeFilterCount ? `(${activeFilterCount})` : ""}
            </button>
            <button className="button button-secondary" type="button" onClick={() => window.print()}><Printer size={18} /> Imprimir</button>
            <button className="button button-primary" type="button" onClick={exportCsv} disabled={!filteredOrders.length}><DownloadSimple size={18} /> Exportar CSV</button>
          </>
        )}
      />

      <section className="panel" style={{ marginBottom: 18, padding: 18 }} aria-label="Rango del reporte">
        <div className="form-grid">
          <label>Desde<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => { setStartDate(event.target.value); setNotice(null); }} /></label>
          <label>Hasta<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); setNotice(null); }} /></label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <CalendarBlank size={21} />
            <small>{invalidRange ? "El rango de fechas no es válido." : `${filteredOrders.length} pedidos en el período`}</small>
          </div>
        </div>
        {showFilters ? (
          <div className="form-grid" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #edf0f3" }}>
            <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatus)}><option value="all">Todos los estados</option><option value="delivered">Entregados</option><option value="active">En curso</option><option value="pending">Pendientes</option><option value="cancelled">Cancelados</option></select></label>
            <label>Motorizado<select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}><option value="all">Todos los motorizados</option>{data.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></label>
            <div style={{ display: "flex", alignItems: "end" }}><button type="button" className="button button-secondary" onClick={resetFilters}>Limpiar filtros</button></div>
          </div>
        ) : null}
      </section>

      {invalidRange ? <p className="form-error" role="alert">La fecha inicial no puede ser posterior a la fecha final.</p> : null}
      {notice ? <p className="form-notice driver-notice" role="status">{notice}</p> : null}

      <section className="metric-grid reports-metrics">
        <article className="metric-card metric-green"><span className="metric-icon"><TrendUp size={23} /></span><div><p>Pedidos completados</p><strong>{delivered.length}</strong><small>{active.length} pedidos aún en operación</small></div></article>
        <article className="metric-card metric-blue"><span className="metric-icon"><CurrencyCircleDollar size={23} /></span><div><p>Ingresos por delivery</p><strong>{currency(revenue)}</strong><small>Solo pedidos entregados</small></div></article>
        <article className="metric-card metric-amber"><span className="metric-icon"><Timer size={23} /></span><div><p>Tiempo promedio</p><strong>{averageDeliveryMinutes(delivered)} min</strong><small>Desde asignación hasta entrega</small></div></article>
        <article className="metric-card metric-green"><span className="metric-icon"><Percent size={23} /></span><div><p>Tasa de entrega</p><strong>{deliveryRate}%</strong><small>{cancelled.length} cancelados</small></div></article>
      </section>

      <section className="report-grid">
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Pedidos por estado</h2><p>Resumen del rango y filtros seleccionados.</p></div></div>
          <div className="bar-chart report-real-chart">
            <Bar label="Entregados" value={delivered.length} max={Math.max(1, filteredOrders.length)} tone="green" />
            <Bar label="En ruta" value={active.length} max={Math.max(1, filteredOrders.length)} tone="blue" />
            <Bar label="Pendientes" value={pending.length} max={Math.max(1, filteredOrders.length)} tone="amber" />
            <Bar label="Cancelados" value={cancelled.length} max={Math.max(1, filteredOrders.length)} tone="red" />
          </div>
        </article>

        <article className="panel status-report">
          <h2>Estado de pedidos</h2>
          <Progress label="Completados" value={delivered.length} max={Math.max(1, filteredOrders.length)} tone="green" />
          <Progress label="En curso" value={active.length} max={Math.max(1, filteredOrders.length)} tone="blue" />
          <Progress label="Cancelados" value={cancelled.length} max={Math.max(1, filteredOrders.length)} tone="red" />
          <Progress label="Con incidencia" value={openIncidents} max={Math.max(1, filteredOrders.length)} tone="amber" />
        </article>

        <article className="panel performance-report">
          <div className="panel-heading"><div><h2>Desempeño de motorizados</h2><p>Entregas dentro del período seleccionado.</p></div></div>
          <div className="performance-list">
            {driverRows.length ? driverRows.map((driver, index) => (
              <div key={driver.id}>
                <Avatar initials={driver.initials} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "purple" : "pink"} />
                <strong>{driver.name}</strong><span>{driver.deliveredInRange} entregas</span>
                <b>{driver.status === "available" ? "Listo" : driver.status === "busy" ? "En ruta" : driver.status === "pending" ? "Pendiente" : "Fuera"}</b>
                <small>{driver.assignedInRange} asignados</small><em>★ {driver.rating.toFixed(1)}</em>
              </div>
            )) : <div className="empty-table">No hay motorizados para los filtros seleccionados.</div>}
          </div>
        </article>

        <aside className="report-aside">
          <section className="panel operational-alerts">
            <h2>Alertas operativas</h2>
            <Link href="/admin/vehiculos" className="report-alert"><span><Wrench size={16} /></span><div><strong>{dueMaintenance.length} mantenimientos pendientes</strong><small>{dueMaintenance.length ? dueMaintenance.map((vehicle) => vehicle.code).join(", ") : "Sin vehículos vencidos"}</small></div></Link>
            <Link href="/admin/incidencias" className="report-alert"><span><Warning size={16} /></span><div><strong>{openIncidents} incidencias abiertas</strong><small>Ver y gestionar incidencias</small></div></Link>
          </section>
          <section className="fuel-summary"><Gauge size={20} /><span>Combustible acumulado</span><strong>{data.fuelSummary.costPerKm === null ? currency(data.fuelSummary.totalAmount) : `${currency(data.fuelSummary.costPerKm)} / km`}</strong><small>{data.fuelSummary.totalLiters.toFixed(1)} L · {data.fuelSummary.travelledKm} km registrados</small></section>
        </aside>
      </section>
    </>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const height = Math.max(value ? 12 : 2, Math.round((value / max) * 100));
  return <div className={`bar-column ${tone}`}><span style={{ height: `${height}%` }}><b>{value}</b></span><small>{label}</small></div>;
}

function Progress({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return <div className={`progress-item ${tone === "green" ? "" : tone}`}><span>{label}</span><div><i style={{ width: `${Math.round((value / max) * 100)}%` }} /></div><strong>{value}</strong></div>;
}
