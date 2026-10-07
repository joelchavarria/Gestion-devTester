"use client";

import { Avatar, PageHeader } from "@/components/ui";
import { currency } from "@/lib/format";
import type { AdminBootstrap, OperationalOrder } from "@/lib/operations/types";
import { DownloadSimple, TrendUp } from "@phosphor-icons/react";

const activeStatuses: OperationalOrder["status"][] = ["assigned", "to_merchant", "picking_up", "to_customer"];

function averageDeliveryMinutes(orders: OperationalOrder[]) {
  const minutes = orders.flatMap((order) => order.assignedAt && order.deliveredAt ? [Math.max(0, (Date.parse(order.deliveredAt) - Date.parse(order.assignedAt)) / 60_000)] : []);
  return minutes.length ? Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length) : 0;
}

export function ReportsManager({ data }: { data: AdminBootstrap }) {
  const delivered = data.orders.filter((order) => order.status === "delivered");
  const active = data.orders.filter((order) => activeStatuses.includes(order.status));
  const cancelled = data.orders.filter((order) => order.status === "cancelled");
  const revenue = delivered.reduce((sum, order) => sum + order.total, 0);
  const deliveryRate = data.orders.length ? Math.round((delivered.length / data.orders.length) * 1000) / 10 : 0;
  const openIncidents = data.incidents.filter((incident) => incident.status !== "resolved").length;
  const dueMaintenance = data.vehicles.filter((vehicle) => vehicle.nextMaintenanceAt !== null && vehicle.nextMaintenanceAt <= vehicle.odometer);

  return <><PageHeader title="Reportes" description="Métricas reales de los pedidos, flota y motorizados de tu empresa." actions={<button className="button button-secondary" type="button" onClick={() => window.print()}><DownloadSimple size={18} /> Imprimir</button>} /><section className="metric-grid reports-metrics"><article className="metric-card metric-green"><span className="metric-icon"><TrendUp size={23} /></span><div><p>Pedidos completados</p><strong>{delivered.length}</strong><small>{active.length} pedidos aún en operación</small></div></article><article className="metric-card metric-blue"><span className="metric-icon">C$</span><div><p>Ingresos por delivery</p><strong>{currency(revenue)}</strong><small>Solo pedidos entregados</small></div></article><article className="metric-card metric-amber"><span className="metric-icon">⏱</span><div><p>Tiempo promedio</p><strong>{averageDeliveryMinutes(delivered)} min</strong><small>Desde asignación hasta entrega</small></div></article><article className="metric-card metric-green"><span className="metric-icon">%</span><div><p>Tasa de entrega</p><strong>{deliveryRate}%</strong><small>{cancelled.length} cancelados</small></div></article></section><section className="report-grid"><article className="panel report-chart-panel"><div className="panel-heading"><div><h2>Pedidos por estado</h2><p>Resumen de la operación registrada.</p></div></div><div className="bar-chart report-real-chart"><Bar label="Entregados" value={delivered.length} max={Math.max(1, data.orders.length)} tone="green" /><Bar label="En ruta" value={active.length} max={Math.max(1, data.orders.length)} tone="blue" /><Bar label="Pendientes" value={data.orders.filter((order) => ["awaiting_confirmation", "pending_assignment"].includes(order.status)).length} max={Math.max(1, data.orders.length)} tone="amber" /><Bar label="Cancelados" value={cancelled.length} max={Math.max(1, data.orders.length)} tone="red" /></div></article><article className="panel status-report"><h2>Estado de pedidos</h2><Progress label="Completados" value={delivered.length} max={Math.max(1, data.orders.length)} tone="green" /><Progress label="En curso" value={active.length} max={Math.max(1, data.orders.length)} tone="blue" /><Progress label="Cancelados" value={cancelled.length} max={Math.max(1, data.orders.length)} tone="red" /><Progress label="Con incidencia" value={openIncidents} max={Math.max(1, data.orders.length)} tone="amber" /></article><article className="panel performance-report"><div className="panel-heading"><div><h2>Desempeño de motorizados</h2><p>Entregas realizadas hoy y estado actual.</p></div></div><div className="performance-list">{data.drivers.length ? data.drivers.map((driver, index) => <div key={driver.id}><Avatar initials={driver.initials} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "purple" : "pink"} /><strong>{driver.name}</strong><span>{driver.deliveriesToday} entregas</span><b>{driver.status === "available" ? "Listo" : driver.status === "busy" ? "En ruta" : driver.status === "pending" ? "Pendiente" : "Fuera"}</b><small>{driver.vehicle ? `${driver.vehicle.fuelLevel}% tanque` : "Sin vehículo"}</small><em>★ {driver.rating.toFixed(1)}</em></div>) : <div className="empty-table">Aún no hay motorizados registrados.</div>}</div></article><aside className="report-aside"><section className="panel operational-alerts"><h2>Alertas operativas</h2><div className="report-alert"><span>⚒</span><div><strong>{dueMaintenance.length} mantenimientos pendientes</strong><small>{dueMaintenance.length ? dueMaintenance.map((vehicle) => vehicle.code).join(", ") : "Sin vehículos vencidos"}</small></div></div><div className="report-alert"><span>!</span><div><strong>{openIncidents} incidencias abiertas</strong><small>Requieren atención administrativa</small></div></div></section><section className="fuel-summary"><span>Combustible acumulado</span><strong>{data.fuelSummary.costPerKm === null ? currency(data.fuelSummary.totalAmount) : `${currency(data.fuelSummary.costPerKm)} / km`}</strong><small>{data.fuelSummary.totalLiters.toFixed(1)} L · {data.fuelSummary.travelledKm} km registrados</small></section></aside></section></>;
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const height = Math.max(value ? 12 : 2, Math.round((value / max) * 100));
  return <div className={`bar-column ${tone}`}><span style={{ height: `${height}%` }}><b>{value}</b></span><small>{label}</small></div>;
}

function Progress({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return <div className={`progress-item ${tone === "green" ? "" : tone}`}><span>{label}</span><div><i style={{ width: `${Math.round((value / max) * 100)}%` }} /></div><strong>{value}</strong></div>;
}
