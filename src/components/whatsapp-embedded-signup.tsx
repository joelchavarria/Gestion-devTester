"use client";

import { CheckCircle, QrCode, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type MetaConfig = { enabled: boolean; appId?: string; configId?: string; graphVersion?: string; error?: string };
type EmbeddedData = { phone_number_id?: string; waba_id?: string; phone_number?: string };

declare global {
  interface Window {
    FB?: { init: (options: Record<string, unknown>) => void; login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void };
  }
}

export function WhatsAppEmbeddedSignup() {
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [status, setStatus] = useState<"idle" | "opening" | "connected" | "error">("idle");
  const [message, setMessage] = useState("El QR y la verificación aparecen dentro del flujo oficial de Meta.");
  const signupData = useRef<EmbeddedData>({});

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      let payload: { type?: string; event?: string; data?: EmbeddedData } | undefined;
      try { payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload.event === "FINISH") signupData.current = payload.data ?? {};
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  function loadSdk() {
    return new Promise<void>((resolve, reject) => {
      if (window.FB) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar el inicio de sesión de Meta."));
      document.body.appendChild(script);
    });
  }

  async function connect() {
    setStatus("opening");
    setMessage("Verificando la configuración de Meta…");
    let resolvedConfig = config;
    try {
      if (!resolvedConfig) {
        const response = await fetch("/api/whatsapp/embedded-signup/config", { cache: "no-store" });
        const data = await response.json() as MetaConfig;
        if (!response.ok || !data.enabled) throw new Error(data.error ?? "No fue posible consultar la configuración de Meta.");
        setConfig(data);
        resolvedConfig = data;
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No fue posible consultar la configuración de Meta.");
      return;
    }
    if (!resolvedConfig.enabled || !resolvedConfig.appId || !resolvedConfig.configId || !resolvedConfig.graphVersion) {
      setStatus("error");
      setMessage(resolvedConfig.error ?? "La configuración de Meta está incompleta.");
      return;
    }
    setMessage("Abriendo el flujo seguro de Meta…");
    try {
      await loadSdk();
      window.FB?.init({ appId: resolvedConfig.appId, cookie: true, xfbml: true, version: resolvedConfig.graphVersion });
      if (!window.FB) throw new Error("No fue posible iniciar el SDK de Meta.");
      window.FB.login(async (response) => {
        try {
          const code = response.authResponse?.code;
          const { phone_number_id: phoneNumberId, waba_id: businessAccountId, phone_number: phoneNumber } = signupData.current;
          if (!code || !phoneNumberId || !businessAccountId) throw new Error("Meta no finalizó la vinculación. Completa todos los pasos y vuelve a intentarlo.");
          const completion = await fetch("/api/whatsapp/embedded-signup/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, phoneNumberId, businessAccountId, phoneNumber }),
          });
          const result = await completion.json() as { error?: string };
          if (!completion.ok) throw new Error(result.error ?? "No fue posible guardar la conexión.");
          setStatus("connected");
          setMessage("WhatsApp Business quedó conectado a esta empresa.");
        } catch (caught) {
          setStatus("error");
          setMessage(caught instanceof Error ? caught.message : "No fue posible guardar la conexión.");
        }
      }, { config_id: resolvedConfig.configId, response_type: "code", override_default_response_type: true, extras: { setup: {}, feature: "whatsapp_embedded_signup" } });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No fue posible abrir la conexión con Meta.");
    }
  }

  const icon = status === "connected" ? <CheckCircle size={21} weight="fill" /> : status === "error" || config?.enabled === false ? <WarningCircle size={21} weight="fill" /> : <QrCode size={23} weight="bold" />;
  return <section className="meta-connect-card">
    <span className={status === "connected" ? "meta-connect-icon success" : status === "error" || config?.enabled === false ? "meta-connect-icon warning" : "meta-connect-icon"}>{icon}</span>
    <div><strong>{status === "connected" ? "Canal conectado" : "Conecta tu WhatsApp Business"}</strong><p>{config?.enabled === false ? config.error : message}</p></div>
    {status === "connected" ? <span className="meta-connect-state">Activo</span> : <button className="button button-primary button-small" type="button" disabled={status === "opening"} onClick={connect}>{status === "opening" ? "Abriendo Meta…" : "Abrir conexión Meta"}</button>}
  </section>;
}
