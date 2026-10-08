import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireOperationsContext, AppError } from "@/lib/server/context";
import { z } from "zod";

const schema = z.object({
  conversationId: z.string().uuid().optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerPhone: z.string().trim().min(8).max(24).optional(),
  serviceType: z.enum(["delivery", "errand", "package"]),
  merchantName: z.string().trim().max(160).optional(),
  merchantAddress: z.string().trim().max(300).optional(),
  pickupNotes: z.string().trim().max(1000).optional(),
  deliveryAddress: z.string().trim().min(5).max(300),
  deliveryReference: z.string().trim().max(300).optional(),
  zoneId: z.string().uuid(),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  paymentMethod: z.enum(["cash", "bank_transfer"]),
  productAmount: z.coerce.number().min(0).max(100000),
  managementFee: z.coerce.number().min(0).max(100000),
  amountReceived: z.coerce.number().min(0).max(100000).nullable().optional(),
}).superRefine((input, refinement) => {
  if (!input.merchantName) {
    refinement.addIssue({ code: "custom", path: ["merchantName"], message: "Indica el comercio o lugar de recogida." });
  }
  if (input.serviceType === "errand" && !input.pickupNotes) {
    refinement.addIssue({ code: "custom", path: ["pickupNotes"], message: "Indica qué debe comprar el motorizado." });
  }
});

function nextOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  return `DEL-${date}-${randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const context = await requireOperationsContext();
    const admin = createSupabaseAdminClient();
    const { data: zone, error: zoneError } = await admin
      .from("service_zones")
      .select("id, delivery_fee")
      .eq("company_id", context.companyId)
      .eq("id", input.zoneId)
      .eq("is_active", true)
      .single();
    if (zoneError || !zone) throw new AppError("Selecciona una zona tarifaria activa.");

    let customerId: string;
    if (input.conversationId) {
      const { data: conversation, error } = await admin.from("conversations")
        .select("customer_id")
        .eq("id", input.conversationId)
        .eq("company_id", context.companyId)
        .single();
      if (error || !conversation) throw new AppError("La conversación seleccionada no pertenece a tu empresa.", 404);
      customerId = conversation.customer_id;

      const { data: activeOrder, error: activeOrderError } = await admin
        .from("orders")
        .select("id, order_number")
        .eq("company_id", context.companyId)
        .eq("conversation_id", input.conversationId)
        .not("status", "in", "(delivered,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeOrderError) throw activeOrderError;
      if (activeOrder) throw new AppError(`Esta conversación ya tiene el pedido activo ${activeOrder.order_number}.`, 409);
    } else {
      if (!input.customerName || !input.customerPhone) throw new AppError("Indica el nombre y teléfono del cliente.");
      const { data: customer, error } = await admin.from("customers")
        .upsert({ company_id: context.companyId, full_name: input.customerName, phone: input.customerPhone }, { onConflict: "company_id,phone" })
        .select("id")
        .single();
      if (error) throw error;
      customerId = customer.id;
    }

    const total = input.productAmount + input.managementFee + zone.delivery_fee;
    const amountReceived = input.paymentMethod === "cash" ? input.amountReceived ?? null : null;
    if (amountReceived !== null && amountReceived > 0 && amountReceived < total) {
      throw new AppError("El monto con el que paga el cliente no puede ser menor que el total.");
    }
    const { data: address, error: addressError } = await admin.from("customer_addresses").insert({
      company_id: context.companyId,
      customer_id: customerId,
      address_line: input.deliveryAddress,
      reference: input.deliveryReference || null,
      zone_id: zone.id,
    }).select("id").single();
    if (addressError) throw addressError;
    const { data: order, error: orderError } = await admin.from("orders").insert({
      company_id: context.companyId,
      order_number: nextOrderNumber(),
      conversation_id: input.conversationId ?? null,
      customer_id: customerId,
      address_id: address.id,
      service_type: input.serviceType,
      merchant_name: input.merchantName || null,
      merchant_address: input.merchantAddress || null,
      pickup_notes: input.pickupNotes || null,
      delivery_address: input.deliveryAddress,
      delivery_reference: input.deliveryReference || null,
      zone_id: zone.id,
      status: "awaiting_confirmation",
      priority: input.priority,
      payment_method: input.paymentMethod,
      transfer_status: input.paymentMethod === "bank_transfer" ? "pending_validation" : "not_required",
      product_amount: input.productAmount,
      management_fee: input.managementFee,
      delivery_fee: zone.delivery_fee,
      amount_received: amountReceived,
      change_due: amountReceived === null ? 0 : Math.max(0, amountReceived - total),
      created_by: context.userId,
    }).select("id, order_number, total_amount").single();
    if (orderError) throw orderError;
    const warnings: string[] = [];
    const { error: eventError } = await admin.from("order_status_events").insert({
      company_id: context.companyId,
      order_id: order.id,
      from_status: null,
      to_status: "awaiting_confirmation",
      actor_user_id: context.userId,
      actor_type: context.role,
      note: "Pedido creado desde operaciones; espera confirmación del cliente.",
    });
    if (eventError) warnings.push("No se pudo registrar el evento de auditoría.");
    if (input.conversationId) {
      const { error: conversationError } = await admin
        .from("conversations")
        .update({ status: "waiting", last_message_at: new Date().toISOString() })
        .eq("id", input.conversationId)
        .eq("company_id", context.companyId);
      if (conversationError) warnings.push("No se pudo actualizar el estado de la conversación.");
    }
    return Response.json({ id: order.id, number: order.order_number, total: order.total_amount, warnings }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
