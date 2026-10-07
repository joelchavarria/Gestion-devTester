import { Badge } from "@/components/ui";
import { titleCaseStatus } from "@/lib/format";
import type { IncidentStatus, OrderStatus, Priority } from "@/lib/types";

const orderTone: Record<OrderStatus, "neutral" | "green" | "amber" | "red" | "blue"> = {
  nuevo: "neutral",
  esperando_confirmacion: "amber",
  confirmado: "blue",
  pendiente_asignacion: "amber",
  asignado: "blue",
  en_camino_comercio: "blue",
  recogiendo: "amber",
  en_camino_cliente: "green",
  entregado: "green",
  cancelado: "red",
};

const incidentTone: Record<IncidentStatus, "neutral" | "green" | "amber" | "red" | "blue"> = {
  abierta: "amber",
  en_revision: "blue",
  resuelta: "green",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTone[status]}>{titleCaseStatus(status)}</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={incidentTone[status]}>{titleCaseStatus(status)}</Badge>;
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return <span className={`priority-dot priority-${priority}`} title={`Prioridad ${priority}`} />;
}
