export type OrderStatus =
  | "nuevo"
  | "esperando_confirmacion"
  | "confirmado"
  | "pendiente_asignacion"
  | "asignado"
  | "en_camino_comercio"
  | "recogiendo"
  | "en_camino_cliente"
  | "entregado"
  | "cancelado";

export type IncidentStatus = "abierta" | "en_revision" | "resuelta";
export type Priority = "alta" | "media" | "normal";

export interface Driver {
  id: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  vehiclePlate: string;
  status: "disponible" | "en_servicio" | "fuera_de_turno" | "mantenimiento";
  rating: number;
  deliveriesToday: number;
  fuelLevel: number;
  odometer: number;
}

export interface DeliveryOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  reference: string;
  merchant: string;
  serviceType: "Delivery" | "Mandado / compra" | "Paquete";
  status: OrderStatus;
  priority: Priority;
  driver?: string;
  subtotal: number;
  managementFee: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "Efectivo" | "Transferencia";
  receivedAmount?: number;
  changeDue?: number;
  createdAt: string;
  otpRequired: boolean;
}

export interface Conversation {
  id: string;
  customer: string;
  phone: string;
  preview: string;
  time: string;
  unread: number;
  hasOrder: boolean;
  status: "abierta" | "en_espera" | "resuelta";
}

export interface Incident {
  id: string;
  title: string;
  orderId: string;
  customer: string;
  driver: string;
  priority: Priority;
  status: IncidentStatus;
  createdAt: string;
  description: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  label: string;
  driver: string;
  odometer: number;
  fuelType: string;
  fuelLevel: number;
  nextMaintenanceAt: number;
  status: "activo" | "mantenimiento" | "dañado";
}
