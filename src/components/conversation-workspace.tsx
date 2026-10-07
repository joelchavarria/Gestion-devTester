"use client";

import { Avatar, Badge, EmptyState } from "@/components/ui";
import { NumericInput } from "@/components/numeric-input";
import { currency } from "@/lib/format";
import type { AdminBootstrap, OperationalOrder } from "@/lib/operations/types";
import { CheckCircle, Compass, GasPump, MagnifyingGlass, MapPin, Motorcycle, PaperPlaneTilt, Plus, Star, UserPlus, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const orderState: Record<OperationalOrder["status"], { label: string; tone: "green" | "blue" | "amber" | "red" | "neutral" }> = {
  new: { label: "Nuevo", tone: "neutral" },
  awaiting_confirmation: { label: "Esperando confirmación", tone: "amber" },
  confirmed: { label: "Confirmado", tone: "blue" },
  pending_assignment: { label: "Listo para asignar", tone: "blue" },
  assigned: { label: "Esperando aceptación", tone: "amber" },
  to_merchant: { label: "Rumbo al comercio", tone: "blue" },
  picking_up: { label: "En comercio", tone: "amber" },
  to_customer: { label: "Rumbo al cliente", tone: "green" },
  delivered: { label: "Entregado", tone: "green" },
  cancelled: { label: "Cancelado", tone: "red" },
};

export function ConversationWorkspace({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(data.conversations[0]?.id ?? "");
  const [orderOverrides, setOrderOverrides] = useState<Record<string, OperationalOrder>>({});
  const [selectedDriver, setSelectedDriver] = useState("");
  const [zoneId, setZoneId] = useState(data.zones.find((zone) => zone.isActive)?.id ?? "");
  const [serviceType, setServiceType] = useState<OperationalOrder["serviceType"]>("errand");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [merchantAddress, setMerchantAddress] = useState("");
  const [productAmount, setProductAmount] = useState(0);
  const [managementFee, setManagementFee] = useState(data.company.baseManagementFee);
  const [paymentMethod, setPaymentMethod] = useState<OperationalOrder["paymentMethod"]>("cash");
  const [amountReceived, setAmountReceived] = useState(0);
  const [transferValidated, setTransferValidated] = useState(false);
  const [otp, setOtp] = useState<{ code: string; expiresAt: string } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [dialog, setDialog] = useState<"conversation" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = data.conversations.find((conversation) => conversation.id === activeId);
  const savedOrder = active ? data.orders.find((order) => order.conversationId === active.id) : undefined;
  const currentOrder = active ? orderOverrides[active.id] ?? savedOrder : undefined;
  const selectedZone = data.zones.find((zone) => zone.id === zoneId);
  const total = productAmount + managementFee + (selectedZone?.deliveryFee ?? 0);
  const change = Math.max(0, amountReceived - total);
  const availableDrivers = data.drivers.filter((driver) => driver.status === "available");

  const initials = useMemo(() => active?.customerName.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "CL", [active]);

  function selectConversation(id: string) {
    setActiveId(id);
    setSelectedDriver("");
    setOtp(null);
    setError(null);
  }

  async function request(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as Record<string, unknown> & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No fue posible guardar el cambio.");
    return payload;
  }

  async function createOrder() {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const result = await request("/api/admin/orders", {
        conversationId: active.id,
        serviceType,
        merchantName,
        merchantAddress,
        deliveryAddress: address,
        deliveryReference: reference,
        zoneId,
        priority: 3,
        paymentMethod,
        productAmount,
        managementFee,
        amountReceived: paymentMethod === "cash" ? amountReceived : null,
      }) as { id: string; number: string; total: number };
      setOrderOverrides((current) => ({ ...current, [active.id]: {
        id: result.id,
        number: result.number,
        conversationId: active.id,
        customerId: active.customerId,
        customerName: active.customerName,
        customerPhone: active.phone,
        address,
        reference: reference || null,
        deliveryLatitude: null,
        deliveryLongitude: null,
        merchantName: merchantName || null,
        merchantAddress: merchantAddress || null,
        serviceType,
        status: "awaiting_confirmation",
        priority: 3,
        paymentMethod,
        transferStatus: paymentMethod === "bank_transfer" ? "pending_validation" : "not_required",
        productAmount,
        managementFee,
        deliveryFee: selectedZone?.deliveryFee ?? 0,
        total: result.total,
        amountReceived: paymentMethod === "cash" ? amountReceived : null,
        changeDue: paymentMethod === "cash" ? change : 0,
        driverId: null,
        driverName: null,
        createdAt: new Date().toISOString(),
        assignedAt: null,
        deliveredAt: null,
      } }));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear el pedido.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    if (!currentOrder || !active) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/api/admin/orders/${currentOrder.id}/confirm`, { transferValidated });
      setOrderOverrides((current) => ({ ...current, [active.id]: { ...currentOrder, status: "pending_assignment", transferStatus: currentOrder.paymentMethod === "bank_transfer" ? "validated" : currentOrder.transferStatus } }));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible confirmar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  async function assignOrder() {
    if (!currentOrder || !active || !selectedDriver) return;
    setBusy(true);
    setError(null);
    try {
      const result = await request(`/api/admin/orders/${currentOrder.id}/assign`, { driverId: selectedDriver }) as { otpCode: string; expiresAt: string };
      const driver = data.drivers.find((item) => item.id === selectedDriver);
      setOrderOverrides((current) => ({ ...current, [active.id]: { ...currentOrder, status: "assigned", driverId: selectedDriver, driverName: driver?.name ?? null, assignedAt: new Date().toISOString() } }));
      setOtp({ code: result.otpCode, expiresAt: result.expiresAt });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible asignar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  async function createManualConversation(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const result = await request("/api/admin/conversations", {
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        message: String(formData.get("message") ?? ""),
      }) as { id: string };
      setDialog(null);
      setActiveId(result.id);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible abrir la conversación.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!active || !messageDraft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await request("/api/whatsapp/send", { conversationId: active.id, body: messageDraft.trim() });
      setMessageDraft("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible enviar el mensaje.");
    } finally {
      setBusy(false);
    }
  }

  if (!active) {
    return <><div className="conversation-workspace"><section className="inbox-list-panel"><div className="inbox-list-heading"><div><h2>Conversaciones</h2><p>WhatsApp Business</p></div><button className="icon-button" type="button" onClick={() => setDialog("conversation")} aria-label="Nueva conversación"><Plus size={20} /></button></div><EmptyState title="Sin conversaciones" detail="Cuando llegue un mensaje de WhatsApp aparecerá aquí. También puedes abrir una conversación manual para probar el flujo." action={<button className="button button-primary" type="button" onClick={() => setDialog("conversation")}>Abrir conversación</button>} /></section><section className="chat-panel empty-chat"><EmptyState title="Tu bandeja está lista" detail="Conecta tu WhatsApp Business o registra una solicitud para crear el primer pedido." /></section></div>{dialog ? <ConversationDialog saving={busy} error={error} onClose={() => setDialog(null)} onSave={createManualConversation} /> : null}</>;
  }

  const state = currentOrder ? orderState[currentOrder.status] : { label: "Sin pedido", tone: "neutral" as const };
  return <div className="conversation-workspace">
    <section className="inbox-list-panel">
      <div className="inbox-list-heading"><div><h2>Conversaciones</h2><p>WhatsApp Business</p></div><button className="icon-button" type="button" onClick={() => setDialog("conversation")} aria-label="Nueva conversación"><Plus size={20} /></button></div>
      <label className="search-field"><MagnifyingGlass size={19} /><input placeholder="Buscar conversación" /></label>
      <div className="conversation-tabs"><button className="tab active" type="button">Todas <span>{data.conversations.length}</span></button><button className="tab" type="button">Sin atender <span>{data.conversations.filter((conversation) => !conversation.hasOrder).length}</span></button></div>
      <div className="conversation-list">{data.conversations.map((conversation) => <button type="button" onClick={() => selectConversation(conversation.id)} className={clsx("conversation-item", activeId === conversation.id && "selected")} key={conversation.id}><Avatar initials={conversation.customerName.split(" ").map((part) => part[0]).join("").slice(0, 2)} tone={conversation.hasOrder ? "mint" : "purple"} /><span className="conversation-copy"><span><strong>{conversation.customerName}</strong><time>{conversation.lastMessageAt ? new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(conversation.lastMessageAt)) : ""}</time></span><small>{conversation.lastMessage}</small></span>{!conversation.hasOrder ? <b className="unread-count">!</b> : null}</button>)}</div>
    </section>
    <section className="chat-panel">
      <header className="chat-header"><Avatar initials={initials} tone="mint" /><div><h2>{active.customerName}</h2><p>{active.phone} · <span className="online-dot" /> Conversación activa</p></div><button className="button button-secondary button-small" type="button"><MapPin size={17} /> Ver ubicación</button></header>
      <div className="chat-thread"><p className="chat-date">CONVERSACIÓN</p><div className="message-bubble incoming">{active.lastMessage}</div><span className="message-time incoming-time">{active.lastMessageAt ? new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(active.lastMessageAt)) : ""}</span>{currentOrder ? <div className="chat-order-note"><CheckCircle size={18} weight="fill" /><span><strong>Pedido {currentOrder.number}</strong><small>{state.label}</small></span></div> : null}</div>
      <div className="chat-composer"><input aria-label="Escribe un mensaje" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Escribe una respuesta para WhatsApp" disabled={busy} /><button className="icon-button primary-icon" type="button" onClick={() => { void sendMessage(); }} disabled={busy || !messageDraft.trim()} aria-label="Enviar mensaje"><PaperPlaneTilt size={20} weight="fill" /></button></div>
    </section>
    <aside className="order-draft-panel">
      <div className="order-draft-heading"><div><p>CONVERSACIÓN A PEDIDO</p><h2>{currentOrder ? currentOrder.number : "Nuevo pedido"}</h2></div><Badge tone={state.tone}>{state.label}</Badge></div>
      {!currentOrder ? <>
        <div className="draft-section"><h3>Servicio y destino</h3><label>Tipo de servicio<select value={serviceType} onChange={(event) => setServiceType(event.target.value as OperationalOrder["serviceType"])}><option value="delivery">Delivery</option><option value="errand">Mandado / compra</option><option value="package">Paquete</option></select></label><label>Comercio / lugar de recogida<input value={merchantName} onChange={(event) => setMerchantName(event.target.value)} placeholder="Ej. Pollos Asados El Masayita" /></label><label>Dirección del comercio<input value={merchantAddress} onChange={(event) => setMerchantAddress(event.target.value)} placeholder="Barrio, calle o referencia" /></label><label>Dirección de entrega<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección completa" required /></label><label>Referencia<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Casa, portón, punto cercano" /></label><label>Zona tarifaria<select value={zoneId} onChange={(event) => setZoneId(event.target.value)}>{data.zones.filter((zone) => zone.isActive).map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {currency(zone.deliveryFee)}</option>)}</select></label></div>
        <div className="draft-section"><h3>Desglose de cobro</h3><div className="price-field"><span>Compra / producto</span><label><b>C$</b><NumericInput aria-label="Compra o producto" min={0} value={productAmount} onValueChange={setProductAmount} /></label></div><div className="price-field"><span>Gestión</span><label><b>C$</b><NumericInput aria-label="Tarifa de gestión" min={0} value={managementFee} onValueChange={setManagementFee} /></label></div><div className="price-line"><span>Delivery</span><strong>{currency(selectedZone?.deliveryFee ?? 0)}</strong></div><div className="price-total"><span>Total cliente</span><strong>{currency(total)}</strong></div></div>
        <div className="draft-section"><h3>Pago</h3><div className="payment-toggle"><button className={clsx(paymentMethod === "bank_transfer" && "selected")} type="button" onClick={() => setPaymentMethod("bank_transfer")}>Transferencia</button><button className={clsx(paymentMethod === "cash" && "selected")} type="button" onClick={() => setPaymentMethod("cash")}>Efectivo</button></div>{paymentMethod === "bank_transfer" ? <p className="transfer-note">La transferencia deberá ser validada manualmente antes de despachar.</p> : <div className="price-field"><span>Recibe con</span><label><b>C$</b><NumericInput aria-label="Monto recibido" min={0} value={amountReceived} onValueChange={setAmountReceived} placeholder="0" /></label><small>Vuelto: {currency(change)}</small></div>}</div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="button" onClick={createOrder} disabled={busy || !address || !zoneId}><Plus size={18} weight="bold" /> {busy ? "Creando pedido…" : "Crear pedido"}</button>
      </> : currentOrder.status === "awaiting_confirmation" ? <section className="dispatch-card"><div className="dispatch-heading"><div><span><CheckCircle size={15} weight="fill" /> CONFIRMACIÓN</span><h3>Confirma con el cliente</h3><p>{currentOrder.paymentMethod === "bank_transfer" ? "Valida el comprobante de transferencia antes de enviar al motorizado." : "Verifica dirección, precio y forma de pago antes del despacho."}</p></div></div>{currentOrder.paymentMethod === "bank_transfer" ? <label className="check-label"><input type="checkbox" checked={transferValidated} onChange={(event) => setTransferValidated(event.target.checked)} /> Transferencia validada manualmente</label> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="button" onClick={confirmOrder} disabled={busy || (currentOrder.paymentMethod === "bank_transfer" && !transferValidated)}><CheckCircle size={18} weight="fill" /> {busy ? "Confirmando…" : "Cliente confirmó"}</button></section> : currentOrder.status === "pending_assignment" ? <section className="dispatch-card"><div className="dispatch-heading"><div><span><Motorcycle size={15} weight="fill" /> DESPACHO</span><h3>Elige el motorizado</h3><p>Solo aparecen quienes tienen turno, vehículo y combustible disponibles.</p></div><Badge tone="green">{availableDrivers.length} disponibles</Badge></div><div className="driver-choice-list">{availableDrivers.map((driver) => <button type="button" key={driver.id} onClick={() => setSelectedDriver(driver.id)} className={clsx("driver-choice", selectedDriver === driver.id && "selected")}><Avatar initials={driver.initials} tone="blue" /><span className="driver-choice-copy"><strong>{driver.name}</strong><small><Motorcycle size={13} /> {driver.vehicle?.label ?? "Sin vehículo"} · {driver.vehicle?.plate ?? ""}</small><span><GasPump size={13} /> {driver.vehicle?.fuelLevel ?? 0}% <i /> <Star size={12} weight="fill" /> {driver.rating} · {driver.deliveriesToday} hoy</span></span>{selectedDriver === driver.id ? <CheckCircle className="driver-choice-check" size={21} weight="fill" /> : <Compass className="driver-choice-route" size={20} />}</button>)}</div>{availableDrivers.length === 0 ? <p className="transfer-note">No hay motorizados disponibles: deben activar su cuenta, abrir jornada y tener un vehículo apto.</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="dispatch-footer"><span><Compass size={16} /> La PWA recibirá este pedido por prioridad.</span><button className="button button-primary" type="button" disabled={busy || !selectedDriver} onClick={assignOrder}><UserPlus size={18} weight="bold" /> {busy ? "Asignando…" : "Asignar pedido"}</button></div></section> : <section className="assignment-success"><CheckCircle size={24} weight="fill" /><div><strong>{currentOrder.driverName ? `Pedido enviado a ${currentOrder.driverName}` : "Pedido actualizado"}</strong><span>{currentOrder.status === "assigned" ? "Esperando que acepte desde su PWA." : state.label}</span>{otp ? <b className="otp-reveal">OTP de entrega: {otp.code} · vence {new Intl.DateTimeFormat("es-NI", { hour: "2-digit", minute: "2-digit" }).format(new Date(otp.expiresAt))}</b> : null}</div></section>}
    </aside>
    {dialog ? <ConversationDialog saving={busy} error={error} onClose={() => setDialog(null)} onSave={createManualConversation} /> : null}
  </div>;
}

function ConversationDialog({ onClose, onSave, saving, error }: { onClose: () => void; onSave: (data: FormData) => Promise<void>; saving: boolean; error: string | null }) {
  return <div className="modal-backdrop" role="presentation"><dialog className="modal-card" open aria-labelledby="conversation-modal-title"><div className="modal-heading"><div><p>CONVERSACIÓN MANUAL</p><h2 id="conversation-modal-title">Registrar solicitud</h2></div><button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={17} /></button></div><p className="modal-intro">Úsalo para registrar una solicitud recibida por llamada o para probar el flujo antes de conectar Meta WhatsApp.</p><form className="modal-form" action={onSave}><label>Nombre del cliente<input name="fullName" required placeholder="Nombre completo" /></label><label>Teléfono<input name="phone" type="tel" required placeholder="+505 8888 0000" /></label><label>Solicitud inicial<textarea name="message" required placeholder="Ej. Quiero un pollo asado de El Masayita" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear conversación"}</button></form></dialog></div>;
}
