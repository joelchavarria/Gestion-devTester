"use client";

import { CheckCircle, QrCode, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AccountStatus = "disconnected" | "pending" | "connected" | "error";
type MetaConfig = {
  enabled: boolean;
  appId?: string;
  configId?: string;
  graphVersion?: string;
  accountStatus?: AccountStatus;
  phoneNumber?: string | null;
  error?: string;
};
type EmbeddedData = { phone_number_id?: string; waba_id?: string; phone_number?: string };

declare global {
  interface Window {
    FB?: { init: (options: Record<string, unknown>) => void; login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void };
  }
}

async function fetchMetaConfig() {
  const response = await fetch("/api/whatsapp/embedded-signup/config", { cache: "no-store" });
  const data = await response.json() as MetaConfig;
  if (!response.ok) throw new Error(data.error ?? "No fue posible consultar la configuración de Meta.");
  return data;
}

export function WhatsAppEmbeddedSignup() {
  const router = useRouter();
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "opening" | "connected" | "error">("loading");
  const [message, setMessage] = useState("Verificando el canal de esta empresa…");
  const signupData = useRef<EmbeddedData>({});
  const authorizationCode = useRef<string | undefined>(undefined);
  const completionStarted = useRef(false);

  const applyConfig = useCallback((data: MetaConfig) => {
    setConfig(data);
    if (data.accountStatus === "connected") {
      setStatus("connected");
      setMessage(data.phoneNumber ? `Número conectado: ${data.phoneNumber}` : "WhatsApp Business está conectado y listo.");
    } else if (data.accountStatus === "pending" || data.accountStatus === "error") {
      setStatus("error");
      setMessage("Meta dejó una activación incompleta. La plataforma puede reintentarla automáticamente.");
    } else if (!data.enabled) {
      setStatus("error");
      setMessage(data.error ?? "La conexión oficial de Meta todavía no está habilitada.");
    } else {
      setStatus("idle");
      setMessage("La empresa autoriza su número dentro del flujo oficial de Meta; no debe copiar tokens ni identificadores.");
    }
  }, []);

  useEffect(() => {
    void fetchMetaConfig().then(applyConfig).catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "No fue posible consultar el canal de WhatsApp.");
      });
  }, [applyConfig]);

  const finishConnection = useCallback(async () => {
    const code = authorizationCode.current;
    const { phone_number_id: phoneNumberId, waba_id: businessAccountId, phone_number: phoneNumber } = signupData.current;
    if (!code || !phoneNumberId || !businessAccountId || completionStarted.current) return;
    completionStarted.current = true;
    setMessage("Registrando el número y activando el webhook automáticamente…");
    try {
      const completion = await fetch("/api/whatsapp/embedded-signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phoneNumberId, businessAccountId, phoneNumber }),
      });
      const result = await completion.json() as { error?: string };
      if (!completion.ok) throw new Error(result.error ?? "No fue posible guardar la conexión.");
      setConfig((current) => current ? { ...current, accountStatus: "connected", phoneNumber: phoneNumber ?? current.phoneNumber } : current);
      setStatus("connected");
      setMessage(phoneNumber ? `Número conectado: ${phoneNumber}` : "WhatsApp Business quedó conectado a esta empresa.");
      router.refresh();
    } catch (error) {
      setConfig((current) => current ? { ...current, accountStatus: "error" } : current);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No fue posible guardar la conexión.");
    }
  }, [router]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      let payload: { type?: string; event?: string; data?: EmbeddedData } | undefined;
      try { payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (payload.event === "FINISH") {
        signupData.current = payload.data ?? {};
        void finishConnection();
      } else if (payload.event === "CANCEL") {
        setStatus("idle");
        setMessage("Conexión cancelada. El número no fue modificado.");
      } else if (payload.event === "ERROR") {
        setStatus("error");
        setMessage("Meta no pudo finalizar el alta. Puedes volver a intentarlo.");
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [finishConnection]);

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
    setMessage("Abriendo el flujo seguro de Meta…");
    signupData.current = {};
    authorizationCode.current = undefined;
    completionStarted.current = false;
    try {
      const resolvedConfig = config ?? await fetchMetaConfig();
      if (!config) applyConfig(resolvedConfig);
      if (!resolvedConfig.enabled || !resolvedConfig.appId || !resolvedConfig.configId || !resolvedConfig.graphVersion) {
        throw new Error(resolvedConfig.error ?? "La configuración de Meta está incompleta.");
      }
      await loadSdk();
      window.FB?.init({ appId: resolvedConfig.appId, cookie: true, xfbml: true, version: resolvedConfig.graphVersion });
      if (!window.FB) throw new Error("No fue posible iniciar el SDK de Meta.");
      window.FB.login((response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setStatus("idle");
          setMessage("Conexión cancelada. El número no fue modificado.");
          return;
        }
        authorizationCode.current = code;
        void finishConnection();
      }, { config_id: resolvedConfig.configId, response_type: "code", override_default_response_type: true, extras: { setup: {}, feature: "whatsapp_embedded_signup" } });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No fue posible abrir la conexión con Meta.");
    }
  }

  async function retryProvisioning() {
    setStatus("opening");
    setMessage("Reintentando registro y webhook sin pedir datos manuales…");
    try {
      const response = await fetch("/api/whatsapp/embedded-signup/retry", { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible completar la activación.");
      setConfig((current) => current ? { ...current, accountStatus: "connected" } : current);
      setStatus("connected");
      setMessage("WhatsApp Business está conectado y listo.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No fue posible completar la activación.");
    }
  }

  const connected = status === "connected";
  const waiting = status === "loading" || status === "opening";
  const canRetry = config?.accountStatus === "pending" || config?.accountStatus === "error";
  const warning = status === "error" || config?.enabled === false;
  const icon = connected ? <CheckCircle size={21} weight="fill" /> : warning ? <WarningCircle size={21} weight="fill" /> : <QrCode size={23} weight="bold" />;

  return <section className="meta-connect-card">
    <span className={connected ? "meta-connect-icon success" : warning ? "meta-connect-icon warning" : "meta-connect-icon"}>{icon}</span>
    <div><strong>{connected ? "Canal conectado" : "Conecta tu WhatsApp Business"}</strong><p>{message}</p></div>
    {connected ? <span className="meta-connect-state">Activo</span> : <div className="meta-connect-actions">
      {canRetry ? <button className="button button-primary button-small" type="button" disabled={waiting} onClick={() => { void retryProvisioning(); }}>{waiting ? "Activando…" : "Completar automáticamente"}</button> : null}
      <button className={canRetry ? "button button-secondary button-small" : "button button-primary button-small"} type="button" disabled={waiting || config?.enabled === false} onClick={() => { void connect(); }}>{status === "loading" ? "Verificando…" : status === "opening" ? "Procesando…" : canRetry ? "Volver a Meta" : "Conectar con Meta"}</button>
    </div>}
  </section>;
}
