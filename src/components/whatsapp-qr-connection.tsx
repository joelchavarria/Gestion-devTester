"use client";

import { CheckCircle, LinkBreak, QrCode, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionStatus = "disconnected" | "connecting" | "pending" | "connected" | "error";
type QrStatus = {
  enabled?: boolean;
  connectionStatus: ConnectionStatus;
  phoneNumber: string | null;
  qrDataUrl: string | null;
  updatedAt?: string;
  error?: string;
};

async function requestStatus(method: "GET" | "POST" | "DELETE" = "GET") {
  const response = await fetch("/api/whatsapp/qr", { method, cache: "no-store" });
  const payload = await response.json() as QrStatus;
  if (!response.ok) throw new Error(payload.error ?? "No fue posible consultar la conexión de WhatsApp.");
  return payload;
}

export function WhatsAppQrConnection() {
  const router = useRouter();
  const [status, setStatus] = useState<QrStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousStatus = useRef<ConnectionStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await requestStatus();
      setStatus(next);
      setError(null);
      if (next.connectionStatus === "connected" && previousStatus.current !== "connected") router.refresh();
      previousStatus.current = next.connectionStatus;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar la conexión.");
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (status?.connectionStatus !== "pending" && status?.connectionStatus !== "connecting") return;
    const timer = window.setInterval(() => { void refresh(); }, 2_500);
    return () => window.clearInterval(timer);
  }, [refresh, status?.connectionStatus]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await requestStatus("POST"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible generar el QR.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desvincular este número? La empresa dejará de recibir y responder mensajes hasta escanear un QR nuevamente.")) return;
    setBusy(true);
    setError(null);
    try {
      setStatus(await requestStatus("DELETE"));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible desvincular el número.");
    } finally {
      setBusy(false);
    }
  }

  const connectionStatus = status?.connectionStatus ?? "disconnected";
  const connected = connectionStatus === "connected";
  const waiting = connectionStatus === "pending" || connectionStatus === "connecting";

  return <section className="whatsapp-qr-card">
    <div className="whatsapp-qr-heading">
      <span className={connected ? "meta-connect-icon success" : error ? "meta-connect-icon warning" : "meta-connect-icon"}>
        {connected ? <CheckCircle size={22} weight="fill" /> : error ? <WarningCircle size={22} weight="fill" /> : <QrCode size={23} weight="bold" />}
      </span>
      <div>
        <strong>{connected ? "WhatsApp conectado" : "Vincula el WhatsApp de la empresa"}</strong>
        <p>{connected ? `La bandeja está recibiendo mensajes de ${status?.phoneNumber ? `+${status.phoneNumber}` : "este número"}.` : "Abre WhatsApp Business en el teléfono y escanea el código como dispositivo vinculado."}</p>
      </div>
      {connected ? <span className="meta-connect-state">Activo</span> : null}
    </div>

    {waiting ? <div className="whatsapp-qr-body">
      <div className="whatsapp-qr-image">
        {status?.qrDataUrl ? <Image src={status.qrDataUrl} alt="Código QR para vincular WhatsApp Business" width={232} height={232} unoptimized priority /> : <SpinnerGap size={42} className="spin" />}
      </div>
      <div className="whatsapp-qr-steps">
        <span>PASOS EN EL TELÉFONO</span>
        <ol><li>Abre WhatsApp Business.</li><li>Entra a Dispositivos vinculados.</li><li>Toca Vincular un dispositivo.</li><li>Escanea este código QR.</li></ol>
        <small>El código se renueva automáticamente mientras esta pantalla permanece abierta.</small>
      </div>
    </div> : null}

    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="whatsapp-qr-actions">
      <p>La sesión queda separada por empresa. Puede ser necesario volver a escanear si WhatsApp cierra el dispositivo vinculado.</p>
      {connected
        ? <button className="button button-secondary button-small" type="button" onClick={() => { void disconnect(); }} disabled={busy}><LinkBreak size={17} /> Desvincular</button>
        : <button className="button button-primary button-small" type="button" onClick={() => { void connect(); }} disabled={busy || waiting}>{busy ? "Verificando…" : waiting ? "Esperando escaneo…" : "Generar código QR"}</button>}
    </div>
  </section>;
}
