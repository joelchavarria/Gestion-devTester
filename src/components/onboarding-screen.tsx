"use client";

import { ArrowRight, CheckCircle, QrCode, Storefront, Tag, WhatsappLogo } from "@phosphor-icons/react";
import { NumericInput } from "@/components/numeric-input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const steps = ["Información", "Tarifas", "WhatsApp Business"];

type CompanyInfo = {
  displayName: string;
  city: string;
  phone: string;
  managementFee: number;
};

const initialInfo: CompanyInfo = { displayName: "", city: "Granada, Nicaragua", phone: "", managementFee: 35 };

export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState<CompanyInfo>(initialInfo);
  const [preparedForMeta, setPreparedForMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const last = step === steps.length - 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem("delivery-onboarding");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Partial<CompanyInfo>;
        setInfo((current) => ({ ...current, ...parsed }));
      } catch {
        window.sessionStorage.removeItem("delivery-onboarding");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function goForward() {
    if (step === 0 && info.displayName.trim().length < 2) {
      setError("Indica el nombre de tu empresa para continuar.");
      return;
    }
    setError(null);
    setStep((current) => current + 1);
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/company/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: info.displayName, phone: info.phone, city: info.city, currencyCode: "NIO", managementFee: info.managementFee }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible crear la empresa.");
      window.sessionStorage.removeItem("delivery-onboarding");
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear la empresa.");
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-layout">
      <header className="onboarding-header">
        <div className="auth-brand dark-brand"><span><Storefront size={22} weight="fill" /></span><strong>Tudelivery</strong></div>
        <span>Paso {step + 1} de {steps.length}</span>
      </header>
      <section className="onboarding-card">
        <div className="onboarding-steps">
          {steps.map((label, index) => <div className={index <= step ? "done" : ""} key={label}><span>{index < step ? <CheckCircle size={19} weight="fill" /> : index + 1}</span><p>{label}</p></div>)}
        </div>
        {step === 0 ? (
          <div className="onboarding-content">
            <span className="auth-icon"><Storefront size={26} weight="fill" /></span>
            <h1>Información de tu empresa</h1>
            <p>Estos datos quedan separados de las demás empresas y solo los verá tu equipo.</p>
            <div className="form-grid">
              <label>Nombre comercial<input value={info.displayName} onChange={(event) => setInfo({ ...info, displayName: event.target.value })} placeholder="Ej. Delivery Granada" /></label>
              <label>Ciudad<input value={info.city} onChange={(event) => setInfo({ ...info, city: event.target.value })} /></label>
              <label>Teléfono de la empresa<input value={info.phone} onChange={(event) => setInfo({ ...info, phone: event.target.value })} placeholder="+505 8888 0000" /></label>
              <label>Moneda<select defaultValue="NIO" disabled><option value="NIO">C$ · Córdoba nicaragüense</option></select></label>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="onboarding-content">
            <span className="auth-icon"><Tag size={26} weight="fill" /></span>
            <h1>Configura tus tarifas iniciales</h1>
            <p>Podrás crear, modificar o desactivar zonas después desde Configuración.</p>
            <div className="onboarding-tariffs"><span>Granada Centro <b>C$ 50</b></span><span>Granada Sur <b>C$ 70</b></span><span>Granada Norte <b>C$ 70</b></span><span>Zonas aledañas <b>C$ 90</b></span></div>
            <label className="settings-input">Gestión base para mandados<div><b>C$</b><NumericInput min={0} value={info.managementFee} onValueChange={(value) => setInfo({ ...info, managementFee: value })} /></div></label>
          </div>
        ) : (
          <div className="onboarding-content whatsapp-onboarding">
            <span className="auth-icon"><WhatsappLogo size={26} weight="fill" /></span>
            <h1>Prepara WhatsApp Business</h1>
            <p>Cuando finalices se creará tu canal. La vinculación real usa el flujo oficial de Meta; nunca almacenamos una sesión de WhatsApp Web.</p>
            <div className="qr-connect-card">
              <div className="qr-placeholder"><QrCode size={110} weight="regular" /></div>
              <div>
                <h3>{preparedForMeta ? "Canal listo para configurar" : "Conexión oficial por Meta"}</h3>
                <p>{preparedForMeta ? "Desde Configuración conectarás el número de WhatsApp Business con las credenciales de tu aplicación Meta." : "La cuenta se crea primero; después el administrador inicia la vinculación oficial con su número Business."}</p>
                {preparedForMeta ? <span className="connected-copy"><CheckCircle size={18} weight="fill" /> Configuración pendiente de Meta</span> : <button className="button button-secondary" onClick={() => setPreparedForMeta(true)} type="button">Preparar conexión</button>}
              </div>
            </div>
          </div>
        )}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="onboarding-actions">
          <button type="button" className="button button-secondary" disabled={step === 0 || saving} onClick={() => { setError(null); setStep((current) => current - 1); }}>Atrás</button>
          <button type="button" className="button button-primary" disabled={saving} onClick={() => last ? finish() : goForward()}>{saving ? "Creando empresa…" : last ? "Crear empresa e ir al panel" : "Continuar"}<ArrowRight size={18} weight="bold" /></button>
        </div>
      </section>
    </main>
  );
}
