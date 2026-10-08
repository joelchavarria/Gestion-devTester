export type OperationsRole = "owner" | "admin" | "supervisor" | "operator" | "driver";

export type OperationalZone = {
  id: string;
  name: string;
  deliveryFee: number;
  minimumFee: number;
  isActive: boolean;
};

export type BusinessHour = { enabled: boolean; from: string; to: string };
export type CompanySettings = {
  businessHours: Record<string, BusinessHour>;
  maintenanceIntervalKm: number;
  baseManagementFee: number;
  routeDeviationThresholdM: number;
  otpDeliveryRequired: boolean;
  gpsSharingMode: "active_orders_only" | "active_shift";
  allowOperatorPriceOverride: boolean;
  cancellationAfterPurchaseRule: "none" | "product_only" | "product_management" | "product_management_delivery" | "manual";
};

export type WhatsAppChannel = {
  provider: "qr_gateway" | "meta_cloud" | "mock";
  connectionStatus: "disconnected" | "pending" | "connected" | "error";
  phoneNumber: string | null;
  welcomeMessage: string;
};

export type OperationalFuelSummary = {
  totalAmount: number;
  totalLiters: number;
  travelledKm: number;
  costPerKm: number | null;
};

export type OperationalMaintenance = {
  id: string;
  vehicleId: string;
  kind: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  dueAtKm: number | null;
  dueDate: string | null;
  completedAt: string | null;
  odometer: number | null;
  cost: number;
  supplier: string | null;
  notes: string | null;
};

export type OperationalVehicle = {
  id: string;
  code: string;
  plate: string;
  label: string;
  fuelType: string;
  fuelLevel: number;
  odometer: number;
  nextMaintenanceAt: number | null;
  status: "active" | "in_maintenance" | "damaged" | "inactive";
  activeDriverName?: string;
};

export type OperationalShift = {
  id: string;
  vehicleId: string;
  startedAt: string;
  startOdometer: number;
  fuelLevelStart: number | null;
  openingCash: number;
};

export type OperationalDriver = {
  id: string;
  userId: string;
  name: string;
  initials: string;
  phone: string;
  licenseNumber: string | null;
  rating: number;
  inviteStatus: "pending" | "activated" | "disabled";
  status: "available" | "busy" | "off_shift" | "maintenance" | "pending";
  deliveriesToday: number;
  activeShift: OperationalShift | null;
  vehicle: OperationalVehicle | null;
};

export type OperationalConversation = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  status: "open" | "waiting" | "resolved" | "archived";
  lastMessage: string;
  lastMessageAt: string | null;
  hasOrder: boolean;
};

export type OperationalOrder = {
  id: string;
  number: string;
  conversationId: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  reference: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  merchantName: string | null;
  merchantAddress: string | null;
  serviceType: "delivery" | "errand" | "package";
  status: "new" | "awaiting_confirmation" | "confirmed" | "pending_assignment" | "assigned" | "to_merchant" | "picking_up" | "to_customer" | "delivered" | "cancelled";
  priority: number;
  paymentMethod: "cash" | "bank_transfer";
  transferStatus: "not_required" | "pending_validation" | "validated" | "rejected";
  productAmount: number;
  managementFee: number;
  deliveryFee: number;
  total: number;
  amountReceived: number | null;
  changeDue: number;
  driverId: string | null;
  driverName: string | null;
  createdAt: string;
  assignedAt: string | null;
  deliveredAt: string | null;
};

export type OperationalLocation = {
  id: number;
  orderId: string | null;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedKmh: number | null;
  heading: number | null;
  capturedAt: string;
};

export type OperationalRoute = {
  orderId: string;
  driverId: string | null;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  encodedPolyline: string;
  distanceM: number | null;
  durationS: number | null;
};

export type OperationalRouteAlert = {
  id: string;
  orderId: string;
  driverId: string;
  kind: string;
  thresholdM: number | null;
  distanceM: number | null;
  status: string;
  createdAt: string;
};

export type OperationalIncident = {
  id: string;
  number: string;
  orderId: string | null;
  orderNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved";
  createdAt: string;
  resolution: string | null;
};

export type AdminBootstrap = {
  company: { id: string; name: string; city: string; phone: string | null; email: string | null; maintenanceIntervalKm: number; baseManagementFee: number; routeDeviationThresholdM: number };
  settings: CompanySettings;
  whatsapp: WhatsAppChannel;
  zones: OperationalZone[];
  vehicles: OperationalVehicle[];
  drivers: OperationalDriver[];
  conversations: OperationalConversation[];
  orders: OperationalOrder[];
  incidents: OperationalIncident[];
  locations: OperationalLocation[];
  routes: OperationalRoute[];
  routeAlerts: OperationalRouteAlert[];
  fuelSummary: OperationalFuelSummary;
  maintenanceRecords: OperationalMaintenance[];
};

export type DriverBootstrap = {
  companyName: string;
  driver: OperationalDriver;
  openShift: OperationalShift | null;
  activeOrder: OperationalOrder | null;
  pendingOrders: OperationalOrder[];
  recentOrders: OperationalOrder[];
  recentFuel: { id: string; liters: number; amount: number; odometer: number; recordedAt: string }[];
  availableVehicles: OperationalVehicle[];
};
