"use client";

import { ArrowRight, CheckCircle, LockKey, Motorcycle, Phone, Storefront } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });
      if (signInError) throw signInError;
      const { data: membership, error: membershipError } = await supabase.from("company_members")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (membershipError) throw membershipError;
      const destination = !membership
        ? "/onboarding"
        : membership.role === "driver"
          ? "/driver"
          : "/admin";
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-marketing">
        <div className="auth-brand"><span><Motorcycle size={27} weight="fill" /></span><strong>Tudelivery</strong></div>
        <div className="auth-marketing-content">
          <span className="eyebrow-light">OPERACIÓN SIMPLE, CONTROL REAL</span>
          <h1>Tu delivery, siempre en movimiento.</h1>
          <p>Atiende WhatsApp, organiza pedidos, controla tu flota y acompaña cada entrega desde un solo lugar.</p>
          <ul>
            <li><CheckCircle size={20} weight="fill" /> Conversaciones convertidas en pedidos</li>
            <li><CheckCircle size={20} weight="fill" /> Ubicación de motorizados en tiempo real</li>
            <li><CheckCircle size={20} weight="fill" /> Control de combustible y mantenimiento</li>
          </ul>
        </div>
        <p className="auth-footer">© 2026 Tudelivery · Hecho para negocios en movimiento</p>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <span className="auth-icon"><LockKey size={25} weight="fill" /></span>
          <h2>Bienvenido de vuelta</h2>
          <p>Ingresa a tu panel de operaciones.</p>
          <form onSubmit={submit} className="auth-form">
            <label>Correo electrónico<input name="email" type="email" placeholder="tu@empresa.com" autoComplete="email" required /></label>
            <label>Contraseña<input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required /></label>
            <div className="auth-form-row"><label className="check-label"><input type="checkbox" defaultChecked /> Recordarme</label><button className="text-button" type="button">¿Olvidaste tu contraseña?</button></div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-full" disabled={loading} type="submit">{loading ? "Ingresando…" : "Ingresar al panel"}<ArrowRight size={18} weight="bold" /></button>
          </form>
          <p className="auth-switch">¿Aún no tienes cuenta? <Link href="/registro">Crea tu empresa</Link></p>
        </div>
      </section>
    </main>
  );
}

export function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    const companyName = String(formData.get("companyName"));
    const fullName = String(formData.get("fullName"));
    const phone = String(formData.get("phone"));
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        options: { data: { full_name: fullName, phone } },
      });
      if (signUpError) throw signUpError;
      window.sessionStorage.setItem("delivery-onboarding", JSON.stringify({ displayName: companyName, phone }));
      if (!data.session) {
        setNotice("Revisa tu correo para confirmar tu cuenta y luego inicia sesión.");
        setLoading(false);
        return;
      }
      router.replace("/onboarding");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible crear la cuenta.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout auth-register-layout">
      <section className="auth-marketing">
        <div className="auth-brand"><span><Motorcycle size={27} weight="fill" /></span><strong>Tudelivery</strong></div>
        <div className="auth-marketing-content">
          <span className="eyebrow-light">CREA TU ESPACIO DE OPERACIÓN</span>
          <h1>Empieza a ordenar tus entregas.</h1>
          <p>Tu número registrado será la cuenta administradora de la empresa. Después conectarás tu WhatsApp Business oficial.</p>
          <div className="auth-info-card"><Storefront size={22} weight="fill" /><p>Una empresa, sus operadores, motorizados, vehículos y datos quedan completamente separados.</p></div>
        </div>
        <p className="auth-footer">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card auth-card-register">
          <span className="auth-icon"><Phone size={25} weight="fill" /></span>
          <h2>Crea tu empresa</h2>
          <p>Configura tu cuenta administradora.</p>
          <form onSubmit={submit} className="auth-form">
            <label>Nombre de la empresa<input name="companyName" placeholder="Ej. Delivery Granada" required /></label>
            <label>Tu nombre completo<input name="fullName" placeholder="Nombre del administrador" autoComplete="name" required /></label>
            <label>Teléfono administrador<input name="phone" type="tel" placeholder="+505 8888 0000" autoComplete="tel" required /></label>
            <label>Correo electrónico<input name="email" type="email" placeholder="tu@empresa.com" autoComplete="email" required /></label>
            <label>Contraseña<input name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {notice ? <p className="form-notice" role="status">{notice}</p> : null}
            <button className="button button-primary button-full" disabled={loading} type="submit">{loading ? "Creando…" : "Continuar"}<ArrowRight size={18} weight="bold" /></button>
          </form>
          <p className="auth-switch">Al continuar aceptas los términos y la política de privacidad.</p>
        </div>
      </section>
    </main>
  );
}
