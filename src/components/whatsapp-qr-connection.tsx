"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, LinkBreak, LockKey, QrCode, SpinnerGap, WarningCircle, WhatsappLogo } from "@phosphor-icons/react";
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

  return <Card className="overflow-hidden border-slate-200 py-0 shadow-[0_14px_40px_rgba(15,23,42,.06)]">
    <CardContent className="p-0">
      <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${connected ? "bg-emerald-100 text-emerald-700" : error ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {connected ? <CheckCircle size={24} weight="fill" /> : error ? <WarningCircle size={24} weight="fill" /> : <WhatsappLogo size={25} weight="fill" />}
          </span>
          <div><h3 className="font-bold text-slate-950">{connected ? "WhatsApp conectado" : "Conecta el WhatsApp de esta empresa"}</h3><p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{connected ? `La bandeja recibe mensajes ${status?.phoneNumber ? `del +${status.phoneNumber}` : "del número vinculado"}.` : "Cada negocio escanea su propio QR una sola vez; la sesión queda aislada y sus chats llegan automáticamente a su bandeja."}</p></div>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-100 text-emerald-800" : waiting ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}><i className={`size-2 rounded-full ${connected ? "bg-emerald-500" : waiting ? "animate-pulse bg-blue-500" : "bg-slate-400"}`} />{connected ? "Activo" : waiting ? "Esperando escaneo" : "Sin vincular"}</span>
      </header>

      <div className={`grid ${waiting ? "lg:grid-cols-[300px_1fr]" : ""}`}>
        {waiting ? <div className="grid place-items-center border-b border-slate-100 bg-slate-50/70 p-6 lg:border-r lg:border-b-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {status?.qrDataUrl ? <Image src={status.qrDataUrl} alt="Código QR para vincular WhatsApp Business" width={232} height={232} className="size-[232px]" unoptimized priority /> : <span className="grid size-[232px] place-items-center text-emerald-700"><SpinnerGap size={44} className="animate-spin" /></span>}
          </div>
        </div> : null}

        <div className="p-5 sm:p-6">
          {waiting ? <div><p className="text-[11px] font-extrabold tracking-[.14em] text-emerald-700">EN EL TELÉFONO DEL NEGOCIO</p><ol className="mt-4 grid gap-3 sm:grid-cols-2"><Step number="1" text="Abre WhatsApp Business." /><Step number="2" text="Entra a Dispositivos vinculados." /><Step number="3" text="Toca Vincular un dispositivo." /><Step number="4" text="Escanea este código QR." /></ol><p className="mt-5 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"><QrCode size={17} /> El código se renueva automáticamente mientras esta pantalla permanece abierta.</p></div> : <div className="grid min-h-44 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><QrCode size={28} weight="duotone" /></span><h4 className="mt-4 font-bold text-slate-950">{connected ? "Canal listo para operar" : "Escanea y empieza a recibir chats"}</h4><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">{connected ? "Los mensajes entrantes se separan por empresa y aparecen en Conversaciones." : "No hace falta registrar cada tienda en Meta. El comercio vincula el WhatsApp Business que ya utiliza desde Dispositivos vinculados."}</p></div></div>}

          {error ? <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800" role="alert"><WarningCircle className="mt-0.5 shrink-0" size={18} weight="fill" />{error}</p> : null}
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-slate-500"><LockKey size={17} className="text-emerald-700" /> Sesión cifrada, aislada por empresa y revocable.</p>
            {connected ? <Button variant="outline" type="button" onClick={() => { void disconnect(); }} disabled={busy}><LinkBreak /> Desvincular número</Button> : <Button className="bg-emerald-700 hover:bg-emerald-800" type="button" onClick={() => { void connect(); }} disabled={busy || waiting}>{busy ? <><SpinnerGap className="animate-spin" /> Verificando…</> : waiting ? "Esperando escaneo…" : <><QrCode /> Generar código QR</>}</Button>}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>;
}

function Step({ number, text }: { number: string; text: string }) {
  return <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{number}</span>{text}</li>;
}
