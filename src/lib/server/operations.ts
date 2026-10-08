import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";
import type { CompanyContext } from "@/lib/server/context";
import type {
  AdminBootstrap,
  DriverBootstrap,
  OperationalConversation,
  OperationalDriver,
  OperationalIncident,
  OperationalLocation,
  OperationalMaintenance,
  OperationalOrder,
  OperationalRoute,
  OperationalRouteAlert,
  OperationalShift,
  OperationalVehicle,
} from "@/lib/operations/types";

type DriverRow = Tables<"driver_profiles">;
type ShiftRow = Tables<"driver_shifts">;
type VehicleRow = Tables<"vehicles">;
type OrderRow = Tables<"orders">;
type CustomerRow = Tables<"customers">;
type ProfileRow = Tables<"profiles">;
type ConversationRow = Tables<"conversations">;
type MessageRow = Tables<"messages">;
type IncidentRow = Tables<"incidents">;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("No se encontró la información solicitada.");
  return result.data;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "MO";
}

function startOfTodayManagua() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Managua",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T00:00:00-06:00`;
}

function mapVehicle(row: VehicleRow, activeDriverName?: string): OperationalVehicle {
  return {
    id: row.id,
    code: row.code,
    plate: row.plate,
    label: `${row.make} ${row.model}${row.model_year ? ` · ${row.model_year}` : ""}`,
    fuelType: row.fuel_type,
    fuelLevel: row.fuel_level_percent ?? 0,
    odometer: row.current_odometer_km,
    nextMaintenanceAt: row.next_maintenance_km,
    status: row.status,
    activeDriverName,
  };
}

function mapShift(row: ShiftRow): OperationalShift {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    startedAt: row.started_at,
    startOdometer: row.start_odometer_km,
    fuelLevelStart: row.fuel_level_start,
    openingCash: row.opening_cash,
  };
}

function mapOrder(
  row: OrderRow,
  customers: Map<string, CustomerRow>,
  driverNames: Map<string, string>,
): OperationalOrder {
  const customer = customers.get(row.customer_id);
  return {
    id: row.id,
    number: row.order_number,
    conversationId: row.conversation_id,
    customerId: row.customer_id,
    customerName: customer?.full_name ?? "Cliente sin nombre",
    customerPhone: customer?.phone ?? "",
    address: row.delivery_address,
    reference: row.delivery_reference,
    deliveryLatitude: row.delivery_latitude,
    deliveryLongitude: row.delivery_longitude,
    merchantName: row.merchant_name,
    merchantAddress: row.merchant_address,
    serviceType: row.service_type,
    status: row.status,
    priority: row.priority,
    paymentMethod: row.payment_method,
    transferStatus: row.transfer_status,
    productAmount: row.product_amount,
    managementFee: row.management_fee,
    deliveryFee: row.delivery_fee,
    total: row.total_amount ?? 0,
    amountReceived: row.amount_received,
    changeDue: row.change_due,
    driverId: row.driver_id,
    driverName: row.driver_id ? driverNames.get(row.driver_id) ?? null : null,
    createdAt: row.created_at,
    assignedAt: row.assigned_at,
    deliveredAt: row.delivered_at,
  };
}

function mapDriver(
  row: DriverRow,
  profiles: Map<string, ProfileRow>,
  shifts: Map<string, ShiftRow>,
  vehicles: Map<string, VehicleRow>,
  busyDriverIds: Set<string>,
  deliveriesByDriver: Map<string, number>,
): OperationalDriver {
  const profile = profiles.get(row.user_id);
  const shift = shifts.get(row.id);
  const vehicle = shift ? vehicles.get(shift.vehicle_id) : undefined;
  const maintenanceBlocked = Boolean(vehicle && (vehicle.status !== "active" || (vehicle.next_maintenance_km !== null && vehicle.current_odometer_km >= vehicle.next_maintenance_km)));
  const status: OperationalDriver["status"] = row.invite_status !== "activated"
    ? "pending"
    : maintenanceBlocked
      ? "maintenance"
      : !shift
        ? "off_shift"
        : busyDriverIds.has(row.id)
          ? "busy"
          : row.is_available
            ? "available"
            : "off_shift";

  return {
    id: row.id,
    userId: row.user_id,
    name: profile?.full_name || "Motorizado sin nombre",
    initials: initials(profile?.full_name || "Motorizado"),
    phone: profile?.phone || "Sin teléfono",
    licenseNumber: row.license_number,
    rating: row.rating,
    inviteStatus: row.invite_status as OperationalDriver["inviteStatus"],
    status,
    deliveriesToday: deliveriesByDriver.get(row.id) ?? 0,
    activeShift: shift ? mapShift(shift) : null,
    vehicle: vehicle ? mapVehicle(vehicle, profile?.full_name || undefined) : null,
  };
}

export async function getAdminBootstrap(context: CompanyContext): Promise<AdminBootstrap> {
  const admin = createSupabaseAdminClient();
  const [companyResult, settingsResult, zonesResult, vehiclesResult, driversResult, shiftsResult, closedShiftsResult, fuelResult, maintenanceResult, ordersResult, customersResult, conversationsResult, incidentsResult, locationsResult, routesResult, alertsResult, whatsappResult] = await Promise.all([
    admin.from("companies").select("id, display_name, city, phone, email").eq("id", context.companyId).single(),
    admin.from("company_settings").select("business_hours, maintenance_interval_km, base_management_fee, route_deviation_threshold_m, otp_delivery_required, gps_sharing_mode, allow_operator_price_override, cancellation_after_purchase_rule").eq("company_id", context.companyId).single(),
    admin.from("service_zones").select("id, name, delivery_fee, minimum_fee, is_active").eq("company_id", context.companyId).order("sort_order"),
    admin.from("vehicles").select("*").eq("company_id", context.companyId).order("created_at", { ascending: false }),
    admin.from("driver_profiles").select("*").eq("company_id", context.companyId).order("created_at", { ascending: false }),
    admin.from("driver_shifts").select("*").eq("company_id", context.companyId).is("ended_at", null),
    admin.from("driver_shifts").select("start_odometer_km, end_odometer_km").eq("company_id", context.companyId).not("ended_at", "is", null).limit(1000),
    admin.from("fuel_logs").select("amount, liters").eq("company_id", context.companyId).limit(1000),
    admin.from("maintenance_records").select("id, vehicle_id, kind, status, due_at_km, due_date, completed_at, odometer_km, cost, supplier, notes").eq("company_id", context.companyId).order("created_at", { ascending: false }).limit(200),
    admin.from("orders").select("*").eq("company_id", context.companyId).order("created_at", { ascending: false }).limit(200),
    admin.from("customers").select("*").eq("company_id", context.companyId),
    admin.from("conversations").select("*").eq("company_id", context.companyId).order("last_message_at", { ascending: false, nullsFirst: false }).limit(100),
    admin.from("incidents").select("*").eq("company_id", context.companyId).order("created_at", { ascending: false }).limit(100),
    admin.from("gps_locations").select("id, order_id, driver_id, latitude, longitude, accuracy_m, speed_kmh, heading, captured_at").eq("company_id", context.companyId).order("captured_at", { ascending: false }).limit(1000),
    admin.from("order_routes").select("order_id, driver_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude, encoded_polyline, distance_m, duration_s").eq("company_id", context.companyId),
    admin.from("route_alerts").select("id, order_id, driver_id, kind, threshold_m, distance_m, status, created_at").eq("company_id", context.companyId).order("created_at", { ascending: false }).limit(50),
    admin.from("whatsapp_accounts").select("provider, connection_status, phone_number, welcome_message").eq("company_id", context.companyId).maybeSingle(),
  ]);

  const company = unwrap(companyResult);
  const settings = unwrap(settingsResult);
  const vehicles = unwrap(vehiclesResult) as VehicleRow[];
  const driverRows = unwrap(driversResult) as DriverRow[];
  const shiftRows = unwrap(shiftsResult) as ShiftRow[];
  const orderRows = unwrap(ordersResult) as OrderRow[];
  const customerRows = unwrap(customersResult) as CustomerRow[];
  const conversationRows = unwrap(conversationsResult) as ConversationRow[];
  const incidentRows = unwrap(incidentsResult) as IncidentRow[];
  const closedShiftRows = unwrap(closedShiftsResult) as Array<{ start_odometer_km: number; end_odometer_km: number | null }>;
  const fuelRows = unwrap(fuelResult) as Array<{ amount: number; liters: number }>;
  const maintenanceRows = unwrap(maintenanceResult) as Array<{ id: string; vehicle_id: string; kind: string; status: string; due_at_km: number | null; due_date: string | null; completed_at: string | null; odometer_km: number | null; cost: number; supplier: string | null; notes: string | null }>;

  const driverUserIds = driverRows.map((driver) => driver.user_id);
  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const [profileResult, messageResult] = await Promise.all([
    driverUserIds.length
      ? admin.from("profiles").select("*").in("id", driverUserIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    conversationIds.length
      ? admin.from("messages").select("*").eq("company_id", context.companyId).in("conversation_id", conversationIds).order("sent_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [] as MessageRow[], error: null }),
  ]);
  const profileRows = unwrap(profileResult) as ProfileRow[];
  const messageRows = unwrap(messageResult) as MessageRow[];

  const profilesByUserId = new Map(profileRows.map((profile) => [profile.id, profile]));
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const shiftsByDriver = new Map(shiftRows.map((shift) => [shift.driver_id, shift]));
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const driverNames = new Map(driverRows.map((driver) => [driver.id, profilesByUserId.get(driver.user_id)?.full_name || "Motorizado"]));
  const activeOrderStatuses = new Set<OperationalOrder["status"]>(["assigned", "to_merchant", "picking_up", "to_customer"]);
  const busyDriverIds = new Set(orderRows.filter((order) => order.driver_id && activeOrderStatuses.has(order.status)).map((order) => order.driver_id as string));
  const today = startOfTodayManagua();
  const deliveriesByDriver = new Map<string, number>();
  orderRows.filter((order) => order.driver_id && order.status === "delivered" && order.delivered_at && order.delivered_at >= today).forEach((order) => {
    const id = order.driver_id as string;
    deliveriesByDriver.set(id, (deliveriesByDriver.get(id) ?? 0) + 1);
  });
  const latestMessage = new Map<string, MessageRow>();
  messageRows.forEach((message) => {
    if (!latestMessage.has(message.conversation_id)) latestMessage.set(message.conversation_id, message);
  });
  const hasOrder = new Set(orderRows.filter((order) => order.conversation_id).map((order) => order.conversation_id as string));

  const operationalVehicles = vehicles.map((vehicle) => {
    const activeShift = shiftRows.find((shift) => shift.vehicle_id === vehicle.id);
    return mapVehicle(vehicle, activeShift ? driverNames.get(activeShift.driver_id) : undefined);
  });
  const operationalDrivers = driverRows.map((driver) => mapDriver(driver, profilesByUserId, shiftsByDriver, vehiclesById, busyDriverIds, deliveriesByDriver));
  const operationalOrders = orderRows.map((order) => mapOrder(order, customersById, driverNames));
  const operationalConversations: OperationalConversation[] = conversationRows.map((conversation) => {
    const customer = customersById.get(conversation.customer_id);
    const message = latestMessage.get(conversation.id);
    return {
      id: conversation.id,
      customerId: conversation.customer_id,
      customerName: customer?.full_name ?? "Cliente sin nombre",
      phone: customer?.phone ?? "",
      status: conversation.status as OperationalConversation["status"],
      lastMessage: message?.body ?? "Sin mensajes todavía",
      lastMessageAt: conversation.last_message_at,
      hasOrder: hasOrder.has(conversation.id),
    };
  });
  const ordersById = new Map(operationalOrders.map((order) => [order.id, order]));
  const operationalIncidents: OperationalIncident[] = incidentRows.map((incident) => ({
    id: incident.id,
    number: incident.incident_number,
    orderId: incident.order_id,
    orderNumber: incident.order_id ? ordersById.get(incident.order_id)?.number ?? null : null,
    driverId: incident.driver_id,
    driverName: incident.driver_id ? driverNames.get(incident.driver_id) ?? null : null,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    createdAt: incident.created_at,
    resolution: incident.resolution,
  }));
  const totalFuelAmount = fuelRows.reduce((sum, fuel) => sum + fuel.amount, 0);
  const totalFuelLiters = fuelRows.reduce((sum, fuel) => sum + fuel.liters, 0);
  const travelledKm = closedShiftRows.reduce((sum, shift) => sum + Math.max(0, (shift.end_odometer_km ?? shift.start_odometer_km) - shift.start_odometer_km), 0);

  return {
    company: {
      id: company.id,
      name: company.display_name,
      city: company.city,
      phone: company.phone,
      email: company.email,
      maintenanceIntervalKm: settings.maintenance_interval_km,
      baseManagementFee: settings.base_management_fee,
      routeDeviationThresholdM: settings.route_deviation_threshold_m,
    },
    settings: {
      businessHours: settings.business_hours as Record<string, { enabled: boolean; from: string; to: string }>,
      maintenanceIntervalKm: settings.maintenance_interval_km,
      baseManagementFee: settings.base_management_fee,
      routeDeviationThresholdM: settings.route_deviation_threshold_m,
      otpDeliveryRequired: settings.otp_delivery_required,
      gpsSharingMode: settings.gps_sharing_mode as "active_orders_only" | "active_shift",
      allowOperatorPriceOverride: settings.allow_operator_price_override,
      cancellationAfterPurchaseRule: settings.cancellation_after_purchase_rule as "none" | "product_only" | "product_management" | "product_management_delivery" | "manual",
    },
    whatsapp: whatsappResult.data ? {
      provider: whatsappResult.data.provider as "qr_gateway" | "meta_cloud" | "mock",
      connectionStatus: whatsappResult.data.connection_status as "disconnected" | "pending" | "connected" | "error",
      phoneNumber: whatsappResult.data.phone_number,
      welcomeMessage: whatsappResult.data.welcome_message,
    } : { provider: "mock", connectionStatus: "disconnected", phoneNumber: null, welcomeMessage: "¡Hola! ¿Qué deseas pedir hoy?" },
    zones: unwrap(zonesResult).map((zone) => ({ id: zone.id, name: zone.name, deliveryFee: zone.delivery_fee, minimumFee: zone.minimum_fee, isActive: zone.is_active })),
    vehicles: operationalVehicles,
    drivers: operationalDrivers,
    conversations: operationalConversations,
    orders: operationalOrders,
    incidents: operationalIncidents,
    locations: (unwrap(locationsResult) as Array<{
      id: number;
      order_id: string | null;
      driver_id: string;
      latitude: number;
      longitude: number;
      accuracy_m: number | null;
      speed_kmh: number | null;
      heading: number | null;
      captured_at: string;
    }>).map((location): OperationalLocation => ({
      id: location.id,
      orderId: location.order_id,
      driverId: location.driver_id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyM: location.accuracy_m,
      speedKmh: location.speed_kmh,
      heading: location.heading,
      capturedAt: location.captured_at,
    })),
    routes: (unwrap(routesResult) as Array<{
      order_id: string;
      driver_id: string | null;
      origin_latitude: number;
      origin_longitude: number;
      destination_latitude: number;
      destination_longitude: number;
      encoded_polyline: string;
      distance_m: number | null;
      duration_s: number | null;
    }>).map((route): OperationalRoute => ({
      orderId: route.order_id,
      driverId: route.driver_id,
      origin: { lat: route.origin_latitude, lng: route.origin_longitude },
      destination: { lat: route.destination_latitude, lng: route.destination_longitude },
      encodedPolyline: route.encoded_polyline,
      distanceM: route.distance_m,
      durationS: route.duration_s,
    })),
    routeAlerts: (unwrap(alertsResult) as Array<{
      id: string;
      order_id: string;
      driver_id: string;
      kind: string;
      threshold_m: number | null;
      distance_m: number | null;
      status: string;
      created_at: string;
    }>).map((alert): OperationalRouteAlert => ({
      id: alert.id,
      orderId: alert.order_id,
      driverId: alert.driver_id,
      kind: alert.kind,
      thresholdM: alert.threshold_m,
      distanceM: alert.distance_m,
      status: alert.status,
      createdAt: alert.created_at,
    })),
    fuelSummary: {
      totalAmount: totalFuelAmount,
      totalLiters: totalFuelLiters,
      travelledKm,
      costPerKm: travelledKm > 0 ? totalFuelAmount / travelledKm : null,
    },
    maintenanceRecords: maintenanceRows.map((record): OperationalMaintenance => ({
      id: record.id,
      vehicleId: record.vehicle_id,
      kind: record.kind,
      status: record.status as OperationalMaintenance["status"],
      dueAtKm: record.due_at_km,
      dueDate: record.due_date,
      completedAt: record.completed_at,
      odometer: record.odometer_km,
      cost: record.cost,
      supplier: record.supplier,
      notes: record.notes,
    })),
  };
}

export async function getDriverBootstrap(context: CompanyContext & { driver: DriverRow }): Promise<DriverBootstrap> {
  const admin = createSupabaseAdminClient();
  if (context.driver.invite_status === "pending") {
    await admin.from("driver_profiles").update({ invite_status: "activated" }).eq("id", context.driver.id);
    context.driver.invite_status = "activated";
  }

  const [companyResult, profileResult, shiftResult, vehiclesResult, orderResult, customerResult, fuelResult, assignmentResult] = await Promise.all([
    admin.from("companies").select("display_name").eq("id", context.companyId).single(),
    admin.from("profiles").select("*").eq("id", context.userId).single(),
    admin.from("driver_shifts").select("*").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("ended_at", null).maybeSingle(),
    admin.from("vehicles").select("*").eq("company_id", context.companyId).order("code"),
    admin.from("orders").select("*").eq("company_id", context.companyId).eq("driver_id", context.driver.id).order("created_at", { ascending: false }).limit(100),
    admin.from("customers").select("*").eq("company_id", context.companyId),
    admin.from("fuel_logs").select("id, liters, amount, odometer_km, recorded_at").eq("company_id", context.companyId).eq("driver_id", context.driver.id).order("recorded_at", { ascending: false }).limit(20),
    admin.from("order_assignments").select("order_id").eq("company_id", context.companyId).eq("driver_id", context.driver.id).is("unassigned_at", null).is("accepted_at", null).is("rejected_at", null),
  ]);
  const company = unwrap(companyResult);
  const profile = unwrap(profileResult) as ProfileRow;
  if (shiftResult.error) throw shiftResult.error;
  const shift = shiftResult.data as ShiftRow | null;
  const vehicles = unwrap(vehiclesResult) as VehicleRow[];
  const orderRows = unwrap(orderResult) as OrderRow[];
  const customers = new Map((unwrap(customerResult) as CustomerRow[]).map((customer) => [customer.id, customer]));
  const pendingAssignments = unwrap(assignmentResult) as { order_id: string }[];
  const pendingIds = new Set(pendingAssignments.map((assignment) => assignment.order_id));
  const activeOrderStatuses = new Set<OperationalOrder["status"]>(["to_merchant", "picking_up", "to_customer"]);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const activeOrderRow = orderRows.find((order) => activeOrderStatuses.has(order.status)) ?? null;
  const pendingOrderRows = orderRows.filter((order) => pendingIds.has(order.id) && order.status === "assigned");
  const recentOrderRows = orderRows.filter((order) => order.status === "delivered").slice(0, 10);
  const busy = Boolean(activeOrderRow);
  const driver = mapDriver(
    context.driver,
    new Map([[profile.id, profile]]),
    new Map(shift ? [[context.driver.id, shift]] : []),
    vehicleById,
    busy ? new Set([context.driver.id]) : new Set(),
    new Map(),
  );
  const noDrivers = new Map<string, string>([[context.driver.id, profile.full_name]]);
  const mapSingleOrder = (order: OrderRow) => mapOrder(order, customers, noDrivers);
  const occupiedVehicleIds = new Set<string>();
  const { data: openShiftRows, error: openShiftError } = await admin.from("driver_shifts").select("vehicle_id").eq("company_id", context.companyId).is("ended_at", null);
  if (openShiftError) throw openShiftError;
  (openShiftRows ?? []).forEach((item) => occupiedVehicleIds.add(item.vehicle_id));

  return {
    companyName: company.display_name,
    driver,
    openShift: shift ? mapShift(shift) : null,
    activeOrder: activeOrderRow ? mapSingleOrder(activeOrderRow) : null,
    pendingOrders: pendingOrderRows.map(mapSingleOrder),
    recentOrders: recentOrderRows.map(mapSingleOrder),
    recentFuel: unwrap(fuelResult).map((fuel) => ({ id: fuel.id, liters: fuel.liters, amount: fuel.amount, odometer: fuel.odometer_km, recordedAt: fuel.recorded_at })),
    availableVehicles: vehicles
      .filter((vehicle) => vehicle.status === "active" && !occupiedVehicleIds.has(vehicle.id))
      .filter((vehicle) => vehicle.next_maintenance_km === null || vehicle.current_odometer_km < vehicle.next_maintenance_km)
      .map((vehicle) => mapVehicle(vehicle)),
  };
}
